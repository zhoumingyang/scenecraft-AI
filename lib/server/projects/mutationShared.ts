import type { SaveProjectRequest } from "@/lib/api/contracts/projects";
import type { requireDatabase } from "@/lib/server/db/requireDatabase";
import { assets } from "@/db/schema";

export type ProjectMutationResult<TProject> = {
  project: TProject;
  deletedAssetObjectKeys: string[];
};

export function serializeProjectPayload(payload: SaveProjectRequest) {
  return {
    serializedTags: JSON.stringify(payload.snapshot.meta?.tags ?? []),
    serializedSnapshot: JSON.stringify(payload.snapshot),
    serializedAiSnapshot: JSON.stringify(payload.aiSnapshot)
  };
}

type InsertUploadedAssetsOptions = {
  tx: Parameters<Parameters<ReturnType<typeof requireDatabase>["transaction"]>[0]>[0];
  payload: SaveProjectRequest;
  projectId: string;
  userId: string;
};

export async function insertUploadedAssetsIfPresent({
  tx,
  payload,
  projectId,
  userId
}: InsertUploadedAssetsOptions) {
  if (!payload.uploadedAssets?.length) {
    return;
  }

  await tx
    .insert(assets)
    .values(
      payload.uploadedAssets.map((asset) => ({
        id: asset.assetId,
        userId,
        projectId,
        kind: asset.kind,
        provider: asset.provider,
        objectKey: asset.objectKey,
        url: asset.url,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        originalName: asset.originalName,
        metadata: asset.metadata ?? null
      }))
    )
    .onConflictDoNothing();
}
