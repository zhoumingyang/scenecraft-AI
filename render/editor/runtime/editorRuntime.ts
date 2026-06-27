import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { CameraModel } from "../models";
import type {
  EditorRenderMode,
  EditorViewportCaptureOptions,
  EditorViewportCaptureMode,
  ResolvedEditorEnvConfigJSON,
  ResolvedMeshMaterialJSON
} from "../core/types";
import type { StudioColorGradingConfig } from "../studioColorGrading";
import {
  captureObjectTransformState,
  hasObjectTransformChanged,
  updateObjectTransformState,
  type ObjectTransformState
} from "../utils/object3d";
import { CustomTransformGizmo } from "./customTransformGizmo";
import { configureRendererColorManagement } from "./colorManagement";
import { EditorRuntimeEnvironment } from "./editorRuntimeEnvironment";
import { EditorRuntimePathTracer } from "./editorRuntimePathTracer";
import { EditorRuntimePostProcessing } from "./editorRuntimePostProcessing";
import { EditorRuntimeStudioScene } from "./editorRuntimeStudioScene";
import { FirstPersonController } from "./firstPersonController";
import { ModelLoaderFactory } from "./modelLoaderFactory";
import type { PathTraceDenoiseSettings } from "./pathTraceDenoise";
import { EditorPreviewLighting } from "./previewLighting";
import type {
  PreviewLightingEnvState,
  PreviewLightingLightState
} from "./previewLightingRules";
import {
  startRuntimeLifecycle,
  stopRuntimeLifecycle,
  type RuntimeStartOptions
} from "./editorRuntimeLifecycle";

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
  readonly studioScene: EditorRuntimeStudioScene;

  private rafId = 0;
  private readonly clock = new THREE.Clock();
  private readonly defaultBackground = new THREE.Color("#05070f");
  private readonly environment: EditorRuntimeEnvironment;
  private readonly pathTracer: EditorRuntimePathTracer;
  private readonly postProcessing: EditorRuntimePostProcessing;
  private readonly previewLighting: EditorPreviewLighting;
  private disposed = false;
  private startOptions: RuntimeStartOptions | null = null;
  private frameDirty = true;
  private processingFrame = false;
  private orbitDampingFramesRemaining = 0;
  private lastCameraTransformState: ObjectTransformState;
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
    this.lastCameraTransformState = captureObjectTransformState(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      stencil: true
    });
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.style.outline = "none";
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
      invalidateSceneMaterials: this.invalidateSceneMaterials,
      invalidatePathTraceMaterials: () => this.invalidatePathTraceMaterials()
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
    this.previewLighting = new EditorPreviewLighting({
      scene: this.scene,
      camera: this.camera,
      orbitControls: this.orbitControls
    });
    this.firstPersonController = new FirstPersonController(this.camera, this.renderer.domElement, {
      onChange: this.requestFrame
    });
    this.transformGizmo = new CustomTransformGizmo(this.camera, this.renderer.domElement, this.raycaster);
    this.studioScene = new EditorRuntimeStudioScene({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      orbitControls: this.orbitControls,
      requestFrame: this.requestFrame
    });
    this.scene.add(this.transformGizmo.root);
  }

  start(options: RuntimeStartOptions) {
    if (this.disposed) return;
    this.startOptions = options;
    startRuntimeLifecycle(this.getLifecycleBindings(), options);
    this.requestFrame();
  }

  stop() {
    if (!this.startOptions) return;
    window.cancelAnimationFrame(this.rafId);
    stopRuntimeLifecycle(this.getLifecycleBindings(), this.startOptions);
    this.startOptions = null;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.studioScene.dispose();
    this.previewLighting.dispose();
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
      return this.renderPathTraceFrame();
    }

    this.postProcessing.render(deltaSeconds);
    return false;
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
    updateObjectTransformState(this.lastCameraTransformState, this.camera);
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

  frameStudioCamera(input: {
    center: THREE.Vector3;
    floorY: number;
    height: number;
    radius: number;
    fov: number;
    pitch: number;
    yaw: number;
    distanceMultiplier: number;
  }) {
    const radius = Math.max(input.radius, 1.2);
    const target = input.center.clone();
    target.y = input.floorY + Math.max(input.height * 0.48, radius * 0.65);
    const distance = Math.max(radius * input.distanceMultiplier, 2.8);
    const cameraPosition = new THREE.Vector3(
      target.x + Math.sin(input.yaw) * Math.cos(input.pitch) * distance,
      target.y + Math.sin(input.pitch) * distance + radius * 0.35,
      target.z + Math.cos(input.yaw) * Math.cos(input.pitch) * distance
    );

    this.currentCameraType = 1;
    this.firstPersonController.setEnabled(false);
    this.orbitControls.enabled = !this.transformDragging;
    this.orbitControls.target.copy(target);
    this.camera.fov = input.fov;
    this.camera.position.copy(cameraPosition);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
    this.orbitControls.update();
    updateObjectTransformState(this.lastCameraTransformState, this.camera);
    this.postProcessing.syncCameraState();
    this.pathTracer.invalidateCamera();
    this.requestFrame();
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
    if (!hasObjectTransformChanged(this.camera, this.lastCameraTransformState)) return false;
    cameraModel.copyTransformFromObject(this.camera);
    updateObjectTransformState(this.lastCameraTransformState, this.camera);
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
      this.previewLighting.syncFromCamera();
      return changed;
    }

    changed = this.firstPersonController.update(deltaSeconds);
    this.previewLighting.syncFromCamera();
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
      this.pathTracer.setDenoiseEnabled(false, { redraw: false });
      this.pathTracer.invalidateScene();
    }
    this.requestFrame();
    return true;
  }

  getPathTraceDenoiseEnabled() {
    return this.pathTracer.getDenoiseEnabled();
  }

  getPathTraceDenoiseSettings() {
    return this.pathTracer.getDenoiseSettings();
  }

  setPathTraceDenoiseEnabled(enabled: boolean) {
    if (!this.pathTracer.setDenoiseEnabled(enabled)) return false;
    this.requestFrame();
    return true;
  }

  setPathTraceDenoiseSettings(settings: Partial<PathTraceDenoiseSettings>) {
    if (!this.pathTracer.setDenoiseSettings(settings)) return false;
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

  hasImageBasedLighting() {
    return this.environment.hasImageBasedLighting();
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

  syncPreviewLighting(input: {
    lights: PreviewLightingLightState[];
    environment: PreviewLightingEnvState;
  }) {
    if (!this.previewLighting.syncFromSceneState(input)) return;
    this.pathTracer.invalidateLights();
    this.requestFrame();
  }

  isPreviewLightingEnabled() {
    return this.previewLighting.isEnabled();
  }

  setOutlineSelection(objects: THREE.Object3D[]) {
    this.postProcessing.setOutlineSelection(objects);
    this.requestFrame();
  }

  captureViewportImage(mode: EditorViewportCaptureMode = "clean") {
    this.update(0);

    if (mode === "viewport") {
      if (this.renderMode === "pathTrace") {
        this.renderPathTraceCaptureSamples();
      } else {
        this.renderFrame();
      }
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
      if (this.renderMode === "pathTrace") {
        this.renderPathTraceCaptureSamples();
      } else {
        this.renderFrame();
      }
      return this.renderer.domElement.toDataURL("image/png");
    } finally {
      this.environment.setGridHelperVisible(previousGridHelperVisible);
      this.transformGizmo.setVisible(previousTransformGizmoVisible);
      this.environment.setLightHelpersVisible(previousLightHelpersVisible);
      this.postProcessing.setOutlineEnabled(previousOutlineEnabled);
      this.renderFrame();
    }
  }

  async captureViewportImageAsync(
    mode: EditorViewportCaptureMode = "clean",
    options: EditorViewportCaptureOptions = {}
  ) {
    this.update(0);

    if (mode === "viewport") {
      if (this.renderMode === "pathTrace") {
        await this.renderPathTraceCaptureSamplesAsync(options);
      } else {
        this.renderFrame();
      }
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
      if (this.renderMode === "pathTrace") {
        await this.renderPathTraceCaptureSamplesAsync(options);
      } else {
        this.renderFrame();
      }
      return this.renderer.domElement.toDataURL("image/png");
    } finally {
      this.environment.setGridHelperVisible(previousGridHelperVisible);
      this.transformGizmo.setVisible(previousTransformGizmoVisible);
      this.environment.setLightHelpersVisible(previousLightHelpersVisible);
      this.postProcessing.setOutlineEnabled(previousOutlineEnabled);
      this.renderFrame();
    }
  }

  applyEnvConfig(
    envConfig: ResolvedEditorEnvConfigJSON,
    options: { syncShadowFromGroundMode?: boolean } = {}
  ) {
    const result = this.environment.applyEnvConfig(envConfig, options);
    this.postProcessing.applyConfig(envConfig.postProcessing);
    if (result.groundSceneChanged) {
      this.pathTracer.invalidateScene();
    } else {
      if (result.environmentChanged) {
        this.pathTracer.invalidateEnvironment();
      }
      if (result.materialsChanged) {
        this.pathTracer.invalidateMaterials();
      }
    }
    this.requestFrame();
  }

  applyStudioColorGradingConfig(config: StudioColorGradingConfig | null) {
    this.postProcessing.applyStudioColorGradingConfig(config);
    this.requestFrame();
  }

  updateGroundMaterial(material: ResolvedMeshMaterialJSON) {
    this.environment.updateGroundMaterial(material);
    this.pathTracer.invalidateMaterials();
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
    let shouldContinueRendering = false;

    try {
      this.environment.withPathTraceSceneState(
        this.studioScene.getPathTraceEnvironmentTexture(),
        () => {
          shouldContinueRendering = this.pathTracer.renderSample();
        }
      );
    } finally {
      this.transformGizmo.root.visible = previousTransformGizmoVisible;
    }

    return shouldContinueRendering;
  }

  private renderPathTraceCaptureSamples() {
    const previousTransformGizmoVisible = this.transformGizmo.root.visible;
    this.transformGizmo.root.visible = false;

    try {
      this.environment.withPathTraceSceneState(
        this.studioScene.getPathTraceEnvironmentTexture(),
        () => {
          this.pathTracer.renderCaptureSamples();
          this.pathTracer.renderDenoisedCapture();
        }
      );
    } finally {
      this.transformGizmo.root.visible = previousTransformGizmoVisible;
    }
  }

  private async renderPathTraceCaptureSamplesAsync(options: EditorViewportCaptureOptions = {}) {
    const previousTransformGizmoVisible = this.transformGizmo.root.visible;
    this.transformGizmo.root.visible = false;

    try {
      await this.environment.withPathTraceSceneStateAsync(
        this.studioScene.getPathTraceEnvironmentTexture(),
        async () => {
          await this.pathTracer.renderCaptureSamplesAsync(options);
          this.pathTracer.renderDenoisedCapture();
        }
      );
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
    let pathTraceNeedsMoreSamples = false;

    if (shouldRender) {
      if (this.renderMode === "pathTrace") {
        this.pathTracer.setInteractionActive(
          this.isPathTraceInteractionActive(runtimeChanged, sessionChanged)
        );
      }
      pathTraceNeedsMoreSamples = this.renderFrame(deltaSeconds);
      this.frameDirty = false;
    }

    if (this.shouldContinueAnimating(runtimeChanged, sessionChanged, pathTraceNeedsMoreSamples)) {
      this.rafId = window.requestAnimationFrame(this.animate);
    }
  };

  private shouldContinueAnimating(
    runtimeChanged: boolean,
    sessionChanged: boolean,
    pathTraceNeedsMoreSamples: boolean
  ) {
    return (
      (this.renderMode === "pathTrace" && pathTraceNeedsMoreSamples) ||
      this.transformDragging ||
      this.firstPersonController.hasActiveInput() ||
      this.orbitDampingFramesRemaining > 0 ||
      runtimeChanged ||
      sessionChanged
    );
  }

  private isPathTraceInteractionActive(runtimeChanged: boolean, sessionChanged: boolean) {
    return (
      this.transformDragging ||
      this.firstPersonController.hasActiveInput() ||
      this.orbitDampingFramesRemaining > 0 ||
      runtimeChanged ||
      sessionChanged
    );
  }

  private getLifecycleBindings() {
    return {
      clock: this.clock,
      firstPersonController: this.firstPersonController,
      host: this.host,
      onOrbitControlsChange: this.onOrbitControlsChange,
      onPointerMove: this.onPointerMove,
      onPointerUp: this.onPointerUp,
      orbitControls: this.orbitControls,
      renderer: this.renderer,
      resize: this.resize
    };
  }
}
