export const DEFAULT_EDITOR_ENVIRONMENT_INTENSITY = 1;
export const DEFAULT_EDITOR_BACKGROUND_INTENSITY = 1;
export const DEFAULT_EDITOR_BACKGROUND_BLURRINESS = 0.15;
export const DEFAULT_EDITOR_ENVIRONMENT_ROTATION_Y = 0;

export const HIGH_DYNAMIC_RANGE_ENVIRONMENT_EXTENSIONS = [".hdr", ".exr"] as const;

export function isHighDynamicRangeEnvironmentAssetName(assetName: string) {
  const lowerAssetName = assetName.toLowerCase().split(/[?#]/, 1)[0] ?? "";
  return HIGH_DYNAMIC_RANGE_ENVIRONMENT_EXTENSIONS.some((extension) =>
    lowerAssetName.endsWith(extension)
  );
}
