import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

import type {
  ResolvedEditorEnvConfigJSON,
  ResolvedEditorGroundConfigJSON
} from "../core/types";
import { isHighDynamicRangeEnvironmentAssetName } from "../constants/environment";
import {
  applyMeshPhysicalMaterialScalars,
  applyMeshPhysicalMaterial,
  disposeMeshPhysicalMaterialTextures
} from "../materials/meshMaterial";
import { applyTextureColorSpace } from "./colorManagement";
import {
  withEditorHelperVisibility,
  withEditorHelperVisibilityAsync,
  withPathTraceCompatibleEnvironmentAsync,
  withPathTraceCompatibleEnvironment
} from "./pathTraceSceneState";

const DEFAULT_SCENE_ROTATION = new THREE.Euler();
const GROUND_PLANE_SIZE = 80;
const GROUND_CHECKER_REPEAT = 40;
const GROUND_CHECKER_TEXTURE_SIZE = 128;

type EditorRuntimeEnvironmentOptions = {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  defaultBackground: THREE.Color;
  invalidateSceneMaterials: () => void;
  invalidatePathTraceMaterials: () => void;
};

type SceneMaterialInvalidationState = {
  environmentEnabled: boolean;
  shadowMapEnabled: boolean;
  toneMapping: THREE.ToneMapping;
};

type GroundApplyResult = {
  sceneChanged: boolean;
  shadowMapChanged: boolean;
  materialChanged: boolean;
};

type GroundApplyOptions = {
  syncShadowFromGroundMode?: boolean;
};

type EnvApplyResult = {
  environmentChanged: boolean;
  groundSceneChanged: boolean;
  materialsChanged: boolean;
};

type EnvApplyOptions = GroundApplyOptions;

export class EditorRuntimeEnvironment {
  readonly textureLoader = new THREE.TextureLoader();
  readonly hdrLoader = new HDRLoader();
  readonly exrLoader = new EXRLoader();

  private readonly scene: THREE.Scene;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly defaultBackground: THREE.Color;
  private readonly invalidateSceneMaterials: () => void;
  private readonly invalidatePathTraceMaterials: () => void;
  private readonly groundPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>;
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private groundVisible = true;
  private groundCheckerTexture: THREE.Texture | null = null;
  private lightHelpersVisible = true;
  private environmentTexture: THREE.Texture | null = null;
  private environmentMapTexture: THREE.Texture | null = null;
  private pathTraceEnvironmentTexture: THREE.Texture | null = null;
  private sceneMaterialInvalidationState: SceneMaterialInvalidationState | null = null;
  private lastGroundMaterial: ResolvedEditorGroundConfigJSON["material"] | null = null;

  constructor({
    scene,
    renderer,
    defaultBackground,
    invalidateSceneMaterials,
    invalidatePathTraceMaterials
  }: EditorRuntimeEnvironmentOptions) {
    this.scene = scene;
    this.renderer = renderer;
    this.defaultBackground = defaultBackground;
    this.invalidateSceneMaterials = invalidateSceneMaterials;
    this.invalidatePathTraceMaterials = invalidatePathTraceMaterials;

    this.groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_PLANE_SIZE, GROUND_PLANE_SIZE),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#ffffff"),
        roughness: 1,
        metalness: 0,
        map: this.createGroundCheckerTexture(),
        side: THREE.DoubleSide
      })
    );
    this.groundPlane.name = "ground-plane";
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -0.001;
    this.groundPlane.castShadow = false;
    this.groundPlane.receiveShadow = true;
    this.groundPlane.visible = true;
    this.scene.add(this.groundPlane);

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
  }

  getGridHelperVisible() {
    return this.groundVisible;
  }

  setGridHelperVisible(visible: boolean) {
    this.groundVisible = visible;
    this.syncGroundVisibility();
  }

  getLightHelpersVisible() {
    return this.lightHelpersVisible;
  }

  setLightHelpersVisible(visible: boolean) {
    this.lightHelpersVisible = visible;
    this.syncLightHelperVisibility();
  }

  withEditorHelpersHidden<T>(
    callback: () => T,
    options: { hideGroundPlane?: boolean } = {}
  ): T {
    return withEditorHelperVisibility(
      this.scene,
      {
        groundPlane: this.groundPlane,
        hideGroundPlane: options.hideGroundPlane ?? true
      },
      callback
    );
  }

  withPathTraceSceneState<T>(
    sourceEnvironmentTexture: THREE.Texture | null,
    callback: () => T
  ): T {
    return withPathTraceCompatibleEnvironment(
      this.scene,
      sourceEnvironmentTexture ?? this.pathTraceEnvironmentTexture,
      () => this.withEditorHelpersHidden(callback, { hideGroundPlane: false })
    );
  }

  async withPathTraceSceneStateAsync<T>(
    sourceEnvironmentTexture: THREE.Texture | null,
    callback: () => Promise<T>
  ): Promise<T> {
    return withPathTraceCompatibleEnvironmentAsync(
      this.scene,
      sourceEnvironmentTexture ?? this.pathTraceEnvironmentTexture,
      () =>
        withEditorHelperVisibilityAsync(
          this.scene,
          {
            groundPlane: this.groundPlane,
            hideGroundPlane: false
          },
          callback
        )
    );
  }

  getShadowEnabled() {
    return this.renderer.shadowMap.enabled;
  }

  setShadowEnabled(enabled: boolean) {
    const shadowMapChanged = this.renderer.shadowMap.enabled !== enabled;
    this.renderer.shadowMap.enabled = enabled;
    if (shadowMapChanged) {
      this.invalidateSceneMaterials();
      this.sceneMaterialInvalidationState = {
        ...this.createSceneMaterialInvalidationState(),
        shadowMapEnabled: enabled
      };
    }
  }

  applyGroundConfig(
    ground: ResolvedEditorGroundConfigJSON,
    options: GroundApplyOptions = {}
  ): GroundApplyResult {
    const nextShadowMapEnabled = options.syncShadowFromGroundMode
      ? ground.mode === "plane"
      : this.renderer.shadowMap.enabled;
    const shadowMapChanged = this.renderer.shadowMap.enabled !== nextShadowMapEnabled;
    const sceneChanged =
      this.groundVisible !== ground.visible ||
      this.groundPlane.scale.x !== ground.scale[0] ||
      this.groundPlane.scale.z !== ground.scale[2] ||
      shadowMapChanged;
    const materialChanged = this.lastGroundMaterial !== ground.material;

    this.groundVisible = ground.visible;
    this.renderer.shadowMap.enabled = nextShadowMapEnabled;
    this.groundPlane.scale.set(ground.scale[0], 1, ground.scale[2]);

    if (materialChanged) {
      disposeMeshPhysicalMaterialTextures(this.groundPlane.material);
      this.groundCheckerTexture = null;
      this.groundPlane.material.map = null;
      applyMeshPhysicalMaterial(
        this.groundPlane.material,
        ground.material,
        this.textureLoader,
        this.invalidateGroundMaterial
      );
      this.applyDefaultGroundCheckerMap(ground.material);
      this.invalidateGroundMaterial();
      this.lastGroundMaterial = ground.material;
    }

    this.syncGroundVisibility();

    return {
      sceneChanged,
      shadowMapChanged,
      materialChanged
    };
  }

  updateGroundMaterial(material: ResolvedEditorGroundConfigJSON["material"]) {
    applyMeshPhysicalMaterialScalars(this.groundPlane.material, material);
    this.applyDefaultGroundCheckerMap(material);
    this.invalidateGroundMaterial();
    this.lastGroundMaterial = material;
  }

  syncLightHelperVisibility() {
    this.scene.traverse((object) => {
      if (object.userData?.editorLightHelper !== true) return;
      const owner = object.userData.editorLightHelperOwner;
      const ownerVisible =
        owner instanceof THREE.Object3D
          ? owner.visible
          : object.userData.editorLightHelperOwnerVisible !== false;
      object.userData.editorLightHelperEnabled = this.lightHelpersVisible;
      object.visible = this.lightHelpersVisible && ownerVisible;
    });
  }

  hasEnvironmentTexture() {
    return Boolean(this.environmentTexture);
  }

  hasImageBasedLighting() {
    return Boolean(this.scene.environment);
  }

  async loadEnvironmentTexture(url: string, assetName = url) {
    const isHdrEnvironment =
      isHighDynamicRangeEnvironmentAssetName(assetName) ||
      isHighDynamicRangeEnvironmentAssetName(url);

    if (isHdrEnvironment) {
      const isExrEnvironment =
        assetName.toLowerCase().split(/[?#]/, 1)[0]?.endsWith(".exr") ||
        url.toLowerCase().split(/[?#]/, 1)[0]?.endsWith(".exr");
      if (isExrEnvironment) {
        const texture = await this.exrLoader.loadAsync(url);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        applyTextureColorSpace(texture, "environmentHdr");
        return texture;
      }

      const texture = await this.hdrLoader.loadAsync(url);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      applyTextureColorSpace(texture, "environmentHdr");
      return texture;
    }

    const texture = await this.textureLoader.loadAsync(url);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    applyTextureColorSpace(texture, "environmentLdr");
    return texture;
  }

  async setEnvironmentFromUrl(url: string, assetName = url) {
    const texture = await this.loadEnvironmentTexture(url, assetName);
    const environmentMapTexture = this.pmremGenerator.fromEquirectangular(texture).texture;
    const pathTraceEnvironmentTexture = this.createPathTraceEnvironmentTexture(texture);

    const previousTexture = this.environmentTexture;
    const previousEnvironmentMapTexture = this.environmentMapTexture;
    const previousPathTraceEnvironmentTexture = this.pathTraceEnvironmentTexture;
    this.environmentTexture = texture;
    this.environmentMapTexture = environmentMapTexture;
    this.pathTraceEnvironmentTexture = pathTraceEnvironmentTexture;
    previousTexture?.dispose();
    previousEnvironmentMapTexture?.dispose();
    if (previousPathTraceEnvironmentTexture && previousPathTraceEnvironmentTexture !== previousTexture) {
      previousPathTraceEnvironmentTexture.dispose();
    }
  }

  clearEnvironment() {
    this.scene.environment = null;
    this.scene.background = this.defaultBackground;
    this.scene.environmentIntensity = 1;
    this.scene.backgroundIntensity = 1;
    this.scene.backgroundBlurriness = 0;
    this.scene.environmentRotation.copy(DEFAULT_SCENE_ROTATION);
    this.scene.backgroundRotation.copy(DEFAULT_SCENE_ROTATION);
    this.environmentTexture?.dispose();
    this.environmentMapTexture?.dispose();
    if (this.pathTraceEnvironmentTexture && this.pathTraceEnvironmentTexture !== this.environmentTexture) {
      this.pathTraceEnvironmentTexture.dispose();
    }
    this.environmentTexture = null;
    this.environmentMapTexture = null;
    this.pathTraceEnvironmentTexture = null;
    this.sceneMaterialInvalidationState = null;
    this.invalidateSceneMaterials();
  }

  applyEnvConfig(
    envConfig: ResolvedEditorEnvConfigJSON,
    options: EnvApplyOptions = {}
  ): EnvApplyResult {
    const previousEnvironment = this.scene.environment;
    const previousBackground = this.scene.background;
    const previousBackgroundIntensity = this.scene.backgroundIntensity;
    const previousBackgroundBlurriness = this.scene.backgroundBlurriness;
    const previousEnvironmentIntensity = this.scene.environmentIntensity;
    const previousEnvironmentRotationY = this.scene.environmentRotation.y;
    const previousBackgroundRotationY = this.scene.backgroundRotation.y;
    const previousToneMappingExposure = this.renderer.toneMappingExposure;
    const previousMaterialInvalidationState = this.sceneMaterialInvalidationState;
    const rotationY = envConfig.environmentRotationY;
    this.scene.environment = this.resolveEnvironmentMap(envConfig);
    this.scene.environmentIntensity = envConfig.environmentIntensity;
    this.scene.background =
      envConfig.backgroundShow === 1 && this.environmentTexture
        ? this.environmentTexture
        : this.defaultBackground;
    this.scene.backgroundIntensity = envConfig.backgroundIntensity;
    this.scene.backgroundBlurriness =
      envConfig.backgroundShow === 1 && this.environmentTexture ? envConfig.backgroundBlurriness : 0;
    this.scene.environmentRotation.set(0, rotationY, 0);
    this.scene.backgroundRotation.set(0, rotationY, 0);
    this.renderer.toneMapping = envConfig.toneMapping as THREE.ToneMapping;
    this.renderer.toneMappingExposure = envConfig.toneMappingExposure;
    const groundResult = this.applyGroundConfig(envConfig.ground, options);
    const nextMaterialInvalidationState = this.createSceneMaterialInvalidationState();
    const materialsChanged =
      previousMaterialInvalidationState === null ||
      previousMaterialInvalidationState.environmentEnabled !== nextMaterialInvalidationState.environmentEnabled ||
      previousMaterialInvalidationState.shadowMapEnabled !== nextMaterialInvalidationState.shadowMapEnabled ||
      previousMaterialInvalidationState.toneMapping !== nextMaterialInvalidationState.toneMapping;

    this.sceneMaterialInvalidationState = nextMaterialInvalidationState;

    if (materialsChanged) {
      this.invalidateSceneMaterials();
    }

    return {
      environmentChanged:
        previousEnvironment !== this.scene.environment ||
        previousBackground !== this.scene.background ||
        previousBackgroundIntensity !== this.scene.backgroundIntensity ||
        previousBackgroundBlurriness !== this.scene.backgroundBlurriness ||
        previousEnvironmentIntensity !== this.scene.environmentIntensity ||
        previousEnvironmentRotationY !== this.scene.environmentRotation.y ||
        previousBackgroundRotationY !== this.scene.backgroundRotation.y ||
        previousToneMappingExposure !== this.renderer.toneMappingExposure,
      groundSceneChanged: groundResult.sceneChanged,
      materialsChanged: materialsChanged || groundResult.materialChanged
    };
  }

  dispose() {
    this.clearEnvironment();
    this.scene.remove(this.groundPlane);
    this.groundPlane.geometry.dispose();
    disposeMeshPhysicalMaterialTextures(this.groundPlane.material);
    this.groundPlane.material.dispose();
    this.pmremGenerator.dispose();
  }

  private syncGroundVisibility() {
    this.groundPlane.visible = this.groundVisible;
  }

  private createGroundCheckerTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = GROUND_CHECKER_TEXTURE_SIZE;
    canvas.height = GROUND_CHECKER_TEXTURE_SIZE;
    const context = canvas.getContext("2d");
    if (context) {
      const halfSize = GROUND_CHECKER_TEXTURE_SIZE / 2;
      context.fillStyle = "#d8e0ec";
      context.fillRect(0, 0, GROUND_CHECKER_TEXTURE_SIZE, GROUND_CHECKER_TEXTURE_SIZE);
      context.fillStyle = "#b6c3d4";
      context.fillRect(0, 0, halfSize, halfSize);
      context.fillRect(halfSize, halfSize, halfSize, halfSize);
      context.strokeStyle = "rgba(70, 92, 124, 0.34)";
      context.lineWidth = 2;
      context.strokeRect(0, 0, GROUND_CHECKER_TEXTURE_SIZE, GROUND_CHECKER_TEXTURE_SIZE);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(GROUND_CHECKER_REPEAT, GROUND_CHECKER_REPEAT);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapNearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this.groundCheckerTexture = texture;
    return texture;
  }

  private applyDefaultGroundCheckerMap(material: ResolvedEditorGroundConfigJSON["material"]) {
    if (material.diffuseMap.url) return;

    if (!this.groundCheckerTexture) {
      this.createGroundCheckerTexture();
    }

    this.groundPlane.material.map = this.groundCheckerTexture;
    this.groundPlane.material.needsUpdate = true;
  }

  private createSceneMaterialInvalidationState(): SceneMaterialInvalidationState {
    return {
      environmentEnabled: Boolean(this.scene.environment),
      shadowMapEnabled: this.renderer.shadowMap.enabled,
      toneMapping: this.renderer.toneMapping
    };
  }

  private invalidateGroundMaterial = () => {
    this.groundPlane.material.needsUpdate = true;
    this.invalidatePathTraceMaterials();
  };

  private resolveEnvironmentMap(envConfig: ResolvedEditorEnvConfigJSON) {
    if (envConfig.environment !== 1) {
      return null;
    }

    return this.environmentMapTexture;
  }

  private createPathTraceEnvironmentTexture(texture: THREE.Texture) {
    if (this.hasReadableTextureData(texture)) {
      return texture;
    }

    const image = texture.image as CanvasImageSource | undefined;
    const width = this.getImageWidth(image);
    const height = this.getImageHeight(image);
    if (!image || !width || !height) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;

    try {
      context.drawImage(image, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);
      const data = new Uint8Array(imageData.data);
      const dataTexture = new THREE.DataTexture(
        data,
        width,
        height,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
      );
      dataTexture.mapping = THREE.EquirectangularReflectionMapping;
      dataTexture.wrapS = THREE.RepeatWrapping;
      dataTexture.wrapT = THREE.ClampToEdgeWrapping;
      dataTexture.minFilter = THREE.LinearFilter;
      dataTexture.magFilter = THREE.LinearFilter;
      dataTexture.generateMipmaps = false;
      applyTextureColorSpace(dataTexture, "environmentLdr");
      dataTexture.needsUpdate = true;
      return dataTexture;
    } catch {
      return null;
    }
  }

  private hasReadableTextureData(texture: THREE.Texture) {
    const image = texture.image as { data?: ArrayLike<number> } | undefined;
    return Boolean(image?.data?.length);
  }

  private getImageWidth(image: CanvasImageSource | undefined) {
    if (!image) return 0;
    if ("naturalWidth" in image && typeof image.naturalWidth === "number") {
      return image.naturalWidth;
    }
    if ("videoWidth" in image && typeof image.videoWidth === "number") {
      return image.videoWidth;
    }
    return "width" in image && typeof image.width === "number" ? image.width : 0;
  }

  private getImageHeight(image: CanvasImageSource | undefined) {
    if (!image) return 0;
    if ("naturalHeight" in image && typeof image.naturalHeight === "number") {
      return image.naturalHeight;
    }
    if ("videoHeight" in image && typeof image.videoHeight === "number") {
      return image.videoHeight;
    }
    return "height" in image && typeof image.height === "number" ? image.height : 0;
  }
}
