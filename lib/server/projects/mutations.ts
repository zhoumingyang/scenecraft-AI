import { and, eq, sql } from "drizzle-orm";
import { assets, projects } from "@/db/schema";
import type { SaveProjectRequest } from "@/lib/api/contracts/projects";
import { requireDatabase } from "@/lib/server/db/requireDatabase";

type SaveProjectMutationArgs = {
  projectId: string;
  userId: string;
  payload: SaveProjectRequest;
};

export async function createProject({ projectId, userId, payload }: SaveProjectMutationArgs) {
  const db = requireDatabase();

  return db.transaction(async (tx) => {
    if (payload.uploadedAssets?.length) {
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

    const [created] = await tx
      .insert(projects)
      .values({
        id: projectId,
        userId,
        title: payload.snapshot.meta!.title,
        description: payload.snapshot.meta?.description ?? null,
        tags: payload.snapshot.meta?.tags ?? [],
        snapshot: payload.snapshot,
        aiSnapshot: payload.aiSnapshot,
        thumbnailAssetId: payload.snapshot.thumbnail?.assetId ?? null,
        version: 1,
        lastOpenedAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return created;
  });
}

export async function updateProject({ projectId, userId, payload }: SaveProjectMutationArgs) {
  const db = requireDatabase();

  return db.transaction(async (tx) => {
    if (payload.uploadedAssets?.length) {
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

    const [updated] = await tx
      .update(projects)
      .set({
        title: payload.snapshot.meta!.title,
        description: payload.snapshot.meta?.description ?? null,
        tags: payload.snapshot.meta?.tags ?? [],
        snapshot: payload.snapshot,
        aiSnapshot: payload.aiSnapshot,
        thumbnailAssetId: payload.snapshot.thumbnail?.assetId ?? null,
        version: sql`${projects.version} + 1`,
        lastOpenedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .returning();

    return updated ?? null;
  });
}
