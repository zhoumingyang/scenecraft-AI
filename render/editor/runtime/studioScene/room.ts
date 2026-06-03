import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { StudioScenePresetDefinition } from "../../studioScenes";
import {
  MIN_FRAME_RADIUS,
  ROOM_CAMERA_MARGIN_RATIO,
  ROOM_HALF_EXTENT_RATIO,
  ROOM_INTERIOR_MARGIN_RATIO,
  ROOM_TARGET_MARGIN_RATIO,
  WALL_HEIGHT_MULTIPLIER,
  type StudioRoomBounds,
  type StudioSceneFrame
} from "./types";

export function toWorldPoint(frame: StudioSceneFrame, offset: [number, number, number]) {
  const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
  return new THREE.Vector3(
    frame.center.x + offset[0] * radius,
    frame.floorY + offset[1] * radius,
    frame.center.z + offset[2] * radius
  );
}

export function createRoomBounds(
  preset: StudioScenePresetDefinition,
  frame: StudioSceneFrame
): StudioRoomBounds {
  const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
  const width = radius * 7;
  const depth = radius * 6.5;
  const wallHeight = Math.max(frame.height * WALL_HEIGHT_MULTIPLIER, radius * 4);
  const floorY = frame.floorY - preset.targetLift * radius;
  const center = frame.center.clone();

  return {
    center,
    radius,
    width,
    depth,
    wallHeight,
    floorY,
    ceilingY: floorY + wallHeight,
    leftX: center.x - width * ROOM_HALF_EXTENT_RATIO,
    rightX: center.x + width * ROOM_HALF_EXTENT_RATIO,
    backZ: center.z - depth * ROOM_HALF_EXTENT_RATIO,
    frontZ: center.z + depth * ROOM_HALF_EXTENT_RATIO
  };
}

export function clampPointToRoom(
  point: THREE.Vector3,
  bounds: StudioRoomBounds,
  margin: number
) {
  point.x = THREE.MathUtils.clamp(point.x, bounds.leftX + margin, bounds.rightX - margin);
  point.y = THREE.MathUtils.clamp(point.y, bounds.floorY + margin, bounds.ceilingY - margin);
  point.z = THREE.MathUtils.clamp(point.z, bounds.backZ + margin, bounds.frontZ - margin);
  return point;
}

export function getRoomInteriorMargin(
  bounds: StudioRoomBounds,
  ratio = ROOM_INTERIOR_MARGIN_RATIO
) {
  return Math.max(bounds.radius * ratio, 0.15);
}

export function toRoomPoint(
  frame: StudioSceneFrame,
  bounds: StudioRoomBounds,
  offset: [number, number, number],
  marginRatio = ROOM_INTERIOR_MARGIN_RATIO
) {
  return clampPointToRoom(
    toWorldPoint(frame, offset),
    bounds,
    getRoomInteriorMargin(bounds, marginRatio)
  );
}

export function frameStudioSceneCamera({
  camera,
  orbitControls,
  preset,
  frame,
  bounds
}: {
  camera: THREE.PerspectiveCamera;
  orbitControls: OrbitControls;
  preset: StudioScenePresetDefinition;
  frame: StudioSceneFrame;
  bounds: StudioRoomBounds;
}) {
  const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
  const target = frame.center.clone();
  target.y = frame.floorY + Math.max(frame.height * 0.48, radius * 0.65);
  const distance = Math.max(radius * preset.cameraDistanceMultiplier, 2.8);
  const yaw = preset.cameraYaw;
  const pitch = preset.cameraPitch;
  const cameraPosition = new THREE.Vector3(
    target.x + Math.sin(yaw) * Math.cos(pitch) * distance,
    target.y + Math.sin(pitch) * distance + radius * 0.35,
    target.z + Math.cos(yaw) * Math.cos(pitch) * distance
  );
  clampPointToRoom(target, bounds, getRoomInteriorMargin(bounds, ROOM_TARGET_MARGIN_RATIO));
  clampPointToRoom(cameraPosition, bounds, getRoomInteriorMargin(bounds, ROOM_CAMERA_MARGIN_RATIO));

  camera.fov = preset.cameraFov;
  camera.position.copy(cameraPosition);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  orbitControls.target.copy(target);
  orbitControls.update();
}
