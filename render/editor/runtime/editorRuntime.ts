import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { DotScreenPass } from "three/examples/jsm/postprocessing/DotScreenPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass.js";
import { GlitchPass } from "three/examples/jsm/postprocessing/GlitchPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { HalftonePass } from "three/examples/jsm/postprocessing/HalftonePass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { SSRPass } from "three/examples/jsm/postprocessing/SSRPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { CameraModel } from "../models";
import type { ResolvedEditorEnvConfigJSON } from "../core/types";
import { buildTransformSignature } from "../utils/object3d";
import { CustomTransformGizmo } from "./customTransformGizmo";
import { FirstPersonController } from "./firstPersonController";
import { ModelLoaderFactory } from "./modelLoaderFactory";

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
  readonly orbitControls: OrbitControls;
  readonly firstPersonController: FirstPersonController;
  readonly transformGizmo: CustomTransformGizmo;

  private rafId = 0;
  private readonly clock = new THREE.Clock();
  private readonly gridHelper: THREE.GridHelper;
  private readonly shadowGroundBase: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly shadowGroundReceiver: THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial>;
  private readonly defaultBackground = new THREE.Color("#05070f");
  private disposed = false;
  private startOptions: RuntimeStartOptions | null = null;
  private lastCameraSignature = "";
  private currentCameraType = 1;
  private transformDragging = false;
  private gridHelperVisible = true;
  private lightHelpersVisible = true;
  private shadowEnabled = false;
  private environmentTexture: THREE.Texture | null = null;
  private environmentMapTexture: THREE.Texture | null = null;
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private readonly renderPass: RenderPass;
  private readonly outlinePass: OutlinePass;
  private afterimagePass: AfterimagePass | null = null;
  private bokehPass: BokehPass | null = null;
  private dotScreenPass: DotScreenPass | null = null;
  private filmPass: FilmPass | null = null;
  private glitchPass: GlitchPass | null = null;
  private gtaoPass: GTAOPass | null = null;
  private halftonePass: HalftonePass | null = null;
  private smaaPass: SMAAPass | null = null;
  private ssrPass: SSRPass | null = null;
  private unrealBloomPass: UnrealBloomPass | null = null;
  private postProcessingInitialized = false;

  constructor(host: HTMLDivElement) {
    RectAreaLightUniformsLib.init();

    this.host = host;
    this.scene = new THREE.Scene();
    this.scene.background = this.defaultBackground;

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.outlinePass = new OutlinePass(new THREE.Vector2(1, 1), this.scene, this.camera);
    this.outlinePass.edgeStrength = 5.5;
    this.outlinePass.edgeGlow = 0.45;
    this.outlinePass.edgeThickness = 1.4;
    this.outlinePass.pulsePeriod = 0;
    this.outlinePass.visibleEdgeColor.set("#7bc4ff");
    this.outlinePass.hiddenEdgeColor.set("#2a5a88");

    this.modelLoaderFactory = new ModelLoaderFactory();
    this.textureLoader = new THREE.TextureLoader();
    this.hdrLoader = new HDRLoader();
    this.raycaster = new THREE.Raycaster();
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.enablePan = true;
    this.orbitControls.target.set(0, 0, 0);
    this.firstPersonController = new FirstPersonController(this.camera, this.renderer.domElement);
    this.transformGizmo = new CustomTransformGizmo(this.camera, this.renderer.domElement, this.raycaster);

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
    this.scene.remove(this.shadowGroundBase);
    this.scene.remove(this.shadowGroundReceiver);
    this.shadowGroundBase.geometry.dispose();
    this.shadowGroundBase.material.dispose();
    this.shadowGroundReceiver.geometry.dispose();
    this.shadowGroundReceiver.material.dispose();
    this.orbitControls.dispose();
    this.disposePostProcessingPasses();
    this.pmremGenerator.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    if (this.host.contains(this.renderer.domElement)) {
      this.host.removeChild(this.renderer.domElement);
    }
  }

  renderFrame(deltaSeconds = 0) {
    this.composer.render(deltaSeconds);
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
    this.syncPostProcessingCameraState();
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
    return this.gridHelperVisible;
  }

  setGridHelperVisible(visible: boolean) {
    this.gridHelperVisible = visible;
    this.syncGroundVisibility();
  }

  getTransformGizmoVisible() {
    return this.transformGizmo.isVisible();
  }

  getActiveTransformRotationDrag() {
    return this.transformGizmo.getActiveRotateAxisDrag();
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

  setOutlineSelection(objects: THREE.Object3D[]) {
    this.outlinePass.selectedObjects = objects;
  }

  captureAiPreviewImages(objects: THREE.Object3D[]) {
    const size = 768;
    const snapshotScene = new THREE.Scene();
    snapshotScene.background = new THREE.Color("#0a1020");

    const ambientLight = new THREE.AmbientLight("#ffffff", 1.35);
    const keyLight = new THREE.DirectionalLight("#ffffff", 1.8);
    keyLight.position.set(5, 8, 7);
    const fillLight = new THREE.DirectionalLight("#9fc6ff", 0.75);
    fillLight.position.set(-6, 4, -5);
    snapshotScene.add(ambientLight, keyLight, fillLight);

    const root = new THREE.Group();
    objects.forEach((object) => {
      root.add(object);
    });
    snapshotScene.add(root);

    const bounds = new THREE.Box3().setFromObject(root);
    const center = bounds.getCenter(new THREE.Vector3());
    const sizeVector = bounds.getSize(new THREE.Vector3());
    const maxDimension = Math.max(sizeVector.x, sizeVector.y, sizeVector.z, 1);
    const distance = maxDimension * 2.2;

    const views = [
      {
        position: new THREE.Vector3(center.x, center.y + maxDimension * 0.15, center.z + distance),
        up: new THREE.Vector3(0, 1, 0)
      },
      {
        position: new THREE.Vector3(center.x + distance, center.y + maxDimension * 0.12, center.z),
        up: new THREE.Vector3(0, 1, 0)
      },
      {
        position: new THREE.Vector3(center.x, center.y + distance, center.z),
        up: new THREE.Vector3(0, 0, -1)
      }
    ];

    const snapshotCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
    const snapshotRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true
    });
    snapshotRenderer.setSize(size, size, false);
    snapshotRenderer.setPixelRatio(1);
    snapshotRenderer.toneMapping = this.renderer.toneMapping;
    snapshotRenderer.toneMappingExposure = this.renderer.toneMappingExposure;

    try {
      return views.map((view) => {
        snapshotCamera.position.copy(view.position);
        snapshotCamera.up.copy(view.up);
        snapshotCamera.lookAt(center);
        snapshotCamera.updateProjectionMatrix();
        snapshotRenderer.render(snapshotScene, snapshotCamera);
        return snapshotRenderer.domElement.toDataURL("image/png");
      });
    } finally {
      snapshotRenderer.dispose();
    }
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
    this.syncPostProcessing(envConfig);
  }

  private ensurePostProcessingPasses() {
    if (this.postProcessingInitialized) return;

    const size = this.renderer.getSize(new THREE.Vector2());
    const width = Math.max(1, size.x);
    const height = Math.max(1, size.y);
    const resolution = new THREE.Vector2(width, height);

    this.gtaoPass = new GTAOPass(this.scene, this.camera, width, height);
    this.gtaoPass.output = GTAOPass.OUTPUT.Default;
    this.gtaoPass.enabled = false;

    this.ssrPass = new SSRPass({
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      width,
      height,
      selects: null,
      groundReflector: null
    });
    this.ssrPass.output = SSRPass.OUTPUT.Default;
    this.ssrPass.enabled = false;
    this.ssrPass.bouncing = false;

    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: 15,
      aperture: 0.01,
      maxblur: 0.01
    });
    this.bokehPass.enabled = false;

    this.unrealBloomPass = new UnrealBloomPass(resolution, 0.8, 0.2, 0.85);
    this.unrealBloomPass.enabled = false;

    this.afterimagePass = new AfterimagePass(0.92);
    this.afterimagePass.enabled = false;

    this.dotScreenPass = new DotScreenPass(new THREE.Vector2(width / 2, height / 2), 0.5, 1);
    this.dotScreenPass.enabled = false;

    this.halftonePass = new HalftonePass({
      shape: 1,
      radius: 4,
      scatter: 0,
      blending: 1,
      blendingMode: 1,
      greyscale: false
    });
    this.halftonePass.enabled = false;

    this.filmPass = new FilmPass(0.35, false);
    this.filmPass.enabled = false;

    this.glitchPass = new GlitchPass();
    this.glitchPass.enabled = false;
    this.glitchPass.goWild = false;

    this.smaaPass = new SMAAPass();
    this.smaaPass.enabled = true;

    this.composer.addPass(this.gtaoPass);
    this.composer.addPass(this.ssrPass);
    this.composer.addPass(this.bokehPass);
    this.composer.addPass(this.unrealBloomPass);
    this.composer.addPass(this.afterimagePass);
    this.composer.addPass(this.dotScreenPass);
    this.composer.addPass(this.halftonePass);
    this.composer.addPass(this.filmPass);
    this.composer.addPass(this.glitchPass);
    this.composer.addPass(this.outlinePass);
    this.composer.addPass(this.smaaPass);

    this.postProcessingInitialized = true;
    this.syncPostProcessingSize(width, height);
  }

  private syncPostProcessing(envConfig: ResolvedEditorEnvConfigJSON) {
    this.ensurePostProcessingPasses();

    const { passes } = envConfig.postProcessing;

    if (this.afterimagePass) {
      this.afterimagePass.enabled = passes.afterimage.enabled;
      this.afterimagePass.damp = passes.afterimage.params.damp;
    }

    if (this.bokehPass) {
      const bokehUniforms = this.bokehPass.materialBokeh.uniforms as Record<
        string,
        { value: number | THREE.Texture | null }
      >;
      this.bokehPass.enabled = passes.bokeh.enabled;
      bokehUniforms.focus.value = passes.bokeh.params.focus;
      bokehUniforms.aperture.value = passes.bokeh.params.aperture;
      bokehUniforms.maxblur.value = passes.bokeh.params.maxblur;
      bokehUniforms.aspect.value = this.camera.aspect;
      bokehUniforms.nearClip.value = this.camera.near;
      bokehUniforms.farClip.value = this.camera.far;
    }

    if (this.dotScreenPass) {
      const dotScreenUniforms = this.dotScreenPass.uniforms as Record<
        string,
        { value: number | THREE.Vector2 | THREE.Texture | null }
      >;
      this.dotScreenPass.enabled = passes.dotScreen.enabled;
      dotScreenUniforms.angle.value = passes.dotScreen.params.angle;
      dotScreenUniforms.scale.value = passes.dotScreen.params.scale;
    }

    if (this.filmPass) {
      const filmUniforms = this.filmPass.uniforms as Record<
        string,
        { value: number | boolean | THREE.Texture | null }
      >;
      this.filmPass.enabled = passes.film.enabled;
      filmUniforms.intensity.value = passes.film.params.intensity;
      filmUniforms.grayscale.value = passes.film.params.grayscale;
    }

    if (this.glitchPass) {
      this.glitchPass.enabled = passes.glitch.enabled;
      this.glitchPass.goWild = passes.glitch.params.goWild;
    }

    if (this.gtaoPass) {
      this.gtaoPass.enabled = passes.gtao.enabled;
      this.gtaoPass.output = GTAOPass.OUTPUT.Default;
      this.gtaoPass.blendIntensity = passes.gtao.params.blendIntensity;
      this.gtaoPass.updateGtaoMaterial({
        radius: passes.gtao.params.radius,
        distanceFallOff: passes.gtao.params.distanceFallOff,
        thickness: passes.gtao.params.thickness
      });
      this.gtaoPass.updatePdMaterial({
        lumaPhi: 10,
        depthPhi: 2,
        normalPhi: 3,
        radius: 8,
        radiusExponent: 2,
        rings: 2,
        samples: 16
      });
    }

    if (this.halftonePass) {
      const halftoneUniforms = this.halftonePass.uniforms as Record<
        string,
        { value: number | boolean | THREE.Texture | null }
      >;
      this.halftonePass.enabled = passes.halftone.enabled;
      halftoneUniforms.shape.value = passes.halftone.params.shape;
      halftoneUniforms.radius.value = passes.halftone.params.radius;
      halftoneUniforms.scatter.value = passes.halftone.params.scatter;
      halftoneUniforms.blending.value = passes.halftone.params.blending;
      halftoneUniforms.blendingMode.value = passes.halftone.params.blendingMode;
      halftoneUniforms.greyscale.value = passes.halftone.params.greyscale;
    }

    if (this.ssrPass) {
      this.ssrPass.enabled = passes.ssr.enabled;
      this.ssrPass.output = SSRPass.OUTPUT.Default;
      this.ssrPass.opacity = passes.ssr.params.opacity;
      this.ssrPass.maxDistance = passes.ssr.params.maxDistance;
      this.ssrPass.thickness = passes.ssr.params.thickness;
      this.ssrPass.blur = passes.ssr.params.blur;
      this.ssrPass.distanceAttenuation = passes.ssr.params.distanceAttenuation;
      this.ssrPass.fresnel = passes.ssr.params.fresnel;
      this.ssrPass.infiniteThick = passes.ssr.params.infiniteThick;
      this.ssrPass.bouncing = false;
      this.ssrPass.selects = null;
    }

    if (this.unrealBloomPass) {
      this.unrealBloomPass.enabled = passes.unrealBloom.enabled;
      this.unrealBloomPass.strength = passes.unrealBloom.params.strength;
      this.unrealBloomPass.radius = passes.unrealBloom.params.radius;
      this.unrealBloomPass.threshold = passes.unrealBloom.params.threshold;
    }

    this.outlinePass.enabled = true;
    if (this.smaaPass) {
      this.smaaPass.enabled = true;
    }
  }

  private syncPostProcessingCameraState() {
    if (!this.postProcessingInitialized) return;

    if (this.bokehPass) {
      const bokehUniforms = this.bokehPass.materialBokeh.uniforms as Record<
        string,
        { value: number | THREE.Texture | null }
      >;
      bokehUniforms.aspect.value = this.camera.aspect;
      bokehUniforms.nearClip.value = this.camera.near;
      bokehUniforms.farClip.value = this.camera.far;
    }

    if (this.gtaoPass) {
      this.gtaoPass.setSize(this.gtaoPass.width, this.gtaoPass.height);
    }

    if (this.ssrPass) {
      this.ssrPass.setSize(this.ssrPass.width, this.ssrPass.height);
    }
  }

  private syncPostProcessingSize(width: number, height: number) {
    if (!this.postProcessingInitialized) return;

    const effectiveWidth = Math.max(1, Math.round(width * this.renderer.getPixelRatio()));
    const effectiveHeight = Math.max(1, Math.round(height * this.renderer.getPixelRatio()));

    if (this.bokehPass) {
      const bokehUniforms = this.bokehPass.materialBokeh.uniforms as Record<
        string,
        { value: number | THREE.Texture | null }
      >;
      bokehUniforms.aspect.value = width / Math.max(height, 1);
      bokehUniforms.nearClip.value = this.camera.near;
      bokehUniforms.farClip.value = this.camera.far;
    }

    if (this.dotScreenPass) {
      const dotScreenUniforms = this.dotScreenPass.uniforms as Record<
        string,
        { value: number | THREE.Vector2 | THREE.Texture | null }
      >;
      const center = dotScreenUniforms.center.value;
      if (center instanceof THREE.Vector2) {
        center.set(effectiveWidth / 2, effectiveHeight / 2);
      }
    }

    if (this.halftonePass) {
      this.halftonePass.uniforms.width.value = effectiveWidth;
      this.halftonePass.uniforms.height.value = effectiveHeight;
    }
  }

  private disposePostProcessingPasses() {
    this.afterimagePass?.dispose();
    this.afterimagePass = null;
    this.bokehPass?.dispose();
    this.bokehPass = null;
    this.dotScreenPass?.dispose();
    this.dotScreenPass = null;
    this.filmPass?.dispose();
    this.filmPass = null;
    this.glitchPass?.dispose();
    this.glitchPass = null;
    this.gtaoPass?.dispose();
    this.gtaoPass = null;
    this.halftonePass?.dispose();
    this.halftonePass = null;
    this.outlinePass.dispose();
    this.smaaPass?.dispose();
    this.smaaPass = null;
    this.ssrPass?.dispose();
    this.ssrPass = null;
    this.unrealBloomPass?.dispose();
    this.unrealBloomPass = null;
    this.postProcessingInitialized = false;
  }

  private syncGroundVisibility() {
    this.gridHelper.visible = this.gridHelperVisible && !this.shadowEnabled;
    this.shadowGroundBase.visible = this.gridHelperVisible && this.shadowEnabled;
    this.shadowGroundReceiver.visible = this.gridHelperVisible && this.shadowEnabled;
  }

  private invalidateSceneMaterials() {
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
    this.syncPostProcessingSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.syncPostProcessingCameraState();
  };

  private animate = () => {
    if (!this.startOptions) return;
    this.rafId = window.requestAnimationFrame(this.animate);
    const deltaSeconds = this.clock.getDelta();
    this.update(deltaSeconds);
    this.startOptions.onFrame(deltaSeconds);
    this.renderFrame(deltaSeconds);
  };
}
