import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { assets, projects } from "@/db/schema";
import type { SaveProjectRequest } from "@/lib/api/contracts/projects";
import { sanitizeAssetFileName } from "@/lib/server/assets/config";
import { requireDatabase } from "@/lib/server/db/requireDatabase";
import type { EditorMeshMaterialJSON } from "@/render/editor";

const TEXTURE_FIELDS = [
  "diffuseMap",
  "metalnessMap",
  "roughnessMap",
  "normalMap",
  "aoMap",
  "emissiveMap"
] as const;

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

function addAssetId(assetIds: Set<string>, assetId: string | null | undefined) {
  const normalizedAssetId = assetId?.trim();
  if (normalizedAssetId) {
    assetIds.add(normalizedAssetId);
  }
}

function collectMaterialAssetIds(assetIds: Set<string>, material: EditorMeshMaterialJSON | undefined) {
  if (!material) {
    return;
  }

  TEXTURE_FIELDS.forEach((field) => {
    addAssetId(assetIds, material[field]?.assetId);
  });
}

function collectReferencedProjectAssetIds(payload: SaveProjectRequest) {
  const assetIds = new Set<string>();
  const { snapshot, aiSnapshot } = payload;

  addAssetId(assetIds, snapshot.thumbnail?.assetId);
  addAssetId(assetIds, snapshot.envConfig?.panoAssetId);
  collectMaterialAssetIds(assetIds, snapshot.envConfig?.ground?.material);

  snapshot.model?.forEach((model) => {
    addAssetId(assetIds, model.sourceAssetId);
  });

  snapshot.mesh?.forEach((mesh) => {
    collectMaterialAssetIds(assetIds, mesh.material);
  });

  aiSnapshot.imageGenerations.forEach((generation) => {
    generation.referenceImages?.forEach((image) => {
      addAssetId(assetIds, image.assetId);
    });
    generation.results.forEach((image) => {
      addAssetId(assetIds, image.assetId);
    });
  });

  return assetIds;
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
