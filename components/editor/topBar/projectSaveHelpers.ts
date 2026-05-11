import {
  applyUploadedAssetToProjectSnapshot,
  createClientUuid,
  dataUrlToFile,
  projectSnapshotUsesSourceUrl,
  readImageDimensions
} from "@/components/editor/projectPersistence";
import { uploadPreparedAsset } from "@/frontend/api/assets";
import { appApiClient } from "@/frontend/api/client";
import type {
  PrepareAssetUploadRequest,
  UploadedProjectAsset
} from "@/lib/api/contracts/assets";
import type { EditorApp, EditorProjectJSON, ProjectAiImageGenerationJSON, ProjectAiLibraryJSON } from "@/render/editor";
import type { LocalProjectAssetEntry, PendingAiImageGeneration } from "@/stores/editorStore";

export function cloneProjectSnapshot(snapshot: EditorProjectJSON) {
  if (typeof structuredClone === "function") {
    return structuredClone(snapshot);
  }

  return JSON.parse(JSON.stringify(snapshot)) as EditorProjectJSON;
}

async function sourceUrlToFile(sourceUrl: string, fileName: string, fallbackMimeType: string) {
  const parsedUrl = URL.canParse(sourceUrl) ? new URL(sourceUrl) : null;
  if (parsedUrl?.protocol === "https:" || parsedUrl?.protocol === "http:") {
    const response = await appApiClient.post<Blob>(
      "/assets/fetch",
      { url: sourceUrl },
      { responseType: "blob" }
    );
    const blob = response.data;
    return new File([blob], fileName, {
      type: blob.type || fallbackMimeType
    });
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated image: ${response.status}.`);
  }
  const blob = await response.blob();
  return new File([blob], fileName, {
    type: blob.type || fallbackMimeType
  });
}

export async function uploadSceneLocalAssets(
  snapshot: EditorProjectJSON,
  projectId: string,
  localProjectAssets: LocalProjectAssetEntry[]
): Promise<UploadedProjectAsset[]> {
  const usedAssets = localProjectAssets.filter((asset) =>
    projectSnapshotUsesSourceUrl(snapshot, asset.sourceUrl)
  );

  return Promise.all(
    usedAssets.map(async (asset) => {
      const request: PrepareAssetUploadRequest = {
        assetId: createClientUuid("asset"),
        projectId,
        kind: asset.kind,
        fileName: asset.file.name,
        contentType: asset.file.type || "application/octet-stream",
        sizeBytes: asset.file.size,
        metadata: {
          targetPath: asset.targetPath,
          entityId: asset.entityId ?? null
        }
      };
      const uploaded = await uploadPreparedAsset(request, asset.file);
      applyUploadedAssetToProjectSnapshot(snapshot, asset.sourceUrl, uploaded);
      return uploaded;
    })
  );
}

export async function uploadPendingAiGenerations(
  snapshot: EditorProjectJSON,
  projectId: string,
  loadedAiLibrary: ProjectAiLibraryJSON,
  pendingAiImageGenerations: PendingAiImageGeneration[]
): Promise<{ aiSnapshot: ProjectAiLibraryJSON; uploadedAssets: UploadedProjectAsset[] }> {
  if (pendingAiImageGenerations.length === 0) {
    return {
      aiSnapshot: loadedAiLibrary,
      uploadedAssets: []
    };
  }

  const uploadedAssets: UploadedProjectAsset[] = [];
  const savedGenerations: ProjectAiImageGenerationJSON[] = [];

  for (const generation of pendingAiImageGenerations) {
    const uploadedReferenceImages = [];
    for (let index = 0; index < generation.referenceImages.length; index += 1) {
      const image = generation.referenceImages[index];
      const file = await dataUrlToFile(image.dataUrl, image.fileName, image.mimeType);
      const uploaded = await uploadPreparedAsset(
        {
          assetId: createClientUuid("asset"),
          projectId,
          kind: "ai_reference_image",
          fileName: file.name,
          contentType: file.type || image.mimeType,
          sizeBytes: file.size,
          metadata: {
            generationId: generation.id,
            slot: index
          }
        },
        file
      );
      uploadedAssets.push(uploaded);
      uploadedReferenceImages.push({
        assetId: uploaded.assetId,
        url: uploaded.url,
        mimeType: uploaded.mimeType,
        originalName: uploaded.originalName,
        sizeBytes: uploaded.sizeBytes
      });
    }

    const uploadedResults = [];
    for (let index = 0; index < generation.results.length; index += 1) {
      const result = generation.results[index];
      const file = await sourceUrlToFile(result.sourceUrl, result.fileName, result.mimeType);
      const uploaded = await uploadPreparedAsset(
        {
          assetId: createClientUuid("asset"),
          projectId,
          kind: "ai_generated_image",
          fileName: file.name,
          contentType: file.type || result.mimeType,
          sizeBytes: file.size,
          metadata: {
            generationId: generation.id,
            resultId: result.id,
            index
          }
        },
        file
      );
      uploadedAssets.push(uploaded);
      applyUploadedAssetToProjectSnapshot(snapshot, result.sourceUrl, uploaded);
      uploadedResults.push({
        id: result.id,
        assetId: uploaded.assetId,
        url: uploaded.url,
        mimeType: uploaded.mimeType,
        originalName: uploaded.originalName,
        sizeBytes: uploaded.sizeBytes,
        appliedMeshIds: result.appliedMeshIds
      });
    }

    savedGenerations.push({
      id: generation.id,
      createdAt: generation.createdAt,
      prompt: generation.prompt,
      model: generation.model,
      seed: generation.seed,
      imageSize: generation.imageSize,
      cfg: generation.cfg,
      inferenceSteps: generation.inferenceSteps,
      traceId: generation.traceId,
      referenceImages: uploadedReferenceImages,
      results: uploadedResults
    });
  }

  return {
    aiSnapshot: {
      version: 1,
      imageGenerations: [...loadedAiLibrary.imageGenerations, ...savedGenerations]
    },
    uploadedAssets
  };
}

export async function uploadProjectThumbnail(
  app: EditorApp,
  snapshot: EditorProjectJSON,
  projectId: string
): Promise<UploadedProjectAsset> {
  const thumbnailDataUrl = app.captureViewportImage("viewport");
  const dimensions = await readImageDimensions(thumbnailDataUrl);
  const file = await dataUrlToFile(thumbnailDataUrl, `thumbnail-${projectId}.png`);
  const uploaded = await uploadPreparedAsset(
    {
      assetId: createClientUuid("asset"),
      projectId,
      kind: "project_thumbnail",
      fileName: file.name,
      contentType: file.type || "image/png",
      sizeBytes: file.size,
      metadata: {
        width: dimensions.width,
        height: dimensions.height
      }
    },
    file
  );

  snapshot.thumbnail = {
    assetId: uploaded.assetId,
    url: uploaded.url,
    mimeType: uploaded.mimeType,
    originalName: uploaded.originalName,
    sizeBytes: uploaded.sizeBytes,
    width: dimensions.width,
    height: dimensions.height,
    capturedAt: new Date().toISOString(),
    camera: snapshot.camera ?? {}
  };

  return uploaded;
}
