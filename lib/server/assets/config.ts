import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import type { PrepareAssetUploadRequest } from "@/lib/api/contracts/assets";
import { PROJECT_ASSET_KINDS } from "@/lib/api/contracts/assets";

const FILE_NAME_SAFE_RE = /[^a-zA-Z0-9._-]+/g;
const MULTI_DASH_RE = /-+/g;

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;
const MAX_SIZE_BY_KIND: Record<(typeof PROJECT_ASSET_KINDS)[number], number> = {
  project_thumbnail: 10 * 1024 * 1024,
  ai_generated_image: 20 * 1024 * 1024,
  ai_reference_image: 20 * 1024 * 1024,
  model_source: 500 * 1024 * 1024,
  texture_image: 50 * 1024 * 1024,
  environment_image: 100 * 1024 * 1024,
  video_clip: 500 * 1024 * 1024
};

const CONTENT_TYPES_BY_KIND: Record<(typeof PROJECT_ASSET_KINDS)[number], string[]> = {
  project_thumbnail: ["image/png", "image/jpeg", "image/webp"],
  ai_generated_image: ["image/png", "image/jpeg", "image/webp"],
  ai_reference_image: ["image/png", "image/jpeg", "image/webp"],
  model_source: [
    "model/gltf-binary",
    "model/gltf+json",
    "application/octet-stream",
    "application/json",
    "application/x-fbx",
    "model/vrm"
  ],
  texture_image: ["image/png", "image/jpeg", "image/webp"],
  environment_image: ["image/png", "image/jpeg", "image/webp", "image/vnd.radiance", "application/octet-stream"],
  video_clip: ["video/mp4", "video/webm", "video/quicktime"]
};

export function sanitizeAssetFileName(fileName: string) {
  const trimmed = fileName.trim().toLowerCase();
  const sanitized = trimmed.replace(FILE_NAME_SAFE_RE, "-").replace(MULTI_DASH_RE, "-").replace(/^-|-$/g, "");
  return sanitized || "asset";
}

export function buildProjectAssetObjectKey(userId: string, payload: PrepareAssetUploadRequest) {
  const safeName = sanitizeAssetFileName(payload.fileName);
  return `users/${userId}/projects/${payload.projectId}/${payload.kind}/${payload.assetId}-${safeName}`;
}

export function getAllowedContentTypes(kind: PrepareAssetUploadRequest["kind"]) {
  return CONTENT_TYPES_BY_KIND[kind] ?? ["application/octet-stream"];
}

export function getMaximumUploadSize(kind: PrepareAssetUploadRequest["kind"]) {
  return MAX_SIZE_BY_KIND[kind] ?? DEFAULT_MAX_SIZE;
}

export function assertBlobConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured. Asset uploads are unavailable.");
  }
}

export async function createAssetUploadClientToken(
  pathname: string,
  kind: PrepareAssetUploadRequest["kind"]
) {
  const maximumSizeInBytes = getMaximumUploadSize(kind);
  const clientToken = await generateClientTokenFromReadWriteToken({
    pathname,
    allowOverwrite: true,
    addRandomSuffix: false,
    validUntil: Date.now() + 30 * 60 * 1000,
    maximumSizeInBytes,
    allowedContentTypes: getAllowedContentTypes(kind)
  });

  return {
    clientToken,
    maximumSizeInBytes
  };
}
