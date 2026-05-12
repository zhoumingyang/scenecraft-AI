import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { CameraModel } from "../models";
import type {
  EditorRenderMode,
  EditorViewportCaptureMode,
  ResolvedEditorEnvConfigJSON
} from "../core/types";
import { buildTransformSignature } from "../utils/object3d";
import { CustomTransformGizmo } from "./customTransformGizmo";
import { configureRendererColorManagement } from "./colorManagement";
import { EditorRuntimeEnvironment } from "./editorRuntimeEnvironment";
import { EditorRuntimePathTracer } from "./editorRuntimePathTracer";
import { EditorRuntimePostProcessing } from "./editorRuntimePostProcessing";
import { FirstPersonController } from "./firstPersonController";
import { ModelLoaderFactory } from "./modelLoaderFactory";

type RuntimeStartOptions = {
  onPointerDown: (event: PointerEvent) => void;
  onFrame: (deltaSeconds: number) => boolean;
};

const ORBIT_DAMPING_FRAME_BUDGET = 45;

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
  readonly orbitControls: OrbitControls;
  readonly firstPersonController: FirstPersonController;
  readonly transformGizmo: CustomTransformGizmo;

  private rafId = 0;
  private readonly clock = new THREE.Clock();
  private readonly defaultBackground = new THREE.Color("#05070f");
  private readonly environment: EditorRuntimeEnvironment;
  private readonly pathTracer: EditorRuntimePathTracer;
  private readonly postProcessing: EditorRuntimePostProcessing;
  private disposed = false;
  private startOptions: RuntimeStartOptions | null = null;
  private frameDirty = true;
  private processingFrame = false;
  private orbitDampingFramesRemaining = 0;
  private lastCameraSignature = "";
  private currentCameraType = 1;
  private transformDragging = false;
  private renderMode: EditorRenderMode = "webgl";

  constructor(host: HTMLDivElement) {
    RectAreaLightUniformsLib.init();

    this.host = host;
    this.scene = new THREE.Scene();
    this.scene.background = this.defaultBackground;

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      preserveDrawingBuffer: true,
      stencil: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    configureRendererColorManagement(this.renderer);
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.postProcessing = new EditorRuntimePostProcessing({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer
    });
    this.composer = this.postProcessing.composer;

    this.modelLoaderFactory = new ModelLoaderFactory();
    this.environment = new EditorRuntimeEnvironment({
      scene: this.scene,
      renderer: this.renderer,
      defaultBackground: this.defaultBackground,
      invalidateSceneMaterials: this.invalidateSceneMaterials
    });
    this.pathTracer = new EditorRuntimePathTracer({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer
    });
    this.textureLoader = this.environment.textureLoader;
    this.hdrLoader = this.environment.hdrLoader;
    this.raycaster = new THREE.Raycaster();
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.enablePan = true;
    this.orbitControls.target.set(0, 0, 0);
    this.firstPersonController = new FirstPersonController(this.camera, this.renderer.domElement, {
      onChange: this.requestFrame
    });
    this.transformGizmo = new CustomTransformGizmo(this.camera, this.renderer.domElement, this.raycaster);
    this.scene.add(this.transformGizmo.root);
  }

  start(options: RuntimeStartOptions) {
    if (this.disposed) return;
    this.startOptions = options;
    this.host.appendChild(this.renderer.domElement);
    this.resize();
    this.clock.start();
    this.firstPersonController.connect();
    this.orbitControls.addEventListener("change", this.onOrbitControlsChange);
    this.renderer.domElement.addEventListener("pointerdown", options.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("resize", this.resize);
    this.requestFrame();
  }

  stop() {
    if (!this.startOptions) return;
    window.cancelAnimationFrame(this.rafId);
    this.clock.stop();
    window.removeEventListener("resize", this.resize);
    this.orbitControls.removeEventListener("change", this.onOrbitControlsChange);
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
    this.transformGizmo.dispose();
    this.scene.remove(this.transformGizmo.root);
    this.orbitControls.dispose();
    this.environment.dispose();
    this.pathTracer.dispose();
    this.postProcessing.dispose();
    this.renderer.dispose();
    if (this.host.contains(this.renderer.domElement)) {
      this.host.removeChild(this.renderer.domElement);
    }
  }

  renderFrame(deltaSeconds = 0) {
    if (this.renderMode === "pathTrace") {
      this.renderPathTraceFrame();
      return;
    }

    this.postProcessing.render(deltaSeconds);
  }

  requestFrame = () => {
    if (this.disposed || !this.startOptions) return;
    this.frameDirty = true;
    if (this.rafId !== 0 || this.processingFrame) return;
    this.clock.getDelta();
    this.rafId = window.requestAnimationFrame(this.animate);
  };

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
    this.postProcessing.syncCameraState();
    this.pathTracer.invalidateCamera();
    this.requestFrame();
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
    this.postProcessing.syncCameraState();
    this.pathTracer.invalidateCamera();
    this.requestFrame();
    return true;
  }

  update(deltaSeconds: number) {
    this.transformGizmo.update();
    let changed = false;
    if (this.currentCameraType === 1) {
      changed = this.orbitControls.update();
      if (this.orbitDampingFramesRemaining > 0) {
        this.orbitDampingFramesRemaining -= 1;
      }
      return changed;
    }

    changed = this.firstPersonController.update(deltaSeconds);
    return changed;
  }

  isFirstPersonCamera() {
    return this.currentCameraType === 2;
  }

  getRenderMode() {
    return this.renderMode;
  }

  setRenderMode(mode: EditorRenderMode) {
    if (this.renderMode === mode) return false;
    this.renderMode = mode;
    if (mode === "pathTrace") {
      this.pathTracer.invalidateScene();
    }
    this.requestFrame();
    return true;
  }

  invalidatePathTraceScene() {
    this.pathTracer.invalidateScene();
    this.requestFrame();
  }

  invalidatePathTraceCamera() {
    this.pathTracer.invalidateCamera();
    this.requestFrame();
  }

  invalidatePathTraceMaterials() {
    this.pathTracer.invalidateMaterials();
    this.requestFrame();
  }

  invalidatePathTraceLights() {
    this.pathTracer.invalidateLights();
    this.requestFrame();
  }

  invalidatePathTraceEnvironment() {
    this.pathTracer.invalidateEnvironment();
    this.requestFrame();
  }

  getGridHelperVisible() {
    return this.environment.getGridHelperVisible();
  }

  setGridHelperVisible(visible: boolean) {
    this.environment.setGridHelperVisible(visible);
    this.requestFrame();
  }

  getTransformGizmoVisible() {
    return this.transformGizmo.isVisible();
  }

  getActiveTransformRotationDrag() {
    return this.transformGizmo.getActiveRotateAxisDrag();
  }

  setTransformGizmoVisible(visible: boolean) {
    this.transformGizmo.setVisible(visible);
    this.requestFrame();
  }

  getLightHelpersVisible() {
    return this.environment.getLightHelpersVisible();
  }

  setLightHelpersVisible(visible: boolean) {
    this.environment.setLightHelpersVisible(visible);
    this.requestFrame();
  }

  getShadowEnabled() {
    return this.environment.getShadowEnabled();
  }

  setShadowEnabled(enabled: boolean) {
    this.environment.setShadowEnabled(enabled);
    this.requestFrame();
  }

  syncLightHelperVisibility() {
    this.environment.syncLightHelperVisibility();
    this.requestFrame();
  }

  hasEnvironmentTexture() {
    return this.environment.hasEnvironmentTexture();
  }

  async loadEnvironmentTexture(url: string, assetName = url) {
    return this.environment.loadEnvironmentTexture(url, assetName);
  }

  async setEnvironmentFromUrl(url: string, assetName = url) {
    await this.environment.setEnvironmentFromUrl(url, assetName);
    this.pathTracer.invalidateEnvironment();
    this.requestFrame();
  }

  clearEnvironment() {
    this.environment.clearEnvironment();
    this.pathTracer.invalidateEnvironment();
    this.requestFrame();
  }

  setOutlineSelection(objects: THREE.Object3D[]) {
    this.postProcessing.setOutlineSelection(objects);
    this.requestFrame();
  }

  captureViewportImage(mode: EditorViewportCaptureMode = "clean") {
    this.update(0);

    if (mode === "viewport") {
      this.renderFrame();
      return this.renderer.domElement.toDataURL("image/png");
    }

    const previousGridHelperVisible = this.getGridHelperVisible();
    const previousTransformGizmoVisible = this.getTransformGizmoVisible();
    const previousLightHelpersVisible = this.getLightHelpersVisible();
    const previousOutlineEnabled = this.postProcessing.getOutlineEnabled();

    this.environment.setGridHelperVisible(false);
    this.transformGizmo.setVisible(false);
    this.environment.setLightHelpersVisible(false);
    this.postProcessing.setOutlineEnabled(false);

    try {
      this.renderFrame();
      return this.renderer.domElement.toDataURL("image/png");
    } finally {
      this.environment.setGridHelperVisible(previousGridHelperVisible);
      this.transformGizmo.setVisible(previousTransformGizmoVisible);
      this.environment.setLightHelpersVisible(previousLightHelpersVisible);
      this.postProcessing.setOutlineEnabled(previousOutlineEnabled);
      this.renderFrame();
    }
  }

  applyEnvConfig(envConfig: ResolvedEditorEnvConfigJSON) {
    this.environment.applyEnvConfig(envConfig);
    this.postProcessing.applyConfig(envConfig.postProcessing);
    this.pathTracer.invalidateScene();
    this.pathTracer.invalidateEnvironment();
    this.requestFrame();
  }

  private invalidateSceneMaterials = () => {
    this.scene.traverse((object) => {
      const material = object instanceof THREE.Mesh ? object.material : null;
      if (Array.isArray(material)) {
        material.forEach((entry) => {
          entry.needsUpdate = true;
        });
        return;
      }

      if (material) {
        material.needsUpdate = true;
      }
    });
    this.pathTracer.invalidateMaterials();
    this.requestFrame();
  };

  private renderPathTraceFrame() {
    const previousTransformGizmoVisible = this.transformGizmo.root.visible;
    this.transformGizmo.root.visible = false;

    try {
      this.environment.withEditorHelpersHidden(() => {
        this.pathTracer.renderSample();
      });
    } finally {
      this.transformGizmo.root.visible = previousTransformGizmoVisible;
    }
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
    this.requestFrame();
  }

  private onOrbitControlsChange = () => {
    this.orbitDampingFramesRemaining = ORBIT_DAMPING_FRAME_BUDGET;
    this.requestFrame();
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.transformGizmo.isDragging()) return;
    this.transformGizmo.updatePointerInteraction({
      clientX: event.clientX,
      clientY: event.clientY
    });
    this.requestFrame();
  };

  private onPointerUp = () => {
    if (!this.transformGizmo.isDragging()) return;
    this.transformGizmo.endPointerInteraction();
    this.setTransformDragging(false);
    this.requestFrame();
  };

  private resize = () => {
    const width = this.host.clientWidth || window.innerWidth;
    const height = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.postProcessing.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.postProcessing.syncCameraState();
    this.pathTracer.invalidateCamera();
    this.requestFrame();
  };

  private animate = () => {
    if (!this.startOptions) return;
    this.rafId = 0;
    const deltaSeconds = this.clock.getDelta();
    this.processingFrame = true;
    const runtimeChanged = this.update(deltaSeconds);
    const sessionChanged = this.startOptions.onFrame(deltaSeconds);
    this.processingFrame = false;
    const shouldRender =
      this.frameDirty || runtimeChanged || sessionChanged || this.renderMode === "pathTrace";

    if (shouldRender) {
      this.renderFrame(deltaSeconds);
      this.frameDirty = false;
    }

    if (this.shouldContinueAnimating(runtimeChanged, sessionChanged)) {
      this.rafId = window.requestAnimationFrame(this.animate);
    }
  };

  private shouldContinueAnimating(runtimeChanged: boolean, sessionChanged: boolean) {
    return (
      this.renderMode === "pathTrace" ||
      this.transformDragging ||
      this.firstPersonController.hasActiveInput() ||
      this.orbitDampingFramesRemaining > 0 ||
      runtimeChanged ||
      sessionChanged
    );
  }
}
