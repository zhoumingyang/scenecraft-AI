import * as THREE from "three";
import { DenoiseMaterial, WebGLPathTracer } from "three-gpu-pathtracer";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import {
  getInteractivePathTraceQuality,
  getPathTraceQualityTransition,
  type PathTraceAdaptiveQuality,
  type PathTraceAdaptiveQualityMode
} from "./pathTraceAdaptiveQuality";
import {
  shouldContinueInteractivePathTrace,
  shouldRenderInteractivePathTraceSample
} from "./pathTraceFrameBudget";
import {
  PATH_TRACE_CAPTURE_DENOISE_SETTINGS,
  PATH_TRACE_REALTIME_DENOISE_SETTINGS,
  normalizePathTraceDenoiseSettings,
  renderPathTraceDenoisedTexture,
  type PathTraceDenoiseSettings
} from "./pathTraceDenoise";
import {
  configureEditorPathTracer
} from "./pathTraceRendererConfig";
import {
  DEFAULT_PATH_TRACE_SETTINGS,
  getPathTraceCaptureSampleBudget,
  normalizePathTraceSettings,
  type PathTraceSettings
} from "./pathTraceSettings";
import {
  renderPathTraceSamplesUntil,
  renderPathTraceSamplesUntilAsync,
  type PathTraceSampleProgress
} from "./pathTraceSampling";
import { createPathTraceSampleStatus, type PathTraceSampleStatus } from "./pathTraceSampleStatus";

type EditorRuntimePathTracerOptions = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
};

export class EditorRuntimePathTracer {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private pathTracer: WebGLPathTracer | null = null;
  private denoiseMaterial: DenoiseMaterial | null = null;
  private denoiseQuad: FullScreenQuad | null = null;
  private displayQuad: { render: (renderer: THREE.WebGLRenderer) => void } | null = null;
  private displayTexture: THREE.Texture | null = null;
  private denoiseEnabled = false;
  private denoiseSettings = { ...PATH_TRACE_REALTIME_DENOISE_SETTINGS };
  private settings = { ...DEFAULT_PATH_TRACE_SETTINGS };
  private sceneDirty = true;
  private cameraDirty = true;
  private materialsDirty = true;
  private lightsDirty = true;
  private environmentDirty = true;
  private interactionActive = false;
  private adaptiveQualityMode: PathTraceAdaptiveQualityMode = "settled";

  constructor({ scene, camera, renderer }: EditorRuntimePathTracerOptions) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }

  invalidateScene() {
    this.sceneDirty = true;
    this.cameraDirty = true;
    this.materialsDirty = true;
    this.lightsDirty = true;
    this.environmentDirty = true;
    this.pathTracer?.reset();
  }

  invalidateCamera() {
    this.cameraDirty = true;
    this.pathTracer?.reset();
  }

  invalidateMaterials() {
    this.materialsDirty = true;
    this.pathTracer?.reset();
  }

  invalidateLights() {
    this.lightsDirty = true;
    this.pathTracer?.reset();
  }

  invalidateEnvironment() {
    this.environmentDirty = true;
    this.pathTracer?.reset();
  }

  renderSample() {
    const pathTracer = this.ensurePathTracer();
    this.preparePathTracer(pathTracer);
    const quality = this.syncAdaptiveQuality(pathTracer);
    if (
      !shouldRenderInteractivePathTraceSample({
        samples: pathTracer.samples,
        targetSamples: quality.targetSamples
      })
    ) {
      return false;
    }

    pathTracer.renderSample();
    return this.shouldContinueRendering();
  }

  renderCaptureSamples() {
    const pathTracer = this.ensurePathTracer();
    const sampleBudget = getPathTraceCaptureSampleBudget(this.settings);
    this.syncAdaptiveQuality(pathTracer, { interactive: false });
    return renderPathTraceSamplesUntil({
      targetSamples: sampleBudget.targetSamples,
      maxIterations: sampleBudget.maxIterations,
      getSamples: () => pathTracer.samples,
      renderSample: () => {
        this.preparePathTracer(pathTracer);
        this.syncAdaptiveQuality(pathTracer, { interactive: false });
        pathTracer.renderSample();
      }
    });
  }

  async renderCaptureSamplesAsync(options: {
    signal?: AbortSignal;
    onProgress?: (progress: PathTraceSampleProgress) => void;
  } = {}) {
    const pathTracer = this.ensurePathTracer();
    const sampleBudget = getPathTraceCaptureSampleBudget(this.settings);
    this.syncAdaptiveQuality(pathTracer, { interactive: false });
    return renderPathTraceSamplesUntilAsync({
      targetSamples: sampleBudget.targetSamples,
      maxIterations: sampleBudget.maxIterations,
      signal: options.signal,
      onProgress: options.onProgress,
      getSamples: () => pathTracer.samples,
      renderSample: () => {
        this.preparePathTracer(pathTracer);
        this.syncAdaptiveQuality(pathTracer, { interactive: false });
        pathTracer.renderSample();
      }
    });
  }

  renderDenoisedCapture() {
    const pathTracer = this.pathTracer;
    if (!pathTracer) return;

    this.renderDenoisedTexture(
      pathTracer.target.texture,
      this.renderer,
      PATH_TRACE_CAPTURE_DENOISE_SETTINGS
    );
  }

  getDenoiseEnabled() {
    return this.denoiseEnabled;
  }

  getDenoiseSettings() {
    return { ...this.denoiseSettings };
  }

  setDenoiseEnabled(enabled: boolean, options: { redraw?: boolean } = {}) {
    if (this.denoiseEnabled === enabled) return false;
    this.denoiseEnabled = enabled;
    if (options.redraw !== false) {
      this.renderCurrentDisplayTexture();
    }
    return true;
  }

  setDenoiseSettings(
    settings: Partial<PathTraceDenoiseSettings>,
    options: { redraw?: boolean } = {}
  ) {
    const nextSettings = normalizePathTraceDenoiseSettings(settings, this.denoiseSettings);
    if (
      nextSettings.sigma === this.denoiseSettings.sigma &&
      nextSettings.threshold === this.denoiseSettings.threshold
    ) {
      return false;
    }

    this.denoiseSettings = nextSettings;
    if (this.denoiseEnabled && options.redraw !== false) {
      this.renderCurrentDisplayTexture();
    }
    return true;
  }

  setSettings(settings: Partial<PathTraceSettings>) {
    const nextSettings = normalizePathTraceSettings(settings, this.settings);
    const changed =
      nextSettings.bounces !== this.settings.bounces ||
      nextSettings.filterGlossyFactor !== this.settings.filterGlossyFactor ||
      nextSettings.interactiveRenderScale !== this.settings.interactiveRenderScale ||
      nextSettings.interactiveSamples !== this.settings.interactiveSamples ||
      nextSettings.renderScale !== this.settings.renderScale ||
      nextSettings.tiles !== this.settings.tiles ||
      nextSettings.minSamples !== this.settings.minSamples ||
      nextSettings.fadeDuration !== this.settings.fadeDuration ||
      nextSettings.renderDelay !== this.settings.renderDelay ||
      nextSettings.realtimeSamples !== this.settings.realtimeSamples ||
      nextSettings.exportSamples !== this.settings.exportSamples;
    if (!changed) return false;

    this.settings = nextSettings;
    this.applySettingsToPathTracer();
    this.pathTracer?.reset();
    return true;
  }

  setInteractionActive(active: boolean) {
    this.interactionActive = active;
  }

  shouldContinueRendering() {
    const pathTracer = this.pathTracer;
    const quality = this.getAdaptiveQuality();
    return shouldContinueInteractivePathTrace({
      dirty: this.hasDirtyState(),
      samples: pathTracer?.samples ?? 0,
      targetSamples: quality.targetSamples
    });
  }

  getSampleStatus(): PathTraceSampleStatus {
    const pathTracer = this.pathTracer;
    const quality = this.getAdaptiveQuality();
    return createPathTraceSampleStatus({
      dirty: this.hasDirtyState(),
      mode: quality.mode,
      samples: pathTracer?.samples ?? 0,
      targetSamples: quality.targetSamples
    });
  }

  dispose() {
    this.denoiseQuad?.dispose();
    this.denoiseMaterial?.dispose();
    this.denoiseQuad = null;
    this.denoiseMaterial = null;
    this.displayQuad = null;
    this.displayTexture = null;
    this.pathTracer?.dispose();
    this.pathTracer = null;
  }

  private preparePathTracer(pathTracer: WebGLPathTracer) {
    if (this.sceneDirty) {
      pathTracer.setScene(this.scene, this.camera);
      this.clearDirtyState();
    } else {
      this.flushIncrementalUpdates(pathTracer);
    }
  }

  private ensurePathTracer() {
    if (this.pathTracer) return this.pathTracer;

    const pathTracer = new WebGLPathTracer(this.renderer);
    configureEditorPathTracer(pathTracer, {
      renderScale: this.getDisplayPixelRenderScale()
    });
    this.applySettingsToPathTracer(pathTracer);
    pathTracer.renderToCanvasCallback = (target, renderer, quad) => {
      this.displayTexture = target.texture;
      this.displayQuad = quad;
      if (this.denoiseEnabled) {
        this.renderDenoisedTexture(target.texture, renderer, this.denoiseSettings);
        return;
      }
      this.renderRawTexture(renderer, quad);
    };
    this.pathTracer = pathTracer;
    this.sceneDirty = true;
    return pathTracer;
  }

  private renderCurrentDisplayTexture() {
    if (!this.displayTexture) return;

    if (this.denoiseEnabled) {
      this.renderDenoisedTexture(this.displayTexture, this.renderer, this.denoiseSettings);
      return;
    }

    if (this.displayQuad) {
      this.renderRawTexture(this.renderer, this.displayQuad);
    }
  }

  private ensureDenoiseMaterial() {
    if (this.denoiseMaterial) return this.denoiseMaterial;

    const denoiseMaterial = new DenoiseMaterial();
    this.denoiseMaterial = denoiseMaterial;
    this.denoiseQuad = new FullScreenQuad(denoiseMaterial);
    return denoiseMaterial;
  }

  private applySettingsToPathTracer(pathTracer = this.pathTracer) {
    if (!pathTracer) return;
    pathTracer.bounces = this.settings.bounces;
    pathTracer.filterGlossyFactor = this.settings.filterGlossyFactor;
    pathTracer.minSamples = this.settings.minSamples;
    pathTracer.fadeDuration = this.settings.fadeDuration;
    pathTracer.renderDelay = this.settings.renderDelay;
    pathTracer.tiles.set(this.settings.tiles, this.settings.tiles);
  }

  private renderDenoisedTexture(
    texture: THREE.Texture,
    renderer: THREE.WebGLRenderer,
    settings?: Parameters<typeof renderPathTraceDenoisedTexture>[0]["settings"]
  ) {
    const denoiseMaterial = this.ensureDenoiseMaterial();
    const denoiseQuad = this.denoiseQuad;
    if (!denoiseQuad) return;

    renderPathTraceDenoisedTexture({
      material: denoiseMaterial,
      quad: denoiseQuad,
      renderer,
      settings,
      texture
    });
  }

  private renderRawTexture(
    renderer: THREE.WebGLRenderer,
    quad: { render: (renderer: THREE.WebGLRenderer) => void }
  ) {
    const previousAutoClear = renderer.autoClear;
    renderer.autoClear = true;
    renderer.clear();
    quad.render(renderer);
    renderer.autoClear = previousAutoClear;
  }

  private flushIncrementalUpdates(pathTracer: WebGLPathTracer) {
    if (this.cameraDirty) {
      pathTracer.updateCamera();
      this.cameraDirty = false;
    }

    if (this.materialsDirty) {
      pathTracer.updateMaterials();
      this.materialsDirty = false;
    }

    if (this.environmentDirty) {
      pathTracer.updateEnvironment();
      this.environmentDirty = false;
    }

    if (this.lightsDirty) {
      pathTracer.updateLights();
      this.lightsDirty = false;
    }
  }

  private clearDirtyState() {
    this.sceneDirty = false;
    this.cameraDirty = false;
    this.materialsDirty = false;
    this.lightsDirty = false;
    this.environmentDirty = false;
  }

  private hasDirtyState() {
    return (
      this.sceneDirty ||
      this.cameraDirty ||
      this.materialsDirty ||
      this.lightsDirty ||
      this.environmentDirty
    );
  }

  private syncAdaptiveQuality(
    pathTracer: WebGLPathTracer,
    options: { interactive?: boolean } = {}
  ) {
    const quality = this.getAdaptiveQuality(options);
    const transition = getPathTraceQualityTransition({
      currentMode: this.adaptiveQualityMode,
      nextMode: quality.mode
    });
    const renderScaleChanged = pathTracer.renderScale !== quality.renderScale;
    pathTracer.renderScale = quality.renderScale;

    if (transition.shouldResetSamples || renderScaleChanged) {
      pathTracer.reset();
    }

    this.adaptiveQualityMode = quality.mode;
    return quality;
  }

  private getAdaptiveQuality(options: { interactive?: boolean } = {}): PathTraceAdaptiveQuality {
    return getInteractivePathTraceQuality({
      displayPixelRenderScale: this.getDisplayPixelRenderScale(),
      interactive: options.interactive ?? this.interactionActive,
      interactiveRenderScale: this.settings.interactiveRenderScale,
      interactiveTargetSamples: this.settings.interactiveSamples,
      settledRenderScale: this.settings.renderScale,
      settledTargetSamples: this.settings.realtimeSamples
    });
  }

  private getDisplayPixelRenderScale() {
    return Math.min(1, 1 / Math.max(this.renderer.getPixelRatio(), 1));
  }
}
