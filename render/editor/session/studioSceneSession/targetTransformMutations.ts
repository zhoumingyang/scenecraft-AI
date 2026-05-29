import * as THREE from "three";

import { getStudioScenePreset } from "../../studioScenes";
import {
  applyStudioTargetTransform,
  STUDIO_TARGET_MAX_SCALE,
  STUDIO_TARGET_MIN_SCALE
} from "./target";
import type { ActiveStudioSceneSession, StudioTargetFrame } from "./types";

type RebuildTransientStudioEntities = (
  session: ActiveStudioSceneSession,
  preset: ReturnType<typeof getStudioScenePreset>,
  frame: StudioTargetFrame
) => void;

export function updateStudioTargetTransform(input: {
  session: ActiveStudioSceneSession | null;
  object: THREE.Object3D | null;
  scale?: number;
  rotationY?: number;
  rebuildTransientStudioEntities: RebuildTransientStudioEntities;
  emitChanged: () => void;
}) {
  const { session, object, scale, rotationY, rebuildTransientStudioEntities, emitChanged } = input;
  if (!session || !object) return false;

  const nextScale =
    typeof scale === "number" && Number.isFinite(scale)
      ? THREE.MathUtils.clamp(scale, STUDIO_TARGET_MIN_SCALE, STUDIO_TARGET_MAX_SCALE)
      : session.targetScale;
  const nextRotationY =
    typeof rotationY === "number" && Number.isFinite(rotationY)
      ? rotationY
      : session.targetRotationY;
  const nextFrame = applyStudioTargetTransform(
    object,
    session.targetTransformSnapshot,
    session.targetFrame,
    nextScale,
    nextRotationY
  );
  session.targetScale = nextScale;
  session.targetRotationY = nextRotationY;
  rebuildTransientStudioEntities(session, getStudioScenePreset(session.presetId), nextFrame);
  emitChanged();
  return true;
}

export function resetStudioTargetTransform(input: {
  session: ActiveStudioSceneSession | null;
  object: THREE.Object3D | null;
  rebuildTransientStudioEntities: RebuildTransientStudioEntities;
  emitChanged: () => void;
}) {
  const { session, object, rebuildTransientStudioEntities, emitChanged } = input;
  if (!session || !object) return false;

  const resetFrame = applyStudioTargetTransform(
    object,
    session.targetTransformSnapshot,
    session.targetFrame,
    session.defaultTargetScale,
    0
  );
  session.targetScale = session.defaultTargetScale;
  session.targetRotationY = 0;
  rebuildTransientStudioEntities(session, getStudioScenePreset(session.presetId), resetFrame);
  emitChanged();
  return true;
}
