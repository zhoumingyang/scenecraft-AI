export const PROJECT_ASSET_KINDS = [
  "project_thumbnail",
  "ai_generated_image",
  "ai_reference_image",
  "model_source",
  "texture_image",
  "environment_image",
  "video_clip"
] as const;

export type ProjectAssetKind = (typeof PROJECT_ASSET_KINDS)[number];
