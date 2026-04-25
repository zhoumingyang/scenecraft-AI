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

export type PrepareAssetUploadRequest = {
  assetId: string;
  projectId: string;
  kind: ProjectAssetKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  metadata?: Record<string, unknown> | null;
};

export type PrepareAssetUploadResponse = {
  pathname: string;
  clientToken: string;
  access: "public";
  maximumSizeInBytes: number;
};

export type UploadedProjectAsset = {
  assetId: string;
  projectId: string;
  kind: ProjectAssetKind;
  provider: "vercel-blob";
  objectKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  metadata?: Record<string, unknown> | null;
};
