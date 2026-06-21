const MIN_LIGHT_INTENSITY = 0.0001;

export type PreviewLightingLightState = {
  visible: boolean;
  intensity: number;
};

export type PreviewLightingEnvState = {
  hasImageBasedLighting: boolean;
  environmentIntensity: number;
};

export function hasEffectiveProjectLight(lights: PreviewLightingLightState[]) {
  return lights.some(
    (light) => light.visible && Number.isFinite(light.intensity) && light.intensity > MIN_LIGHT_INTENSITY
  );
}

export function hasEffectiveImageBasedLighting(envState: PreviewLightingEnvState) {
  return (
    envState.hasImageBasedLighting &&
    Number.isFinite(envState.environmentIntensity) &&
    envState.environmentIntensity > MIN_LIGHT_INTENSITY
  );
}

export function shouldUsePreviewLighting(
  lights: PreviewLightingLightState[],
  envState: PreviewLightingEnvState
) {
  return !hasEffectiveProjectLight(lights) && !hasEffectiveImageBasedLighting(envState);
}
