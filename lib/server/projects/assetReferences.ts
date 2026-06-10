import type { SaveProjectRequest } from "@/lib/api/contracts/projects";
import { sanitizeAssetFileName } from "@/lib/server/assets/config";
import type { EditorMeshMaterialJSON } from "@/render/editor";

const TEXTURE_FIELDS = [
  "diffuseMap",
  "metalnessMap",
  "roughnessMap",
  "normalMap",
  "aoMap",
  "emissiveMap"
] as const;

type AssertUploadedAssetsBelongToProjectInput = {
  projectId: string;
  userId: string;
  payload: SaveProjectRequest;
};

function addAssetId(assetIds: Set<string>, assetId: string | null | undefined) {
  const normalizedAssetId = assetId?.trim();
  if (normalizedAssetId) {
    assetIds.add(normalizedAssetId);
  }
}

function collectMaterialAssetIds(
  assetIds: Set<string>,
  material: EditorMeshMaterialJSON | undefined
) {
  if (!material) {
    return;
  }

  TEXTURE_FIELDS.forEach((field) => {
    addAssetId(assetIds, material[field]?.assetId);
  });
}

export function assertUploadedAssetsBelongToProject({
  projectId,
  userId,
  payload
}: AssertUploadedAssetsBelongToProjectInput) {
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

export function collectReferencedProjectAssetIds(payload: SaveProjectRequest) {
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

  if (aiSnapshot.version === 2) {
    aiSnapshot.assets.forEach((asset) => {
      addAssetId(assetIds, asset.assetId);
      asset.referenceImages?.forEach((image) => {
        addAssetId(assetIds, image.assetId);
      });
    });
  } else {
    aiSnapshot.imageGenerations.forEach((generation) => {
      generation.referenceImages?.forEach((image) => {
        addAssetId(assetIds, image.assetId);
      });
      generation.results.forEach((image) => {
        addAssetId(assetIds, image.assetId);
      });
    });
  }

  return assetIds;
}
