import type { TranslationKey } from "@/lib/i18n";
import type { Vec3Tuple } from "./core/types";
import {
  DEFAULT_STUDIO_SCENE_STYLE_PROFILE_ID,
  STUDIO_SCENE_STYLE_PROFILE_IDS,
  STUDIO_SCENE_STYLE_PROFILES,
  createStudioPresetFromStyleProfile,
  type StudioLayoutProfile,
  type StudioMaterialProfile,
  type StudioSceneStyleProfileId
} from "./studioSceneProfiles";

export const STUDIO_SCENE_PRESET_IDS = STUDIO_SCENE_STYLE_PROFILE_IDS;

export const STUDIO_SCENE_VARIANT_IDS = [
  "roundPlinth",
  "tieredStage",
  "wallNiche",
  "windowTable"
] as const;

export type StudioScenePresetId = StudioSceneStyleProfileId;
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
  layout: StudioLayoutProfile;
  materials: StudioMaterialProfile;
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

export const STUDIO_SCENE_PRESETS = Object.fromEntries(
  STUDIO_SCENE_PRESET_IDS.map((styleId) => [
    styleId,
    createStudioPresetFromStyleProfile(STUDIO_SCENE_STYLE_PROFILES[styleId])
  ])
) as Record<StudioScenePresetId, StudioScenePresetDefinition>;

export const DEFAULT_STUDIO_SCENE_PRESET_ID: StudioScenePresetId =
  DEFAULT_STUDIO_SCENE_STYLE_PROFILE_ID;
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
