import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { assets, projects } from "@/db/schema";
import type { SaveProjectRequest } from "@/lib/api/contracts/projects";
import { requireDatabase } from "@/lib/server/db/requireDatabase";
import {
  assertUploadedAssetsBelongToProject,
  collectReferencedProjectAssetIds
} from "./assetReferences";
import {
  insertUploadedAssetsIfPresent,
  serializeProjectPayload,
  type ProjectMutationResult
} from "./mutationShared";

type SaveProjectMutationArgs = {
  projectId: string;
  userId: string;
  payload: SaveProjectRequest;
};

export async function createProject({ projectId, userId, payload }: SaveProjectMutationArgs) {
  const db = requireDatabase();
  assertUploadedAssetsBelongToProject({ projectId, userId, payload });
  const { serializedTags, serializedSnapshot, serializedAiSnapshot } =
    serializeProjectPayload(payload);

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

    await insertUploadedAssetsIfPresent({ tx, payload, projectId, userId });

    return created;
  });
}

export async function updateProject({ projectId, userId, payload }: SaveProjectMutationArgs) {
  const db = requireDatabase();
  assertUploadedAssetsBelongToProject({ projectId, userId, payload });
  const { serializedTags, serializedSnapshot, serializedAiSnapshot } =
    serializeProjectPayload(payload);
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

    await insertUploadedAssetsIfPresent({ tx, payload, projectId, userId });

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
    const referencedAssetIds = collectReferencedProjectAssetIds(payload);
    const projectAssets = await tx
      .select({
        id: assets.id,
        objectKey: assets.objectKey
      })
      .from(assets)
      .where(and(eq(assets.userId, userId), eq(assets.projectId, projectId)));
    const unreferencedAssets = projectAssets.filter((asset) => !referencedAssetIds.has(asset.id));

    if (unreferencedAssets.length > 0) {
      const deletedAssets = await tx
        .delete(assets)
        .where(inArray(assets.id, unreferencedAssets.map((asset) => asset.id)))
        .returning({
          objectKey: assets.objectKey
        });

      deletedAssetObjectKeys.push(
        ...deletedAssets.map((asset) => asset.objectKey)
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
