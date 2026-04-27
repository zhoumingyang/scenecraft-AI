import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import type { PrepareAssetUploadRequest } from "@/lib/api/contracts/assets";
import {
  CONTENT_TYPES_BY_KIND,
  DEFAULT_MAX_SIZE,
  FALLBACK_CONTENT_TYPES,
  FILE_NAME_SAFE_RE,
  MAX_SIZE_BY_KIND,
  MULTI_DASH_RE
} from "./constants/upload";

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
  return CONTENT_TYPES_BY_KIND[kind] ?? FALLBACK_CONTENT_TYPES;
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
