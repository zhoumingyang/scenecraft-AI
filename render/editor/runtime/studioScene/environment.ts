import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

import type { SceneEnvironmentSnapshot } from "./types";

export function selectStudioEnvironmentLoader(url: string) {
  const normalized = url.split("?")[0]?.toLowerCase() ?? url.toLowerCase();
  return normalized.endsWith(".exr") ? new EXRLoader() : new HDRLoader();
}

export function captureStudioEnvironmentSnapshot(
  scene: THREE.Scene
): SceneEnvironmentSnapshot {
  return {
    background: scene.background as THREE.Color | THREE.Texture | null,
    environment: scene.environment,
    backgroundIntensity: scene.backgroundIntensity,
    backgroundBlurriness: scene.backgroundBlurriness,
    backgroundRotation: scene.backgroundRotation.clone(),
    environmentIntensity: scene.environmentIntensity,
    environmentRotation: scene.environmentRotation.clone()
  };
}

export function restoreStudioEnvironmentSnapshot(
  scene: THREE.Scene,
  snapshot: SceneEnvironmentSnapshot
) {
  scene.background = snapshot.background;
  scene.environment = snapshot.environment;
  scene.backgroundIntensity = snapshot.backgroundIntensity;
  scene.backgroundBlurriness = snapshot.backgroundBlurriness;
  scene.backgroundRotation.copy(snapshot.backgroundRotation);
  scene.environmentIntensity = snapshot.environmentIntensity;
  scene.environmentRotation.copy(snapshot.environmentRotation);
}
