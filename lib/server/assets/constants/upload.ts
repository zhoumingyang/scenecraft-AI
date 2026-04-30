import type { ProjectAssetKind } from "@/lib/api/contracts/constants/assets";

export const FILE_NAME_SAFE_RE = /[^a-zA-Z0-9._-]+/g;
export const MULTI_DASH_RE = /-+/g;

export const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;
export const FALLBACK_CONTENT_TYPES = ["application/octet-stream"];

export const MAX_SIZE_BY_KIND: Record<ProjectAssetKind, number> = {
  project_thumbnail: 10 * 1024 * 1024,
  ai_generated_image: 20 * 1024 * 1024,
  ai_reference_image: 20 * 1024 * 1024,
  model_source: 500 * 1024 * 1024,
  texture_image: 50 * 1024 * 1024,
  environment_image: 100 * 1024 * 1024,
  video_clip: 500 * 1024 * 1024
};

export const CONTENT_TYPES_BY_KIND: Record<ProjectAssetKind, string[]> = {
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
  environment_image: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/vnd.radiance",
    "image/exr",
    "image/x-exr",
    "application/exr",
    "application/x-exr",
    "application/octet-stream"
  ],
  video_clip: ["video/mp4", "video/webm", "video/quicktime"]
};
