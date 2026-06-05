import type { EditorProjectJSON } from "../../core/types";
import {
  cloneResolvedEnvConfig,
  createDefaultStudioSceneState,
  type ActiveStudioSceneSession
} from "./types";

export function filterTransientEntitiesFromProjectJSON(
  projectJson: EditorProjectJSON,
  session: ActiveStudioSceneSession | null
): EditorProjectJSON {
  if (!session || session.transientEntityIds.size === 0) {
    return projectJson;
  }

  const transientIds = session.transientEntityIds;
  return {
    ...projectJson,
    envConfig: cloneResolvedEnvConfig(session.sceneEnvConfigSnapshot),
    groups: projectJson.groups
      ?.filter((group) => !transientIds.has(group.id))
      .map((group) => ({
        ...group,
        children: group.children.filter(
          (childId) => !transientIds.has(childId)
        )
      })),
    mesh: projectJson.mesh?.filter((mesh) => !transientIds.has(mesh.id)),
    light: projectJson.light?.filter((light) => !transientIds.has(light.id)),
    model: projectJson.model?.filter((model) => !transientIds.has(model.id))
  };
}

export function getStudioSceneControllerState(session: ActiveStudioSceneSession | null) {
  if (!session) {
    return createDefaultStudioSceneState();
  }

  return {
    active: true,
    presetId: session.presetId,
    variantId: session.variantId,
    targetEntityId: session.targetEntityId,
    productProfile: session.productProfile,
    styleProfileId: session.styleProfileId,
    styleSelectionMode: session.styleSelectionMode,
    plinthKind: session.plinthKind,
    targetScale: session.targetScale,
    targetRotationY: session.targetRotationY,
    hdriStatus: session.hdriStatus,
    hdriError: session.hdriError
  };
}
