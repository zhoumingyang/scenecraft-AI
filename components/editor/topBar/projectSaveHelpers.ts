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
import type {
  EditorApp,
  EditorProjectJSON,
  ProjectAiAssetJSON,
  ProjectAiLibraryV2JSON
} from "@/render/editor";
import type { LocalProjectAssetEntry, PendingAiAsset } from "@/stores/editorStore";

type UploadTrackingOptions = {
  onUploaded?: (asset: UploadedProjectAsset) => void;
};

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
  localProjectAssets: LocalProjectAssetEntry[],
  options: UploadTrackingOptions = {}
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
      options.onUploaded?.(uploaded);
      applyUploadedAssetToProjectSnapshot(snapshot, asset.sourceUrl, uploaded);
      return uploaded;
    })
  );
}

export async function uploadPendingAiAssets(
  snapshot: EditorProjectJSON,
  projectId: string,
  loadedAiLibrary: ProjectAiLibraryV2JSON,
  pendingAiAssets: PendingAiAsset[],
  options: UploadTrackingOptions = {}
): Promise<{ aiSnapshot: ProjectAiLibraryV2JSON; uploadedAssets: UploadedProjectAsset[] }> {
  if (pendingAiAssets.length === 0) {
    return {
      aiSnapshot: loadedAiLibrary,
      uploadedAssets: []
    };
  }

  const uploadedAssets: UploadedProjectAsset[] = [];
  const savedAssets: ProjectAiAssetJSON[] = [];

  for (const asset of pendingAiAssets) {
    const uploadedReferenceImages = [];
    for (let index = 0; index < asset.referenceImages.length; index += 1) {
      const image = asset.referenceImages[index];
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
            aiAssetId: asset.id,
            slot: index
          }
        },
        file
      );
      options.onUploaded?.(uploaded);
      uploadedAssets.push(uploaded);
      uploadedReferenceImages.push({
        assetId: uploaded.assetId,
        url: uploaded.url,
        mimeType: uploaded.mimeType,
        originalName: uploaded.originalName,
        sizeBytes: uploaded.sizeBytes
      });
    }

    const file = await sourceUrlToFile(asset.sourceUrl, asset.fileName, asset.mimeType);
    const uploaded = await uploadPreparedAsset(
      {
        assetId: createClientUuid("asset"),
        projectId,
        kind: "ai_generated_image",
        fileName: file.name,
        contentType: file.type || asset.mimeType,
        sizeBytes: file.size,
        metadata: {
          aiAssetId: asset.id,
          aiAssetKind: asset.kind,
          targetPath: asset.targetPath ?? null
        }
      },
      file
    );
    options.onUploaded?.(uploaded);
    uploadedAssets.push(uploaded);
    applyUploadedAssetToProjectSnapshot(snapshot, asset.sourceUrl, uploaded);

    const savedBase = {
      id: asset.id,
      createdAt: asset.createdAt,
      prompt: asset.prompt,
      model: asset.model,
      seed: asset.seed,
      imageSize: asset.imageSize,
      cfg: asset.cfg,
      inferenceSteps: asset.inferenceSteps,
      traceId: asset.traceId,
      referenceImages: uploadedReferenceImages,
      assetId: uploaded.assetId,
      url: uploaded.url,
      mimeType: uploaded.mimeType,
      originalName: uploaded.originalName,
      sizeBytes: uploaded.sizeBytes,
      appliedMeshIds: asset.appliedMeshIds
    };

    if (asset.kind === "pbr_atlas") {
      savedAssets.push({
        ...savedBase,
        kind: "pbr_atlas",
        atlasLayoutVersion: asset.atlasLayoutVersion,
        targetKind: asset.targetKind,
        targetId: asset.targetId
      });
    } else if (asset.kind === "panorama") {
      savedAssets.push({
        ...savedBase,
        kind: "panorama",
        width: asset.width,
        height: asset.height,
        targetPath: "env:pano"
      });
    } else {
      savedAssets.push({
        ...savedBase,
        kind: "image"
      });
    }
  }

  return {
    aiSnapshot: {
      version: 2,
      assets: [...loadedAiLibrary.assets, ...savedAssets]
    },
    uploadedAssets
  };
}

export async function uploadProjectThumbnail(
  app: EditorApp,
  snapshot: EditorProjectJSON,
  projectId: string,
  options: UploadTrackingOptions = {}
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
  options.onUploaded?.(uploaded);

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
