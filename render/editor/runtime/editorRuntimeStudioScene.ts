import * as THREE from "three";

import type {
  StudioSceneHdriStatus,
  StudioScenePresetDefinition,
  StudioSceneVariantDefinition
} from "../studioScenes";
import { applyTextureColorSpace } from "./colorManagement";
import {
  captureStudioEnvironmentSnapshot,
  restoreStudioEnvironmentSnapshot,
  selectStudioEnvironmentLoader
} from "./studioScene/environment";
import { disposeStudioObject } from "./studioScene/geometry";
import { createStudioRuntimeObjects } from "./studioScene/objects";
import {
  clampPointToRoom,
  createRoomBounds,
  frameStudioSceneCamera,
  getRoomInteriorMargin
} from "./studioScene/room";
import {
  MIN_FRAME_RADIUS,
  ROOM_CAMERA_MARGIN_RATIO,
  ROOM_TARGET_MARGIN_RATIO,
  type EditorRuntimeStudioSceneOptions,
  type OrbitControlsSnapshot,
  type RuntimeAssetRecord,
  type SceneEnvironmentSnapshot,
  type StudioRoomBounds,
  type StudioSceneFrame,
  type StudioSceneRuntimeState
} from "./studioScene/types";

export type { StudioSceneFrame, StudioSceneRuntimeState } from "./studioScene/types";

export class EditorRuntimeStudioScene {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly orbitControls: EditorRuntimeStudioSceneOptions["orbitControls"];
  private readonly requestFrame: () => void;
  private readonly root = new THREE.Group();
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private active = false;
  private preset: StudioScenePresetDefinition | null = null;
  private variant: StudioSceneVariantDefinition | null = null;
  private frame: StudioSceneFrame | null = null;
  private environmentSnapshot: SceneEnvironmentSnapshot | null = null;
  private runtimeAssets: RuntimeAssetRecord[] = [];
  private environmentTexture: THREE.Texture | null = null;
  private environmentMapTexture: THREE.Texture | null = null;
  private hdriStatus: StudioSceneHdriStatus = "idle";
  private hdriError: string | null = null;
  private hdriRequestId = 0;
  private roomBounds: StudioRoomBounds | null = null;
  private orbitControlsSnapshot: OrbitControlsSnapshot | null = null;
  private constrainingOrbit = false;

  constructor({
    scene,
    camera,
    renderer,
    orbitControls,
    requestFrame
  }: EditorRuntimeStudioSceneOptions) {
    this.scene = scene;
    this.camera = camera;
    this.orbitControls = orbitControls;
    this.requestFrame = requestFrame;
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.root.name = "studio-scene-runtime";
    this.root.userData.studioScene = true;
    this.root.visible = false;
    this.scene.add(this.root);
  }

  getState(): StudioSceneRuntimeState {
    return {
      active: this.active,
      presetId: this.preset?.id ?? null,
      variantId: this.variant?.id ?? null,
      hdriStatus: this.hdriStatus,
      hdriError: this.hdriError
    };
  }

  activate(
    preset: StudioScenePresetDefinition,
    variant: StudioSceneVariantDefinition,
    frame: StudioSceneFrame
  ) {
    if (!this.environmentSnapshot) {
      this.environmentSnapshot = this.captureEnvironmentSnapshot();
    }
    if (!this.orbitControlsSnapshot) {
      this.orbitControlsSnapshot = this.captureOrbitControlsSnapshot();
      this.orbitControls.addEventListener("change", this.constrainOrbitToRoom);
    }
    this.active = true;
    this.root.visible = true;
    this.applyPreset(preset, variant, frame);
  }

  applyPreset(
    preset: StudioScenePresetDefinition,
    variant: StudioSceneVariantDefinition,
    frame: StudioSceneFrame
  ) {
    this.preset = preset;
    this.variant = variant;
    this.frame = {
      center: frame.center.clone(),
      radius: Math.max(frame.radius, MIN_FRAME_RADIUS),
      footprintRadius: Math.max(frame.footprintRadius, 0.1),
      height: Math.max(frame.height, MIN_FRAME_RADIUS),
      floorY: frame.floorY
    };
    this.root.userData.studioScenePresetId = preset.id;
    this.root.userData.studioSceneVariantId = variant.id;
    this.roomBounds = createRoomBounds(preset, this.frame);
    this.disposeRuntimeAssets();
    this.createStudioObjects(preset, variant, this.frame, this.roomBounds);
    this.applyBackgroundColor(preset);
    this.frameCamera(preset, this.frame, this.roomBounds);
    this.applyOrbitControlsBounds(this.roomBounds);
    this.constrainOrbitToRoom();
    this.requestFrame();
  }

  async loadHdri(url: string, assetName = url) {
    const requestId = ++this.hdriRequestId;
    this.hdriStatus = "loading";
    this.hdriError = null;
    this.requestFrame();

    try {
      const loader = selectStudioEnvironmentLoader(assetName || url);
      const texture = await loader.loadAsync(url);
      if (requestId !== this.hdriRequestId || !this.active || !this.preset) {
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
      this.scene.environmentIntensity = this.preset.hdri.environmentIntensity;
      this.scene.environmentRotation.set(0, this.preset.hdri.environmentRotationY, 0);
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
    if (this.preset) {
      this.scene.environment = null;
      this.scene.environmentIntensity = 1;
      this.scene.environmentRotation.set(0, this.preset.hdri.environmentRotationY, 0);
    }
    this.requestFrame();
  }

  deactivate() {
    this.active = false;
    this.preset = null;
    this.variant = null;
    this.frame = null;
    this.roomBounds = null;
    this.root.visible = false;
    this.disposeRuntimeAssets();
    this.clearHdri();
    this.restoreEnvironmentSnapshot();
    this.restoreOrbitControlsSnapshot();
    this.requestFrame();
  }

  dispose() {
    this.deactivate();
    this.scene.remove(this.root);
    this.pmremGenerator.dispose();
  }

  private createStudioObjects(
    preset: StudioScenePresetDefinition,
    variant: StudioSceneVariantDefinition,
    frame: StudioSceneFrame,
    bounds: StudioRoomBounds
  ) {
    createStudioRuntimeObjects({ preset, variant, frame, bounds }).forEach((object) => {
      this.addRuntimeObject(object);
    });
  }

  private addRuntimeObject(object: THREE.Object3D) {
    object.userData.studioScene = true;
    this.root.add(object);
    this.runtimeAssets.push({
      object,
      dispose: () => disposeStudioObject(object)
    });
  }

  private frameCamera(
    preset: StudioScenePresetDefinition,
    frame: StudioSceneFrame,
    bounds: StudioRoomBounds
  ) {
    frameStudioSceneCamera({
      camera: this.camera,
      orbitControls: this.orbitControls,
      preset,
      frame,
      bounds
    });
  }

  private applyBackgroundColor(preset: StudioScenePresetDefinition) {
    this.scene.background = new THREE.Color(preset.backgroundColor);
    this.scene.backgroundIntensity = 1;
    this.scene.backgroundBlurriness = 0;
    this.scene.backgroundRotation.set(0, preset.hdri.environmentRotationY, 0);
    this.scene.environment = null;
    this.scene.environmentIntensity = 1;
    this.scene.environmentRotation.set(0, preset.hdri.environmentRotationY, 0);
  }

  private captureOrbitControlsSnapshot(): OrbitControlsSnapshot {
    return {
      minDistance: this.orbitControls.minDistance,
      maxDistance: this.orbitControls.maxDistance,
      minPolarAngle: this.orbitControls.minPolarAngle,
      maxPolarAngle: this.orbitControls.maxPolarAngle,
      minAzimuthAngle: this.orbitControls.minAzimuthAngle,
      maxAzimuthAngle: this.orbitControls.maxAzimuthAngle,
      enablePan: this.orbitControls.enablePan
    };
  }

  private applyOrbitControlsBounds(bounds: StudioRoomBounds) {
    this.orbitControls.minDistance = Math.max(bounds.radius * 0.36, 0.45);
    this.orbitControls.maxDistance = Math.max(
      bounds.radius * 2.15,
      Math.min(bounds.width, bounds.depth) * 0.58
    );
    this.orbitControls.minPolarAngle = 0.08;
    this.orbitControls.maxPolarAngle = Math.PI * 0.56;
    this.orbitControls.minAzimuthAngle = -Infinity;
    this.orbitControls.maxAzimuthAngle = Infinity;
    this.orbitControls.enablePan = false;
  }

  private restoreOrbitControlsSnapshot() {
    if (!this.orbitControlsSnapshot) return;
    this.orbitControls.removeEventListener("change", this.constrainOrbitToRoom);
    this.orbitControls.minDistance = this.orbitControlsSnapshot.minDistance;
    this.orbitControls.maxDistance = this.orbitControlsSnapshot.maxDistance;
    this.orbitControls.minPolarAngle = this.orbitControlsSnapshot.minPolarAngle;
    this.orbitControls.maxPolarAngle = this.orbitControlsSnapshot.maxPolarAngle;
    this.orbitControls.minAzimuthAngle = this.orbitControlsSnapshot.minAzimuthAngle;
    this.orbitControls.maxAzimuthAngle = this.orbitControlsSnapshot.maxAzimuthAngle;
    this.orbitControls.enablePan = this.orbitControlsSnapshot.enablePan;
    this.orbitControlsSnapshot = null;
  }

  private constrainOrbitToRoom = () => {
    if (!this.active || !this.roomBounds || this.constrainingOrbit) return;

    const bounds = this.roomBounds;
    const targetBefore = this.orbitControls.target.clone();
    const cameraBefore = this.camera.position.clone();
    const targetMargin = getRoomInteriorMargin(bounds, ROOM_TARGET_MARGIN_RATIO);
    const cameraMargin = getRoomInteriorMargin(bounds, ROOM_CAMERA_MARGIN_RATIO);
    const nextTarget = clampPointToRoom(this.orbitControls.target.clone(), bounds, targetMargin);
    const targetDelta = nextTarget.clone().sub(this.orbitControls.target);

    if (targetDelta.lengthSq() > 1e-10) {
      this.orbitControls.target.copy(nextTarget);
      this.camera.position.add(targetDelta);
    }

    clampPointToRoom(this.camera.position, bounds, cameraMargin);

    if (
      targetBefore.distanceToSquared(this.orbitControls.target) > 1e-10 ||
      cameraBefore.distanceToSquared(this.camera.position) > 1e-10
    ) {
      this.constrainingOrbit = true;
      this.orbitControls.update();
      this.constrainingOrbit = false;
      this.requestFrame();
    }
  };

  private captureEnvironmentSnapshot(): SceneEnvironmentSnapshot {
    return captureStudioEnvironmentSnapshot(this.scene);
  }

  private restoreEnvironmentSnapshot() {
    if (!this.environmentSnapshot) return;
    restoreStudioEnvironmentSnapshot(this.scene, this.environmentSnapshot);
    this.environmentSnapshot = null;
  }

  private disposeRuntimeAssets() {
    this.runtimeAssets.forEach((asset) => {
      this.root.remove(asset.object);
      asset.dispose();
    });
    this.runtimeAssets = [];
  }

  private disposeEnvironmentTextures() {
    this.environmentTexture?.dispose();
    this.environmentMapTexture?.dispose();
    this.environmentTexture = null;
    this.environmentMapTexture = null;
  }
}
