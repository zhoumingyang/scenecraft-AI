import type { EditorCameraJSON } from "./camera";
import type { EditorEnvConfigJSON } from "./environment";
import type { EditorGroupJSON } from "./group";
import type { EditorLightJSON } from "./light";
import type { EditorMeshJSON } from "./mesh";
import type { EditorModelJSON } from "./model";

export type EditorProjectMetaJSON = {
  title: string;
  description?: string;
  tags?: string[];
};

export type ProjectAssetRefJSON = {
  assetId: string;
  url: string;
  mimeType?: string;
  originalName?: string;
  sizeBytes?: number | null;
};

export type EditorProjectThumbnailJSON = ProjectAssetRefJSON & {
  width: number;
  height: number;
  capturedAt: string;
  camera: EditorCameraJSON;
};

export type ProjectAiImageResultJSON = ProjectAssetRefJSON & {
  id: string;
  appliedMeshIds?: string[];
};

export type ProjectAiGenerationMetadataJSON = {
  kind?: "pbr_texture_atlas" | "panorama";
  atlasLayoutVersion?: number;
  targetKind?: "mesh" | "ground";
  targetId?: string | null;
};

export type ProjectAiImageGenerationJSON = {
  id: string;
  createdAt: string;
  prompt: string;
  model: string;
  seed?: number | null;
  imageSize?: string;
  cfg: number;
  inferenceSteps: number;
  traceId?: string | null;
  referenceImages?: ProjectAssetRefJSON[];
  results: ProjectAiImageResultJSON[];
  metadata?: ProjectAiGenerationMetadataJSON | null;
};

export type ProjectAiLibraryV1JSON = {
  version: 1;
  imageGenerations: ProjectAiImageGenerationJSON[];
};

export type ProjectAiAssetKindJSON = "image" | "pbr_atlas" | "panorama";

export type ProjectAiAssetBaseJSON = ProjectAssetRefJSON & {
  id: string;
  kind: ProjectAiAssetKindJSON;
  createdAt: string;
  prompt: string;
  model: string;
  seed?: number | null;
  imageSize?: string;
  cfg?: number;
  inferenceSteps?: number;
  traceId?: string | null;
  referenceImages?: ProjectAssetRefJSON[];
  appliedMeshIds?: string[];
};

export type ProjectAiImageAssetJSON = ProjectAiAssetBaseJSON & {
  kind: "image";
};

export type ProjectAiPbrAtlasAssetJSON = ProjectAiAssetBaseJSON & {
  kind: "pbr_atlas";
  atlasLayoutVersion?: number;
  targetKind?: "mesh" | "ground";
  targetId?: string | null;
};

export type ProjectAiPanoramaAssetJSON = ProjectAiAssetBaseJSON & {
  kind: "panorama";
  width?: number;
  height?: number;
  targetPath: "env:pano";
};

export type ProjectAiAssetJSON =
  | ProjectAiImageAssetJSON
  | ProjectAiPbrAtlasAssetJSON
  | ProjectAiPanoramaAssetJSON;

export type ProjectAiLibraryV2JSON = {
  version: 2;
  assets: ProjectAiAssetJSON[];
};

export type ProjectAiLibraryJSON = ProjectAiLibraryV1JSON | ProjectAiLibraryV2JSON;

export type EditorProjectJSON = {
  id: string;
  meta?: EditorProjectMetaJSON;
  thumbnail?: EditorProjectThumbnailJSON;
  envConfig?: EditorEnvConfigJSON;
  model?: EditorModelJSON[];
  mesh?: EditorMeshJSON[];
  light?: EditorLightJSON[];
  groups?: EditorGroupJSON[];
  camera?: EditorCameraJSON;
};
