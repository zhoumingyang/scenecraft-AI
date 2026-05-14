"use client";

import { put } from "@vercel/blob/client";
import type {
  CleanupUploadedAssetsRequest,
  CleanupUploadedAssetsResponse,
  PrepareAssetUploadRequest,
  PrepareAssetUploadResponse,
  UploadedProjectAsset
} from "@/lib/api/contracts/assets";
import { postJson } from "@/lib/http/axios";
import { appApiClient } from "@/frontend/api/client";

const MULTIPART_UPLOAD_THRESHOLD = 25 * 1024 * 1024;

export async function prepareAssetUpload(payload: PrepareAssetUploadRequest) {
  return postJson<PrepareAssetUploadResponse, PrepareAssetUploadRequest>(
    appApiClient,
    "/assets/prepare",
    payload
  );
}

export async function cleanupUploadedAssets(payload: CleanupUploadedAssetsRequest) {
  return postJson<CleanupUploadedAssetsResponse, CleanupUploadedAssetsRequest>(
    appApiClient,
    "/assets/cleanup",
    payload
  );
}

export async function uploadPreparedAsset(payload: PrepareAssetUploadRequest, file: File) {
  const prepared = await prepareAssetUpload(payload);
  const result = await put(prepared.pathname, file, {
    access: prepared.access,
    token: prepared.clientToken,
    contentType: payload.contentType,
    multipart: file.size >= MULTIPART_UPLOAD_THRESHOLD
  });

  const uploadedAsset: UploadedProjectAsset = {
    assetId: payload.assetId,
    projectId: payload.projectId,
    kind: payload.kind,
    provider: "vercel-blob",
    objectKey: result.pathname,
    url: result.url,
    mimeType: result.contentType,
    sizeBytes: file.size,
    originalName: payload.fileName,
    metadata: payload.metadata ?? null
  };

  return uploadedAsset;
}
