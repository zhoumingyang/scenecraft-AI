import * as THREE from "three";
import { WebGLPathTracer } from "three-gpu-pathtracer";
import {
  PATH_TRACE_CAPTURE_MAX_ITERATIONS,
  PATH_TRACE_CAPTURE_SAMPLES,
  configureEditorPathTracer
} from "./pathTraceRendererConfig";
import { renderPathTraceSamplesUntil } from "./pathTraceSampling";

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
  private sceneDirty = true;
  private cameraDirty = true;
  private materialsDirty = true;
  private lightsDirty = true;
  private environmentDirty = true;

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
    pathTracer.renderSample();
  }

  renderCaptureSamples() {
    const pathTracer = this.ensurePathTracer();
    return renderPathTraceSamplesUntil({
      targetSamples: PATH_TRACE_CAPTURE_SAMPLES,
      maxIterations: PATH_TRACE_CAPTURE_MAX_ITERATIONS,
      getSamples: () => pathTracer.samples,
      renderSample: () => {
        this.preparePathTracer(pathTracer);
        pathTracer.renderSample();
      }
    });
  }

  dispose() {
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
    pathTracer.bounces = 5;
    pathTracer.filterGlossyFactor = 0.5;
    configureEditorPathTracer(pathTracer);
    this.pathTracer = pathTracer;
    this.sceneDirty = true;
    return pathTracer;
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
}
