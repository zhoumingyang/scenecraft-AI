import type { EditorProjectModel } from "./models";

type StudioSceneEligibilityResult = {
  valid: boolean;
  hasRenderableEntity: boolean;
};

function inspectStudioSceneGroup(
  projectModel: EditorProjectModel,
  groupId: string
): StudioSceneEligibilityResult {
  let hasRenderableEntity = false;

  for (const childId of projectModel.listDirectChildren(groupId)) {
    const childRecord = projectModel.getEntityById(childId);
    if (!childRecord) {
      return { valid: false, hasRenderableEntity };
    }

    if (childRecord.kind === "model" || childRecord.kind === "mesh") {
      hasRenderableEntity = true;
      continue;
    }

    if (childRecord.kind === "group") {
      const childResult = inspectStudioSceneGroup(projectModel, childRecord.item.id);
      if (!childResult.valid) {
        return childResult;
      }
      hasRenderableEntity = hasRenderableEntity || childResult.hasRenderableEntity;
      continue;
    }

    return { valid: false, hasRenderableEntity };
  }

  return { valid: hasRenderableEntity, hasRenderableEntity };
}

export function isStudioScenePreviewEntity(
  projectModel: EditorProjectModel,
  entityId: string
) {
  const record = projectModel.getEntityById(entityId);
  if (!record) return false;
  if (record.kind === "model" || record.kind === "mesh") return true;
  if (record.kind !== "group") return false;
  return inspectStudioSceneGroup(projectModel, record.item.id).valid;
}
