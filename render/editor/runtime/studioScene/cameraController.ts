import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { StudioScenePresetDefinition } from "../../studioScenes";
import {
  clampPointToRoom,
  frameStudioSceneCamera,
  getRoomInteriorMargin
} from "./room";
import {
  ROOM_CAMERA_MARGIN_RATIO,
  ROOM_TARGET_MARGIN_RATIO,
  type OrbitControlsSnapshot,
  type StudioRoomBounds,
  type StudioSceneFrame
} from "./types";

type StudioSceneCameraControllerOptions = {
  camera: THREE.PerspectiveCamera;
  orbitControls: OrbitControls;
  requestFrame: () => void;
  isActive: () => boolean;
};

export class StudioSceneCameraController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly orbitControls: OrbitControls;
  private readonly requestFrame: () => void;
  private readonly isActive: () => boolean;
  private bounds: StudioRoomBounds | null = null;
  private snapshot: OrbitControlsSnapshot | null = null;
  private constrainingOrbit = false;

  constructor({
    camera,
    orbitControls,
    requestFrame,
    isActive
  }: StudioSceneCameraControllerOptions) {
    this.camera = camera;
    this.orbitControls = orbitControls;
    this.requestFrame = requestFrame;
    this.isActive = isActive;
  }

  activate() {
    if (this.snapshot) return;
    this.snapshot = this.captureOrbitControlsSnapshot();
    this.orbitControls.addEventListener("change", this.constrainOrbitToRoom);
  }

  applyPreset(
    preset: StudioScenePresetDefinition,
    frame: StudioSceneFrame,
    bounds: StudioRoomBounds
  ) {
    this.bounds = bounds;
    this.frameCamera(preset, frame, bounds);
    this.applyOrbitControlsBounds(bounds);
    this.constrainOrbitToRoom();
  }

  deactivate() {
    this.bounds = null;
    this.restoreOrbitControlsSnapshot();
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
    if (!this.snapshot) return;
    this.orbitControls.removeEventListener("change", this.constrainOrbitToRoom);
    this.orbitControls.minDistance = this.snapshot.minDistance;
    this.orbitControls.maxDistance = this.snapshot.maxDistance;
    this.orbitControls.minPolarAngle = this.snapshot.minPolarAngle;
    this.orbitControls.maxPolarAngle = this.snapshot.maxPolarAngle;
    this.orbitControls.minAzimuthAngle = this.snapshot.minAzimuthAngle;
    this.orbitControls.maxAzimuthAngle = this.snapshot.maxAzimuthAngle;
    this.orbitControls.enablePan = this.snapshot.enablePan;
    this.snapshot = null;
  }

  private constrainOrbitToRoom = () => {
    if (!this.isActive() || !this.bounds || this.constrainingOrbit) return;

    const bounds = this.bounds;
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
}
