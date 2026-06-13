import type {
  ActiveStudioSceneSession,
  StudioSceneEntityAction,
  StudioTransientEntityRole
} from "./types";

const STUDIO_ENTITY_ACTIONS: Partial<
  Record<StudioTransientEntityRole, ReadonlySet<StudioSceneEntityAction>>
> = {
  root: new Set(["select", "transform"]),
  plinth: new Set(["select", "transform", "material", "rename", "lock"]),
  decoration: new Set([
    "select",
    "transform",
    "material",
    "delete",
    "rename",
    "lock",
    "visibility"
  ]),
  background: new Set([
    "select",
    "transform",
    "material",
    "rename",
    "lock",
    "visibility"
  ]),
  cove: new Set([
    "select",
    "transform",
    "material",
    "rename",
    "lock",
    "visibility"
  ]),
  floor: new Set([
    "select",
    "transform",
    "material",
    "rename",
    "lock",
    "visibility"
  ]),
  backWall: new Set([
    "select",
    "transform",
    "material",
    "rename",
    "lock",
    "visibility"
  ]),
  sideWall: new Set([
    "select",
    "transform",
    "material",
    "rename",
    "lock",
    "visibility"
  ]),
  light: new Set(["select", "transform", "light", "rename", "lock", "visibility"]),
  studioLight: new Set([
    "select",
    "transform",
    "light",
    "delete",
    "rename",
    "lock",
    "visibility"
  ]),
  keyLight: new Set(["select", "transform", "light", "delete", "rename", "lock", "visibility"]),
  keyShadowLight: new Set([
    "select",
    "transform",
    "light",
    "delete",
    "rename",
    "lock",
    "visibility"
  ]),
  fillLight: new Set(["select", "transform", "light", "delete", "rename", "lock", "visibility"]),
  rimLight: new Set(["select", "transform", "light", "delete", "rename", "lock", "visibility"]),
  topLight: new Set(["select", "transform", "light", "delete", "rename", "lock", "visibility"]),
  accentLight: new Set([
    "select",
    "transform",
    "light",
    "delete",
    "rename",
    "lock",
    "visibility"
  ]),
  roomFillLight: new Set([
    "select",
    "transform",
    "light",
    "delete",
    "rename",
    "lock",
    "visibility"
  ]),
  wallWashLight: new Set([
    "select",
    "transform",
    "light",
    "delete",
    "rename",
    "lock",
    "visibility"
  ]),
  ceilingWashLight: new Set([
    "select",
    "transform",
    "light",
    "delete",
    "rename",
    "lock",
    "visibility"
  ]),
  lightModifier: new Set([
    "select",
    "transform",
    "material",
    "delete",
    "rename",
    "lock",
    "visibility"
  ]),
  reflector: new Set([
    "select",
    "transform",
    "material",
    "delete",
    "rename",
    "lock",
    "visibility"
  ]),
  negativeFill: new Set([
    "select",
    "transform",
    "material",
    "delete",
    "rename",
    "lock",
    "visibility"
  ]),
  stripPanel: new Set([
    "select",
    "transform",
    "material",
    "delete",
    "rename",
    "lock",
    "visibility"
  ]),
  userLight: new Set([
    "select",
    "transform",
    "light",
    "delete",
    "rename",
    "lock",
    "visibility"
  ])
};

export function isStudioSceneEntityInteractive(
  session: ActiveStudioSceneSession | null,
  entityId: string
) {
  if (!session) return true;
  return (
    session.transientEntityIds.has(entityId) ||
    session.visibleOriginalEntityIds.has(entityId)
  );
}

export function canUseStudioSceneEntityAction(
  session: ActiveStudioSceneSession | null,
  entityId: string,
  action: StudioSceneEntityAction
) {
  if (!session) return true;

  if (session.visibleOriginalEntityIds.has(entityId)) {
    return action === "select" || (entityId === session.targetEntityId && action === "transform");
  }

  if (!session.transientEntityIds.has(entityId)) {
    return false;
  }

  const role = session.transientEntityRoles.get(entityId);
  if (!role) {
    return action !== "duplicate";
  }

  return STUDIO_ENTITY_ACTIONS[role]?.has(action) ?? action !== "duplicate";
}
