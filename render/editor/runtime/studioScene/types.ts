import type * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type {
  StudioSceneHdriStatus,
  StudioScenePresetDefinition,
  StudioScenePresetId,
  StudioSceneVariantDefinition,
  StudioSceneVariantId
} from "../../studioScenes";
import { STUDIO_ROOM_HALF_EXTENT_RATIO } from "../../studioSceneRoomGeometry";

export type StudioSceneFrame = {
  center: THREE.Vector3;
  radius: number;
  footprintRadius: number;
  height: number;
  floorY: number;
};

export type StudioSceneRuntimeState = {
  active: boolean;
  presetId: StudioScenePresetId | null;
  variantId: StudioSceneVariantId | null;
  hdriStatus: StudioSceneHdriStatus;
  hdriError: string | null;
};

export type EditorRuntimeStudioSceneOptions = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  orbitControls: OrbitControls;
  requestFrame: () => void;
};

export type SceneEnvironmentSnapshot = {
  background: THREE.Color | THREE.Texture | null;
  environment: THREE.Texture | null;
  backgroundIntensity: number;
  backgroundBlurriness: number;
  backgroundRotation: THREE.Euler;
  environmentIntensity: number;
  environmentRotation: THREE.Euler;
};

export type RuntimeAssetRecord = {
  object: THREE.Object3D;
  dispose: () => void;
};

export type StudioRoomBounds = {
  center: THREE.Vector3;
  radius: number;
  width: number;
  depth: number;
  wallHeight: number;
  floorY: number;
  ceilingY: number;
  leftX: number;
  rightX: number;
  backZ: number;
  frontZ: number;
};

export type OrbitControlsSnapshot = {
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  minAzimuthAngle: number;
  maxAzimuthAngle: number;
  enablePan: boolean;
};

export type StudioSceneRuntimeBuildInput = {
  preset: StudioScenePresetDefinition;
  variant: StudioSceneVariantDefinition;
  frame: StudioSceneFrame;
  bounds: StudioRoomBounds;
};

export const MIN_FRAME_RADIUS = 1.2;
export const WALL_HEIGHT_MULTIPLIER = 2.4;
export const ROOM_HALF_EXTENT_RATIO = STUDIO_ROOM_HALF_EXTENT_RATIO;
export const ROOM_INTERIOR_MARGIN_RATIO = 0.16;
export const ROOM_CAMERA_MARGIN_RATIO = 0.32;
export const ROOM_TARGET_MARGIN_RATIO = 0.22;
