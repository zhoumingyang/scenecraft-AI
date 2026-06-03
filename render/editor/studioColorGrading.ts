import type { StudioSceneStyleProfile } from "./studioSceneProfiles";

export type StudioColorGradingConfig = {
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  vignette: number;
  detail: number;
};

export type StudioColorGradingPatch = Partial<StudioColorGradingConfig>;

export const DEFAULT_STUDIO_COLOR_GRADING_CONFIG: StudioColorGradingConfig = {
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  vignette: 0,
  detail: 0
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

export function normalizeStudioColorGradingConfig(
  config: StudioColorGradingPatch = {}
): StudioColorGradingConfig {
  return {
    contrast: clamp(config.contrast ?? DEFAULT_STUDIO_COLOR_GRADING_CONFIG.contrast, -1, 1),
    saturation: clamp(config.saturation ?? DEFAULT_STUDIO_COLOR_GRADING_CONFIG.saturation, -1, 1),
    temperature: clamp(config.temperature ?? DEFAULT_STUDIO_COLOR_GRADING_CONFIG.temperature, -1, 1),
    tint: clamp(config.tint ?? DEFAULT_STUDIO_COLOR_GRADING_CONFIG.tint, -1, 1),
    vignette: clamp(config.vignette ?? DEFAULT_STUDIO_COLOR_GRADING_CONFIG.vignette, 0, 1),
    detail: clamp(config.detail ?? DEFAULT_STUDIO_COLOR_GRADING_CONFIG.detail, -1, 1)
  };
}

export function cloneStudioColorGradingConfig(
  config: StudioColorGradingConfig
): StudioColorGradingConfig {
  return { ...config };
}

export function createStudioColorGradingConfigFromStyleProfile(
  profile: StudioSceneStyleProfile
) {
  return normalizeStudioColorGradingConfig({
    contrast: profile.postProcessing.contrast,
    saturation: profile.postProcessing.saturation,
    temperature: profile.postProcessing.temperature,
    tint: profile.postProcessing.tint,
    vignette: profile.postProcessing.vignette,
    detail: profile.postProcessing.detail
  });
}

export function mergeStudioColorGradingConfig(
  current: StudioColorGradingConfig,
  patch: StudioColorGradingPatch
) {
  return normalizeStudioColorGradingConfig({
    ...current,
    ...patch
  });
}
