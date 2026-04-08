import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

import { CameraModel } from "../models";
import { buildTransformSignature } from "../utils/object3d";
import { CustomTransformGizmo } from "./customTransformGizmo";
import { FirstPersonController } from "./firstPersonController";
import { ModelLoaderFactory } from "./modelLoaderFactory";
import type { EditorEnvConfigJSON } from "../core/types";

type RuntimeStartOptions = {
  onPointerDown: (event: PointerEvent) => void;
  onFrame: (deltaSeconds: number) => void;
};

export class EditorRuntime {
  readonly host: HTMLDivElement;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly composer: EffectComposer;
  readonly modelLoaderFactory: ModelLoaderFactory;
  readonly textureLoader: THREE.TextureLoader;
  readonly hdrLoader: HDRLoader;
  readonly raycaster: THREE.Raycaster;
  readonly fallbackAmbientLight: THREE.AmbientLight;
  readonly orbitControls: OrbitControls;
  readonly firstPersonController: FirstPersonController;
  readonly transformGizmo: CustomTransformGizmo;

  private rafId = 0;
  private readonly clock = new THREE.Clock();
  private readonly gridHelper: THREE.GridHelper;
  private readonly defaultBackground = new THREE.Color("#05070f");
  private disposed = false;
  private startOptions: RuntimeStartOptions | null = null;
  private lastCameraSignature = "";
  private currentCameraType = 1;
  private transformDragging = false;
  private lightHelpersVisible = true;
  private environmentTexture: THREE.Texture | null = null;
  private environmentMapTexture: THREE.Texture | null = null;
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private readonly outlinePass: OutlinePass;

  constructor(host: HTMLDivElement) {
    RectAreaLightUniformsLib.init();

    this.host = host;
    this.scene = new THREE.Scene();
    this.scene.background = this.defaultBackground;
    this.scene.fog = new THREE.Fog("#05070f", 20, 180);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.outlinePass = new OutlinePass(new THREE.Vector2(1, 1), this.scene, this.camera);
    this.outlinePass.edgeStrength = 5.5;
    this.outlinePass.edgeGlow = 0.45;
    this.outlinePass.edgeThickness = 1.4;
    this.outlinePass.pulsePeriod = 0;
    this.outlinePass.visibleEdgeColor.set("#7bc4ff");
    this.outlinePass.hiddenEdgeColor.set("#2a5a88");
    this.composer.addPass(this.outlinePass);

    this.modelLoaderFactory = new ModelLoaderFactory();
    this.textureLoader = new THREE.TextureLoader();
    this.hdrLoader = new HDRLoader();
    this.raycaster = new THREE.Raycaster();
    this.fallbackAmbientLight = new THREE.AmbientLight("#ffffff", 0.55);
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.enablePan = true;
    this.orbitControls.target.set(0, 0, 0);
    this.firstPersonController = new FirstPersonController(this.camera, this.renderer.domElement);
    this.transformGizmo = new CustomTransformGizmo(this.camera, this.renderer.domElement, this.raycaster);

    this.gridHelper = new THREE.GridHelper(80, 80, 0x335588, 0x22334f);
    this.gridHelper.position.y = -0.0001;
    this.scene.add(this.gridHelper);
    this.scene.add(this.transformGizmo.root);
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
  }

  start(options: RuntimeStartOptions) {
    if (this.disposed) return;
    this.startOptions = options;
    this.host.appendChild(this.renderer.domElement);
    this.resize();
    this.clock.start();
    this.firstPersonController.connect();
    this.renderer.domElement.addEventListener("pointerdown", options.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("resize", this.resize);
    this.animate();
  }

  stop() {
    if (!this.startOptions) return;
    window.cancelAnimationFrame(this.rafId);
    this.clock.stop();
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("pointerdown", this.startOptions.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.firstPersonController.disconnect();
    this.startOptions = null;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.clearEnvironment();
    this.transformGizmo.dispose();
    this.scene.remove(this.transformGizmo.root);
    this.orbitControls.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    if (this.host.contains(this.renderer.domElement)) {
      this.host.removeChild(this.renderer.domElement);
    }
  }

  renderFrame() {
    this.composer.render();
  }

  applyCameraModel(cameraModel: CameraModel) {
    this.currentCameraType = cameraModel.cameraType;
    this.camera.fov = cameraModel.fov;
    cameraModel.applyTransformToObject(this.camera);

    if (cameraModel.cameraType === 1) {
      this.firstPersonController.setEnabled(false);
      this.camera.lookAt(0, 0, 0);
      this.orbitControls.enabled = !this.transformDragging;
      this.orbitControls.target.set(0, 0, 0);
      this.orbitControls.update();
    } else {
      this.orbitControls.enabled = false;
      this.firstPersonController.syncFromCamera();
      this.firstPersonController.setEnabled(!this.transformDragging);
    }

    this.camera.updateProjectionMatrix();
    this.lastCameraSignature = buildTransformSignature(this.camera);
  }

  alignCameraModelToFirstPerson(cameraModel: CameraModel) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0;

    if (forward.lengthSq() < 1e-6) {
      forward.set(0, 0, -1);
    } else {
      forward.normalize();
    }

    const position = this.camera.position.clone();
    position.y = 1.8;

    const lookTarget = position.clone().add(forward);
    const helper = new THREE.Object3D();
    helper.position.copy(position);
    helper.lookAt(lookTarget);

    cameraModel.position = [position.x, position.y, position.z];
    cameraModel.quaternion = [
      helper.quaternion.x,
      helper.quaternion.y,
      helper.quaternion.z,
      helper.quaternion.w
    ];
  }

  attachTransformTarget(object: THREE.Object3D | null) {
    this.transformGizmo.setTarget(object);
  }

  isTransformGizmoHit(clientX: number, clientY: number): boolean {
    return this.transformGizmo.isHandleHit(clientX, clientY);
  }

  beginTransformInteraction(clientX: number, clientY: number): boolean {
    const started = this.transformGizmo.beginPointerInteraction({ clientX, clientY });
    if (!started) return false;
    this.setTransformDragging(true);
    return true;
  }

  syncCameraModel(cameraModel: CameraModel): boolean {
    const nextSignature = buildTransformSignature(this.camera);
    if (nextSignature === this.lastCameraSignature) return false;
    cameraModel.copyTransformFromObject(this.camera);
    this.lastCameraSignature = nextSignature;
    return true;
  }

  update(deltaSeconds: number) {
    this.transformGizmo.update();
    if (this.currentCameraType === 1) {
      this.orbitControls.update();
      return;
    }

    this.firstPersonController.update(deltaSeconds);
  }

  isFirstPersonCamera() {
    return this.currentCameraType === 2;
  }

  getGridHelperVisible() {
    return this.gridHelper.visible;
  }

  setGridHelperVisible(visible: boolean) {
    this.gridHelper.visible = visible;
  }

  getTransformGizmoVisible() {
    return this.transformGizmo.isVisible();
  }

  setTransformGizmoVisible(visible: boolean) {
    this.transformGizmo.setVisible(visible);
  }

  getLightHelpersVisible() {
    return this.lightHelpersVisible;
  }

  setLightHelpersVisible(visible: boolean) {
    this.lightHelpersVisible = visible;
    this.syncLightHelperVisibility();
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

  setOutlineSelection(objects: THREE.Object3D[]) {
    this.outlinePass.selectedObjects = objects;
  }

  applyEnvConfig(envConfig: Required<EditorEnvConfigJSON>) {
    this.scene.environment =
      envConfig.environment === 1 && this.environmentMapTexture ? this.environmentMapTexture : null;
    this.scene.background =
      envConfig.backgroundShow === 1 && this.environmentTexture
        ? this.environmentTexture
        : this.defaultBackground;
    this.renderer.toneMapping = envConfig.toneMapping as THREE.ToneMapping;
    this.renderer.toneMappingExposure = envConfig.toneMappingExposure;
    console.log('environment: ', this.scene.environment);
  }

  private setTransformDragging(isDragging: boolean) {
    this.transformDragging = isDragging;
    if (this.currentCameraType === 2) {
      if (!isDragging) this.firstPersonController.syncFromCamera();
      this.firstPersonController.setEnabled(!isDragging);
      this.orbitControls.enabled = false;
      return;
    }
    this.orbitControls.enabled = !isDragging;
  }

  private onPointerMove = (event: PointerEvent) => {
    if (!this.transformGizmo.isDragging()) return;
    this.transformGizmo.updatePointerInteraction({
      clientX: event.clientX,
      clientY: event.clientY
    });
  };

  private onPointerUp = () => {
    if (!this.transformGizmo.isDragging()) return;
    this.transformGizmo.endPointerInteraction();
    this.setTransformDragging(false);
  };

  private resize = () => {
    const width = this.host.clientWidth || window.innerWidth;
    const height = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.outlinePass.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private animate = () => {
    if (!this.startOptions) return;
    this.rafId = window.requestAnimationFrame(this.animate);
    const deltaSeconds = this.clock.getDelta();
    this.update(deltaSeconds);
    this.startOptions.onFrame(deltaSeconds);
    this.renderFrame();
  };
}
