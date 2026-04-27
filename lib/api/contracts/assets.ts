import type { ProjectAssetKind } from "./constants/assets";

export { PROJECT_ASSET_KINDS } from "./constants/assets";
export type { ProjectAssetKind } from "./constants/assets";

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
