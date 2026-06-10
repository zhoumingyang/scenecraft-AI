import {
  captureTransientEntityDefaultSnapshot,
  getDefaultAllowDelete,
  getDefaultAllowHide,
  getDefaultGroupKind
} from "./transientEntityMetadata";
import type {
  ActiveStudioSceneSession,
  StudioTransientEntityMetadata,
  StudioTransientEntityRole
} from "./types";
import type { EditorProjectModel } from "../../models";

type RegisterTransientEntityOptions = {
  session: ActiveStudioSceneSession;
  entityId: string;
  role: StudioTransientEntityRole;
  getProjectModel: () => EditorProjectModel | null;
  metadata?: Partial<
    Omit<
      StudioTransientEntityMetadata,
      "entityId" | "role" | "hasDefaultSnapshot" | "defaultSnapshot"
    >
  > & {
    captureDefaultSnapshot?: boolean;
  };
};

export function getStudioSceneEntityMetadata(
  session: ActiveStudioSceneSession | null,
  entityId: string | null
) {
  if (!session || !entityId) return null;
  return session.transientEntityMetadata.get(entityId) ?? null;
}

export function registerTransientEntity({
  session,
  entityId,
  role,
  getProjectModel,
  metadata = {}
}: RegisterTransientEntityOptions) {
  session.transientEntityIds.add(entityId);
  session.transientEntityRoles.set(entityId, role);
  const groupKind = metadata.groupKind ?? getDefaultGroupKind(role);
  const shouldCaptureSnapshot =
    metadata.captureDefaultSnapshot ?? groupKind !== "user";
  const record = shouldCaptureSnapshot
    ? getProjectModel()?.getEntityById(entityId)
    : undefined;
  const defaultSnapshot = record
    ? captureTransientEntityDefaultSnapshot(record)
    : undefined;

  session.transientEntityMetadata.set(entityId, {
    entityId,
    role,
    groupKind,
    allowHide: metadata.allowHide ?? getDefaultAllowHide(role),
    allowDelete: metadata.allowDelete ?? getDefaultAllowDelete(role),
    plinthKind: metadata.plinthKind,
    decorationKind: metadata.decorationKind,
    lightRole: metadata.lightRole,
    modifierRole: metadata.modifierRole,
    hasDefaultSnapshot: Boolean(defaultSnapshot),
    defaultSnapshot
  });
}

type RegisterTransientGroupChildrenOptions = {
  session: ActiveStudioSceneSession;
  groupId: string;
  role: StudioTransientEntityRole;
  getProjectModel: () => EditorProjectModel | null;
  registerEntity: (
    entityId: string,
    role: StudioTransientEntityRole
  ) => void;
  markEntity: (entityId: string, role: StudioTransientEntityRole) => void;
};

export function registerTransientGroupChildren({
  session,
  groupId,
  role,
  getProjectModel,
  registerEntity,
  markEntity
}: RegisterTransientGroupChildrenOptions) {
  const projectModel = getProjectModel();
  if (!projectModel) return;

  projectModel.listDirectChildren(groupId).forEach((childId) => {
    const childRecord = projectModel.getEntityById(childId);
    if (!childRecord) return;

    const childRole =
      childRecord.kind === "light" && role === "userLightGroup"
        ? "userLight"
        : role;
    registerEntity(childId, childRole);
    markEntity(childId, childRole);

    if (childRecord.kind === "group") {
      registerTransientGroupChildren({
        session,
        groupId: childId,
        role: childRole,
        getProjectModel,
        registerEntity,
        markEntity
      });
    }
  });
}
