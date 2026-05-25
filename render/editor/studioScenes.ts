import type { TranslationKey } from "@/lib/i18n";
import type { Vec3Tuple } from "./core/types";

export const STUDIO_SCENE_PRESET_IDS = [
  "seamlessWhite",
  "warmHomeCorner",
  "darkTechStudio",
  "galleryPlinth"
] as const;

export const STUDIO_SCENE_VARIANT_IDS = [
  "roundPlinth",
  "tieredStage",
  "wallNiche",
  "windowTable"
] as const;

export type StudioScenePresetId = (typeof STUDIO_SCENE_PRESET_IDS)[number];
export type StudioSceneLightingPresetId = StudioScenePresetId;
export type StudioSceneVariantId = (typeof STUDIO_SCENE_VARIANT_IDS)[number];
export type StudioSceneHdriStatus = "idle" | "loading" | "ready" | "error";

export type StudioSceneHdriConfig = {
  provider: "polyhaven";
  assetId: string;
  preferredResolution: string;
  preferredFormat: string;
  environmentIntensity: number;
  environmentRotationY: number;
};

export type StudioSceneLightConfig = {
  color: string;
  intensity: number;
  position: Vec3Tuple;
  target: Vec3Tuple;
  width?: number;
  height?: number;
  distance?: number;
  angle?: number;
  penumbra?: number;
};

export type StudioScenePresetDefinition = {
  id: StudioScenePresetId;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  backgroundColor: string;
  floorColor: string;
  wallColor: string;
  accentColor: string;
  plinthColor: string;
  targetLift: number;
  cameraFov: number;
  cameraPitch: number;
  cameraYaw: number;
  cameraDistanceMultiplier: number;
  hdri: StudioSceneHdriConfig;
  keyLight: StudioSceneLightConfig;
  fillLight: StudioSceneLightConfig;
  rimLight: StudioSceneLightConfig;
};

export type StudioSceneLightingPresetDefinition = StudioScenePresetDefinition;

export type StudioSceneVariantDefinition = {
  id: StudioSceneVariantId;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
};

const STUDIO_PLINTH_CLEARANCE_LIFT = 0.325;

export const STUDIO_SCENE_VARIANTS: Record<StudioSceneVariantId, StudioSceneVariantDefinition> = {
  roundPlinth: {
    id: "roundPlinth",
    labelKey: "editor.studioScene.variant.roundPlinth",
    descriptionKey: "editor.studioScene.variant.roundPlinth.description"
  },
  tieredStage: {
    id: "tieredStage",
    labelKey: "editor.studioScene.variant.tieredStage",
    descriptionKey: "editor.studioScene.variant.tieredStage.description"
  },
  wallNiche: {
    id: "wallNiche",
    labelKey: "editor.studioScene.variant.wallNiche",
    descriptionKey: "editor.studioScene.variant.wallNiche.description"
  },
  windowTable: {
    id: "windowTable",
    labelKey: "editor.studioScene.variant.windowTable",
    descriptionKey: "editor.studioScene.variant.windowTable.description"
  }
};

export const STUDIO_SCENE_PRESETS: Record<StudioScenePresetId, StudioScenePresetDefinition> = {
  seamlessWhite: {
    id: "seamlessWhite",
    labelKey: "editor.studioScene.preset.seamlessWhite",
    descriptionKey: "editor.studioScene.preset.seamlessWhite.description",
    backgroundColor: "#f8f7f3",
    floorColor: "#e9e7df",
    wallColor: "#f3f1eb",
    accentColor: "#d8d2c5",
    plinthColor: "#f7f5ef",
    targetLift: STUDIO_PLINTH_CLEARANCE_LIFT,
    cameraFov: 42,
    cameraPitch: 0.18,
    cameraYaw: Math.PI / 4,
    cameraDistanceMultiplier: 2.75,
    hdri: {
      provider: "polyhaven",
      assetId: "studio_small_09",
      preferredResolution: "1k",
      preferredFormat: "hdr",
      environmentIntensity: 0.8,
      environmentRotationY: -0.35
    },
    keyLight: {
      color: "#fffaf0",
      intensity: 4.6,
      position: [3.2, 4.1, 3.4],
      target: [0, 0.9, 0],
      width: 3.4,
      height: 2.1
    },
    fillLight: {
      color: "#f3fbff",
      intensity: 1.6,
      position: [-3.2, 2.4, 2.4],
      target: [0, 0.7, 0],
      width: 2.8,
      height: 2.4
    },
    rimLight: {
      color: "#e2ecff",
      intensity: 12,
      position: [0, 3.2, -3.3],
      target: [0, 0.9, 0],
      distance: 10,
      angle: 0.58,
      penumbra: 0.42
    }
  },
  warmHomeCorner: {
    id: "warmHomeCorner",
    labelKey: "editor.studioScene.preset.warmHomeCorner",
    descriptionKey: "editor.studioScene.preset.warmHomeCorner.description",
    backgroundColor: "#2b211c",
    floorColor: "#8c6548",
    wallColor: "#c9b49b",
    accentColor: "#73513a",
    plinthColor: "#d9c3a3",
    targetLift: STUDIO_PLINTH_CLEARANCE_LIFT,
    cameraFov: 44,
    cameraPitch: 0.15,
    cameraYaw: Math.PI / 5,
    cameraDistanceMultiplier: 2.9,
    hdri: {
      provider: "polyhaven",
      assetId: "white_home_studio",
      preferredResolution: "1k",
      preferredFormat: "hdr",
      environmentIntensity: 0.7,
      environmentRotationY: 0.5
    },
    keyLight: {
      color: "#ffd9ad",
      intensity: 3.4,
      position: [-3.4, 3.3, 2.6],
      target: [0, 0.8, 0],
      width: 2.8,
      height: 3.2
    },
    fillLight: {
      color: "#fff1dc",
      intensity: 1.1,
      position: [2.8, 2.2, 2.8],
      target: [0, 0.7, 0],
      width: 2.2,
      height: 1.8
    },
    rimLight: {
      color: "#ffbc76",
      intensity: 16,
      position: [1.8, 2.7, -2.8],
      target: [0, 0.8, 0],
      distance: 9,
      angle: 0.62,
      penumbra: 0.5
    }
  },
  darkTechStudio: {
    id: "darkTechStudio",
    labelKey: "editor.studioScene.preset.darkTechStudio",
    descriptionKey: "editor.studioScene.preset.darkTechStudio.description",
    backgroundColor: "#07090d",
    floorColor: "#11151d",
    wallColor: "#171b24",
    accentColor: "#2e88ff",
    plinthColor: "#191f2b",
    targetLift: STUDIO_PLINTH_CLEARANCE_LIFT,
    cameraFov: 40,
    cameraPitch: 0.12,
    cameraYaw: Math.PI / 4.5,
    cameraDistanceMultiplier: 2.85,
    hdri: {
      provider: "polyhaven",
      assetId: "studio_kontrast_02",
      preferredResolution: "1k",
      preferredFormat: "hdr",
      environmentIntensity: 0.95,
      environmentRotationY: 0.15
    },
    keyLight: {
      color: "#dbe9ff",
      intensity: 3,
      position: [2.8, 3.8, 3],
      target: [0, 0.9, 0],
      width: 2.6,
      height: 1.7
    },
    fillLight: {
      color: "#274f95",
      intensity: 0.8,
      position: [-3.5, 1.9, 1.4],
      target: [0, 0.7, 0],
      width: 2.1,
      height: 2.8
    },
    rimLight: {
      color: "#62a8ff",
      intensity: 26,
      position: [-1.5, 2.8, -3.2],
      target: [0, 0.9, 0],
      distance: 10,
      angle: 0.5,
      penumbra: 0.25
    }
  },
  galleryPlinth: {
    id: "galleryPlinth",
    labelKey: "editor.studioScene.preset.galleryPlinth",
    descriptionKey: "editor.studioScene.preset.galleryPlinth.description",
    backgroundColor: "#eee9df",
    floorColor: "#cfc7b7",
    wallColor: "#ddd5c8",
    accentColor: "#9c8f7b",
    plinthColor: "#f2eee6",
    targetLift: STUDIO_PLINTH_CLEARANCE_LIFT,
    cameraFov: 38,
    cameraPitch: 0.1,
    cameraYaw: Math.PI / 6,
    cameraDistanceMultiplier: 3.05,
    hdri: {
      provider: "polyhaven",
      assetId: "photo_studio_loft_hall",
      preferredResolution: "1k",
      preferredFormat: "hdr",
      environmentIntensity: 0.62,
      environmentRotationY: -0.1
    },
    keyLight: {
      color: "#fff2df",
      intensity: 3.8,
      position: [0, 4.4, 2.6],
      target: [0, 0.8, 0],
      width: 3.2,
      height: 1.4
    },
    fillLight: {
      color: "#f3f8ff",
      intensity: 1.2,
      position: [-3.1, 2.5, 2.3],
      target: [0, 0.7, 0],
      width: 2.4,
      height: 2.1
    },
    rimLight: {
      color: "#ffffff",
      intensity: 11,
      position: [2.3, 2.8, -2.8],
      target: [0, 0.8, 0],
      distance: 8,
      angle: 0.55,
      penumbra: 0.36
    }
  }
};

export const DEFAULT_STUDIO_SCENE_PRESET_ID: StudioScenePresetId = "seamlessWhite";
export const DEFAULT_STUDIO_SCENE_VARIANT_ID: StudioSceneVariantId = "roundPlinth";

export function getStudioScenePreset(id: StudioScenePresetId) {
  return STUDIO_SCENE_PRESETS[id];
}

export function isStudioScenePresetId(value: string): value is StudioScenePresetId {
  return STUDIO_SCENE_PRESET_IDS.some((id) => id === value);
}

export function getStudioSceneVariant(id: StudioSceneVariantId) {
  return STUDIO_SCENE_VARIANTS[id];
}

export function isStudioSceneVariantId(value: string): value is StudioSceneVariantId {
  return STUDIO_SCENE_VARIANT_IDS.some((id) => id === value);
}
