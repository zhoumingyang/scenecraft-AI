import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { assets, projects } from "@/db/schema";
import type { SaveProjectRequest } from "@/lib/api/contracts/projects";
import { sanitizeAssetFileName } from "@/lib/server/assets/config";
import { requireDatabase } from "@/lib/server/db/requireDatabase";

type SaveProjectMutationArgs = {
  projectId: string;
  userId: string;
  payload: SaveProjectRequest;
};

type ProjectMutationResult<TProject> = {
  project: TProject;
  deletedAssetObjectKeys: string[];
};

function assertUploadedAssetsBelongToProject({ projectId, userId, payload }: SaveProjectMutationArgs) {
  payload.uploadedAssets?.forEach((asset) => {
    if (asset.projectId !== projectId) {
      throw new Error("Uploaded asset project id must match the project being saved.");
    }

    const expectedObjectKey = [
      "users",
      userId,
      "projects",
      projectId,
      asset.kind,
      `${asset.assetId}-${sanitizeAssetFileName(asset.originalName)}`
    ].join("/");

    if (asset.objectKey !== expectedObjectKey) {
      throw new Error("Uploaded asset object key is invalid for this user and project.");
    }
  });
}

export async function createProject({ projectId, userId, payload }: SaveProjectMutationArgs) {
  const db = requireDatabase();
  assertUploadedAssetsBelongToProject({ projectId, userId, payload });
  const serializedTags = JSON.stringify(payload.snapshot.meta?.tags ?? []);
  const serializedSnapshot = JSON.stringify(payload.snapshot);
  const serializedAiSnapshot = JSON.stringify(payload.aiSnapshot);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(projects)
      .values({
        id: projectId,
        userId,
        title: payload.snapshot.meta!.title,
        description: payload.snapshot.meta?.description ?? null,
        tags: sql`${serializedTags}::jsonb`,
        snapshot: sql`${serializedSnapshot}::jsonb`,
        aiSnapshot: sql`${serializedAiSnapshot}::jsonb`,
        thumbnailAssetId: payload.snapshot.thumbnail?.assetId ?? null,
        version: 1,
        lastOpenedAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

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

    return created;
  });
}

export async function updateProject({ projectId, userId, payload }: SaveProjectMutationArgs) {
  const db = requireDatabase();
  assertUploadedAssetsBelongToProject({ projectId, userId, payload });
  const serializedTags = JSON.stringify(payload.snapshot.meta?.tags ?? []);
  const serializedSnapshot = JSON.stringify(payload.snapshot);
  const serializedAiSnapshot = JSON.stringify(payload.aiSnapshot);
  const nextThumbnailAssetId = payload.snapshot.thumbnail?.assetId ?? null;

  return db.transaction(async (tx): Promise<ProjectMutationResult<typeof projects.$inferSelect | null>> => {
    const [existing] = await tx
      .select({
        thumbnailAssetId: projects.thumbnailAssetId
      })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId), isNull(projects.deletedAt)))
      .limit(1);

    if (!existing) {
      return {
        project: null,
        deletedAssetObjectKeys: []
      };
    }

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
        tags: sql`${serializedTags}::jsonb`,
        snapshot: sql`${serializedSnapshot}::jsonb`,
        aiSnapshot: sql`${serializedAiSnapshot}::jsonb`,
        thumbnailAssetId: nextThumbnailAssetId,
        version: sql`${projects.version} + 1`,
        lastOpenedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId), isNull(projects.deletedAt)))
      .returning();

    const deletedAssetObjectKeys: string[] = [];
    const previousThumbnailAssetId = existing.thumbnailAssetId;
    if (previousThumbnailAssetId && previousThumbnailAssetId !== nextThumbnailAssetId) {
      const deletedThumbnailAssets = await tx
        .delete(assets)
        .where(
          and(
            eq(assets.id, previousThumbnailAssetId),
            eq(assets.userId, userId),
            eq(assets.projectId, projectId),
            eq(assets.kind, "project_thumbnail")
          )
        )
        .returning({
          objectKey: assets.objectKey
        });

      deletedAssetObjectKeys.push(
        ...deletedThumbnailAssets.map((asset) => asset.objectKey)
      );
    }

    return {
      project: updated ?? null,
      deletedAssetObjectKeys
    };
  });
}

export async function deleteProject(projectId: string, userId: string) {
  const db = requireDatabase();

  return db.transaction(async (tx): Promise<ProjectMutationResult<typeof projects.$inferSelect | null>> => {
    const projectAssets = await tx
      .select({
        id: assets.id,
        objectKey: assets.objectKey
      })
      .from(assets)
      .where(and(eq(assets.projectId, projectId), eq(assets.userId, userId)));

    const [deleted] = await tx
      .update(projects)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId), isNull(projects.deletedAt)))
      .returning();

    if (!deleted) {
      return {
        project: null,
        deletedAssetObjectKeys: []
      };
    }

    if (projectAssets.length > 0) {
      await tx.delete(assets).where(inArray(assets.id, projectAssets.map((asset) => asset.id)));
    }

    return {
      project: deleted,
      deletedAssetObjectKeys: projectAssets.map((asset) => asset.objectKey)
    };
  });
}
