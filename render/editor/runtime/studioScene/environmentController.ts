import * as THREE from "three";

import type {
  StudioSceneHdriStatus,
  StudioScenePresetDefinition
} from "../../studioScenes";
import { applyTextureColorSpace } from "../colorManagement";
import {
  captureStudioEnvironmentSnapshot,
  restoreStudioEnvironmentSnapshot,
  selectStudioEnvironmentLoader
} from "./environment";
import type { SceneEnvironmentSnapshot } from "./types";

type StudioSceneEnvironmentControllerOptions = {
  scene: THREE.Scene;
  pmremGenerator: THREE.PMREMGenerator;
  requestFrame: () => void;
  isActive: () => boolean;
  getActivePreset: () => StudioScenePresetDefinition | null;
};

export class StudioSceneEnvironmentController {
  private readonly scene: THREE.Scene;
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private readonly requestFrame: () => void;
  private readonly isActive: () => boolean;
  private readonly getActivePreset: () => StudioScenePresetDefinition | null;
  private snapshot: SceneEnvironmentSnapshot | null = null;
  private environmentTexture: THREE.Texture | null = null;
  private environmentMapTexture: THREE.Texture | null = null;
  private hdriStatus: StudioSceneHdriStatus = "idle";
  private hdriError: string | null = null;
  private hdriRequestId = 0;

  constructor({
    scene,
    pmremGenerator,
    requestFrame,
    isActive,
    getActivePreset
  }: StudioSceneEnvironmentControllerOptions) {
    this.scene = scene;
    this.pmremGenerator = pmremGenerator;
    this.requestFrame = requestFrame;
    this.isActive = isActive;
    this.getActivePreset = getActivePreset;
  }

  getStatus() {
    return this.hdriStatus;
  }

  getError() {
    return this.hdriError;
  }

  getPathTraceEnvironmentTexture() {
    return this.environmentTexture;
  }

  captureSnapshotIfNeeded() {
    if (this.snapshot) return;
    this.snapshot = captureStudioEnvironmentSnapshot(this.scene);
  }

  applyBackgroundColor(preset: StudioScenePresetDefinition) {
    this.scene.background = new THREE.Color(preset.backgroundColor);
    this.scene.backgroundIntensity = 1;
    this.scene.backgroundBlurriness = 0;
    this.scene.backgroundRotation.set(0, preset.hdri.environmentRotationY, 0);
    this.scene.environment = null;
    this.scene.environmentIntensity = 1;
    this.scene.environmentRotation.set(0, preset.hdri.environmentRotationY, 0);
  }

  async loadHdri(url: string, assetName = url) {
    const requestId = ++this.hdriRequestId;
    this.hdriStatus = "loading";
    this.hdriError = null;
    this.requestFrame();

    try {
      const loader = selectStudioEnvironmentLoader(assetName || url);
      const texture = await loader.loadAsync(url);
      const preset = this.getActivePreset();
      if (requestId !== this.hdriRequestId || !this.isActive() || !preset) {
        texture.dispose();
        return;
      }

      texture.mapping = THREE.EquirectangularReflectionMapping;
      applyTextureColorSpace(texture, "environmentHdr");
      const environmentMapTexture = this.pmremGenerator.fromEquirectangular(texture).texture;
      this.disposeEnvironmentTextures();
      this.environmentTexture = texture;
      this.environmentMapTexture = environmentMapTexture;
      this.scene.environment = environmentMapTexture;
      this.scene.environmentIntensity = preset.hdri.environmentIntensity;
      this.scene.environmentRotation.set(0, preset.hdri.environmentRotationY, 0);
      this.hdriStatus = "ready";
      this.hdriError = null;
      this.requestFrame();
    } catch (error) {
      if (requestId !== this.hdriRequestId) return;
      this.disposeEnvironmentTextures();
      this.hdriStatus = "error";
      this.hdriError = error instanceof Error ? error.message : "Failed to load studio HDRI.";
      this.requestFrame();
    }
  }

  clearHdri() {
    this.hdriRequestId += 1;
    this.disposeEnvironmentTextures();
    this.hdriStatus = "idle";
    this.hdriError = null;

    const preset = this.getActivePreset();
    if (preset) {
      this.scene.environment = null;
      this.scene.environmentIntensity = 1;
      this.scene.environmentRotation.set(0, preset.hdri.environmentRotationY, 0);
    }

    this.requestFrame();
  }

  restoreSnapshot() {
    if (!this.snapshot) return;
    restoreStudioEnvironmentSnapshot(this.scene, this.snapshot);
    this.snapshot = null;
  }

  deactivate() {
    this.clearHdri();
    this.restoreSnapshot();
  }

  private disposeEnvironmentTextures() {
    this.environmentTexture?.dispose();
    this.environmentMapTexture?.dispose();
    this.environmentTexture = null;
    this.environmentMapTexture = null;
  }
}
