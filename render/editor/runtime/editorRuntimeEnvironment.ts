import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

import type { ResolvedEditorEnvConfigJSON } from "../core/types";

type EditorRuntimeEnvironmentOptions = {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  defaultBackground: THREE.Color;
  invalidateSceneMaterials: () => void;
};

export class EditorRuntimeEnvironment {
  readonly textureLoader = new THREE.TextureLoader();
  readonly hdrLoader = new HDRLoader();

  private readonly scene: THREE.Scene;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly defaultBackground: THREE.Color;
  private readonly invalidateSceneMaterials: () => void;
  private readonly gridHelper: THREE.GridHelper;
  private readonly shadowGroundBase: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly shadowGroundReceiver: THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial>;
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private gridHelperVisible = true;
  private lightHelpersVisible = true;
  private shadowEnabled = false;
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

    this.shadowGroundBase = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#ffffff"),
        transparent: true,
        opacity: 0.96,
        side: THREE.DoubleSide
      })
    );
    this.shadowGroundBase.name = "shadow-ground-base";
    this.shadowGroundBase.rotation.x = -Math.PI / 2;
    this.shadowGroundBase.position.y = -0.001;
    this.shadowGroundBase.visible = false;
    this.scene.add(this.shadowGroundBase);

    this.shadowGroundReceiver = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({
        color: new THREE.Color("#000000"),
        opacity: 0.3,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      })
    );
    this.shadowGroundReceiver.name = "shadow-ground-receiver";
    this.shadowGroundReceiver.rotation.x = -Math.PI / 2;
    this.shadowGroundReceiver.position.y = 0;
    this.shadowGroundReceiver.castShadow = false;
    this.shadowGroundReceiver.receiveShadow = true;
    this.shadowGroundReceiver.renderOrder = 1;
    this.shadowGroundReceiver.visible = false;
    this.scene.add(this.shadowGroundReceiver);

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
  }

  getGridHelperVisible() {
    return this.gridHelperVisible;
  }

  setGridHelperVisible(visible: boolean) {
    this.gridHelperVisible = visible;
    this.syncGroundVisibility();
  }

  getLightHelpersVisible() {
    return this.lightHelpersVisible;
  }

  setLightHelpersVisible(visible: boolean) {
    this.lightHelpersVisible = visible;
    this.syncLightHelperVisibility();
  }

  getShadowEnabled() {
    return this.shadowEnabled;
  }

  setShadowEnabled(enabled: boolean) {
    this.shadowEnabled = enabled;
    this.renderer.shadowMap.enabled = enabled;
    this.invalidateSceneMaterials();
    this.syncGroundVisibility();
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
    const lowerUrl = assetName.toLowerCase();
    if (lowerUrl.endsWith(".hdr")) {
      const texture = await this.hdrLoader.loadAsync(url);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      return texture;
    }

    const texture = await this.textureLoader.loadAsync(url);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
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
  }

  clearEnvironment() {
    this.scene.environment = null;
    this.scene.background = this.defaultBackground;
    this.environmentTexture?.dispose();
    this.environmentMapTexture?.dispose();
    this.environmentTexture = null;
    this.environmentMapTexture = null;
  }

  applyEnvConfig(envConfig: ResolvedEditorEnvConfigJSON) {
    this.scene.environment =
      envConfig.environment === 1 && this.environmentMapTexture ? this.environmentMapTexture : null;
    this.scene.background =
      envConfig.backgroundShow === 1 && this.environmentTexture
        ? this.environmentTexture
        : this.defaultBackground;
    this.renderer.toneMapping = envConfig.toneMapping as THREE.ToneMapping;
    this.renderer.toneMappingExposure = envConfig.toneMappingExposure;
  }

  dispose() {
    this.clearEnvironment();
    this.scene.remove(this.gridHelper);
    this.scene.remove(this.shadowGroundBase);
    this.scene.remove(this.shadowGroundReceiver);
    this.shadowGroundBase.geometry.dispose();
    this.shadowGroundBase.material.dispose();
    this.shadowGroundReceiver.geometry.dispose();
    this.shadowGroundReceiver.material.dispose();
    this.pmremGenerator.dispose();
  }

  private syncGroundVisibility() {
    this.gridHelper.visible = this.gridHelperVisible && !this.shadowEnabled;
    this.shadowGroundBase.visible = this.gridHelperVisible && this.shadowEnabled;
    this.shadowGroundReceiver.visible = this.gridHelperVisible && this.shadowEnabled;
  }
}
