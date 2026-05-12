import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

import type {
  EditorGroundMode,
  ResolvedEditorEnvConfigJSON,
  ResolvedEditorGroundConfigJSON
} from "../core/types";
import { isHighDynamicRangeEnvironmentAssetName } from "../constants/environment";
import {
  applyMeshStandardMaterialScalars,
  applyMeshStandardMaterial,
  disposeMeshStandardMaterialTextures
} from "../materials/meshMaterial";
import { applyTextureColorSpace } from "./colorManagement";

const DEFAULT_SCENE_ROTATION = new THREE.Euler();

type EditorRuntimeEnvironmentOptions = {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  defaultBackground: THREE.Color;
  invalidateSceneMaterials: () => void;
};

export class EditorRuntimeEnvironment {
  readonly textureLoader = new THREE.TextureLoader();
  readonly hdrLoader = new HDRLoader();
  readonly exrLoader = new EXRLoader();

  private readonly scene: THREE.Scene;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly defaultBackground: THREE.Color;
  private readonly invalidateSceneMaterials: () => void;
  private readonly gridHelper: THREE.GridHelper;
  private readonly groundPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private groundVisible = true;
  private groundMode: EditorGroundMode = "grid";
  private lightHelpersVisible = true;
  private environmentTexture: THREE.Texture | null = null;
  private environmentMapTexture: THREE.Texture | null = null;

  constructor({
    scene,
    renderer,
    defaultBackground,
    invalidateSceneMaterials
  }: EditorRuntimeEnvironmentOptions) {
    this.scene = scene;
    this.renderer = renderer;
    this.defaultBackground = defaultBackground;
    this.invalidateSceneMaterials = invalidateSceneMaterials;

    this.gridHelper = new THREE.GridHelper(80, 80, 0x5f8fc7, 0x39567f);
    this.gridHelper.position.y = -0.0001;
    this.scene.add(this.gridHelper);

    this.groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#ffffff"),
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide
      })
    );
    this.groundPlane.name = "ground-plane";
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -0.001;
    this.groundPlane.castShadow = false;
    this.groundPlane.receiveShadow = true;
    this.groundPlane.visible = false;
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

  withEditorHelpersHidden<T>(callback: () => T): T {
    const previousGridVisible = this.gridHelper.visible;
    const lightHelperSnapshots: Array<{ object: THREE.Object3D; visible: boolean }> = [];

    this.scene.traverse((object) => {
      if (object.userData?.editorLightHelper !== true) return;
      lightHelperSnapshots.push({ object, visible: object.visible });
      object.visible = false;
    });

    this.gridHelper.visible = false;

    try {
      return callback();
    } finally {
      this.gridHelper.visible = previousGridVisible;
      lightHelperSnapshots.forEach(({ object, visible }) => {
        object.visible = visible;
      });
    }
  }

  getShadowEnabled() {
    return this.groundMode === "plane";
  }

  setShadowEnabled(enabled: boolean) {
    this.groundMode = enabled ? "plane" : "grid";
    this.renderer.shadowMap.enabled = enabled;
    this.invalidateSceneMaterials();
    this.syncGroundVisibility();
  }

  applyGroundConfig(ground: ResolvedEditorGroundConfigJSON) {
    this.groundMode = ground.mode;
    this.groundVisible = ground.visible;
    this.renderer.shadowMap.enabled = ground.mode === "plane";
    this.gridHelper.scale.set(ground.scale[0], 1, ground.scale[2]);
    this.groundPlane.scale.set(ground.scale[0], 1, ground.scale[2]);
    disposeMeshStandardMaterialTextures(this.groundPlane.material);
    applyMeshStandardMaterial(
      this.groundPlane.material,
      ground.material,
      this.textureLoader,
      this.invalidateSceneMaterials
    );
    this.groundPlane.material.needsUpdate = true;
    this.invalidateSceneMaterials();
    this.syncGroundVisibility();
  }

  updateGroundMaterial(material: ResolvedEditorGroundConfigJSON["material"]) {
    applyMeshStandardMaterialScalars(this.groundPlane.material, material);
  }

  syncLightHelperVisibility() {
    this.scene.traverse((object) => {
      if (object.userData?.editorLightHelper !== true) return;
      object.visible = this.lightHelpersVisible;
    });
  }

  hasEnvironmentTexture() {
    return Boolean(this.environmentTexture);
  }

  async loadEnvironmentTexture(url: string, assetName = url) {
    if (isHighDynamicRangeEnvironmentAssetName(assetName)) {
      if (assetName.toLowerCase().endsWith(".exr")) {
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

    const previousTexture = this.environmentTexture;
    const previousEnvironmentMapTexture = this.environmentMapTexture;
    this.environmentTexture = texture;
    this.environmentMapTexture = environmentMapTexture;
    previousTexture?.dispose();
    previousEnvironmentMapTexture?.dispose();
    this.invalidateSceneMaterials();
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
    this.environmentTexture = null;
    this.environmentMapTexture = null;
    this.invalidateSceneMaterials();
  }

  applyEnvConfig(envConfig: ResolvedEditorEnvConfigJSON) {
    const rotationY = envConfig.environmentRotationY;
    this.scene.environment =
      envConfig.environment === 1 && this.environmentMapTexture ? this.environmentMapTexture : null;
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
    this.applyGroundConfig(envConfig.ground);
    this.invalidateSceneMaterials();
  }

  dispose() {
    this.clearEnvironment();
    this.scene.remove(this.gridHelper);
    this.scene.remove(this.groundPlane);
    this.groundPlane.geometry.dispose();
    disposeMeshStandardMaterialTextures(this.groundPlane.material);
    this.groundPlane.material.dispose();
    this.pmremGenerator.dispose();
  }

  private syncGroundVisibility() {
    this.gridHelper.visible = this.groundVisible && this.groundMode === "grid";
    this.groundPlane.visible = this.groundVisible && this.groundMode === "plane";
  }
}
