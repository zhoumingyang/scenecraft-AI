import { z } from "zod";
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

export type CleanupUploadedAssetsRequest = {
  objectKeys: string[];
};

export type CleanupUploadedAssetsResponse = {
  deletedCount: number;
};

export const remoteImageUrlSchema = z.preprocess(
  (value) => (typeof value === "string" ? value : ""),
  z
    .string()
    .trim()
    .min(1, "Image URL is required.")
    .transform((value, ctx) => {
      let url: URL;

      try {
        url = new URL(value);
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Image URL is invalid."
        });
        return z.NEVER;
      }

      if (url.protocol !== "https:") {
        ctx.addIssue({
          code: "custom",
          message: "Only HTTPS image URLs can be fetched."
        });
        return z.NEVER;
      }

      return url;
    })
);

export const fetchRemoteImageRequestSchema = z
  .object({
    url: remoteImageUrlSchema
  })
  .strict();

export type FetchRemoteImageRequest = z.input<typeof fetchRemoteImageRequestSchema>;

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
