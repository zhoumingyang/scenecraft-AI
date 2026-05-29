import * as THREE from "three";

import type {
  StudioTargetFrame,
  StudioTargetTransformSnapshot
} from "./types";

export const STUDIO_TARGET_FOOTPRINT_RADIUS = 0.82;
export const STUDIO_TARGET_MAX_HEIGHT = 1.8;
export const STUDIO_TARGET_MIN_SCALE = 0.2;
export const STUDIO_TARGET_MAX_SCALE = 3;

export function cloneObjectTransform(
  object: THREE.Object3D
): StudioTargetTransformSnapshot {
  return {
    position: object.position.clone(),
    quaternion: object.quaternion.clone(),
    scale: object.scale.clone()
  };
}

export function restoreObjectTransform(
  object: THREE.Object3D,
  snapshot: StudioTargetTransformSnapshot
) {
  object.position.copy(snapshot.position);
  object.quaternion.copy(snapshot.quaternion);
  object.scale.copy(snapshot.scale);
  object.updateMatrixWorld(true);
}

export function createStudioFrameFromObject(
  object: THREE.Object3D
): StudioTargetFrame {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  if (box.isEmpty()) {
    object.getWorldPosition(center);
    return {
      center,
      radius: 1,
      footprintRadius: 0.5,
      height: 1,
      floorY: center.y - 0.5
    };
  }

  box.getCenter(center);
  box.getSize(size);
  return {
    center,
    radius: Math.max(size.x, size.y, size.z) * 0.5,
    footprintRadius: Math.max(Math.hypot(size.x, size.z) * 0.5, 0.05),
    height: Math.max(size.y, 0.1),
    floorY: box.min.y
  };
}

export function computeStudioFitScale(frame: StudioTargetFrame) {
  const footprintScale =
    STUDIO_TARGET_FOOTPRINT_RADIUS / Math.max(frame.footprintRadius, 0.05);
  const heightScale =
    STUDIO_TARGET_MAX_HEIGHT / Math.max(frame.height, 0.05);
  return THREE.MathUtils.clamp(
    Math.min(footprintScale, heightScale),
    STUDIO_TARGET_MIN_SCALE,
    STUDIO_TARGET_MAX_SCALE
  );
}

export function applyStudioTargetTransform(
  object: THREE.Object3D,
  snapshot: StudioTargetTransformSnapshot,
  targetFrame: StudioTargetFrame,
  scale: number,
  rotationY: number
) {
  const rotation = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    rotationY
  );

  object.position.copy(snapshot.position);
  object.scale.copy(snapshot.scale).multiplyScalar(scale);
  object.quaternion.copy(snapshot.quaternion).multiply(rotation);
  object.updateMatrixWorld(true);

  const frame = createStudioFrameFromObject(object);
  object.position.add(
    new THREE.Vector3(
      targetFrame.center.x - frame.center.x,
      targetFrame.floorY - frame.floorY,
      targetFrame.center.z - frame.center.z
    )
  );
  object.updateMatrixWorld(true);

  return createStudioFrameFromObject(object);
}
