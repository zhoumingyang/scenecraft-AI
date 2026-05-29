import type { BindingRegistry } from "../../bindings/bindingRegistry";
import type { EditorProjectModel } from "../../models";
import type { EditorRuntime } from "../../runtime/editorRuntime";
import type {
  StudioObjectVisibilitySnapshot,
  StudioViewHelperSnapshot
} from "./types";

export function captureObjectVisibilitySnapshot(
  registry: BindingRegistry
): StudioObjectVisibilitySnapshot {
  return registry.list().map((binding) => ({
    entityId: binding.model.id,
    visible: binding.object.visible
  }));
}

export function captureViewHelperSnapshot(
  runtime: EditorRuntime
): StudioViewHelperSnapshot {
  return {
    gridHelper: runtime.getGridHelperVisible(),
    transformGizmo: runtime.getTransformGizmoVisible(),
    lightHelper: runtime.getLightHelpersVisible(),
    shadow: runtime.getShadowEnabled()
  };
}

export function collectVisibleIds(
  projectModel: EditorProjectModel | null,
  entityId: string
) {
  const keepVisibleIds = new Set<string>([entityId]);
  if (!projectModel) return keepVisibleIds;

  let currentEntityId = entityId;
  let parentGroupId = projectModel.getParentGroupId(currentEntityId);
  while (parentGroupId) {
    keepVisibleIds.add(parentGroupId);
    currentEntityId = parentGroupId;
    parentGroupId = projectModel.getParentGroupId(currentEntityId);
  }

  const record = projectModel.getEntityById(entityId);
  if (record?.kind === "group") {
    collectGroupDescendantIds(projectModel, entityId, keepVisibleIds);
  }

  return keepVisibleIds;
}

function collectGroupDescendantIds(
  projectModel: EditorProjectModel,
  groupId: string,
  keepVisibleIds: Set<string>
) {
  projectModel.listDirectChildren(groupId).forEach((childId) => {
    const childRecord = projectModel.getEntityById(childId);
    if (!childRecord || childRecord.kind === "light") return;
    keepVisibleIds.add(childId);
    if (childRecord.kind === "group") {
      collectGroupDescendantIds(projectModel, childId, keepVisibleIds);
    }
  });
}
