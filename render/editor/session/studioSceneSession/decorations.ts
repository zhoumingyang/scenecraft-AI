import type { BindingRegistry } from "../../bindings/bindingRegistry";
import type { EditorProjectModel } from "../../models";
import {
  createStudioBackgroundDescriptors,
  createStudioDecorationDescriptorForKind,
  getStudioDecorationScale,
  type StudioDecorationKind
} from "../../studioSceneLayoutGenerator";
import { resolveStudioSceneStyleProfile } from "../../studioSceneProfiles";
import { createStudioFrameFromObject } from "./target";
import { StudioSceneTransientEntityManager } from "./transientEntityManager";
import type { ActiveStudioSceneSession, StudioTransientEntityRole } from "./types";

type DecorationDeps = {
  registry: BindingRegistry;
  getProjectModel: () => EditorProjectModel | null;
  transientEntityManager: StudioSceneTransientEntityManager;
  setSelectedEntity: (entityId: string | null, source: "ui") => void;
};

export function addStudioDecoration(
  deps: DecorationDeps,
  session: ActiveStudioSceneSession | null,
  kind: StudioDecorationKind
) {
  if (!session) return null;
  const binding = deps.registry.get(session.targetEntityId);
  if (!binding) {
    return null;
  }

  const decorationCount = Array.from(session.transientEntityRoles.values()).filter(
    (role) => role === "decoration"
  ).length;
  if (decorationCount >= 5) return null;

  const frame = createStudioFrameFromObject(binding.object);
  const styleProfile = resolveStudioSceneStyleProfile(
    session.productProfile,
    session.presetId
  );
  const backgroundLayout = createStudioBackgroundDescriptors({
    styleProfile,
    variantId: session.variantId,
    productProfile: session.productProfile,
    targetFrame: {
      center: [frame.center.x, frame.center.y, frame.center.z],
      radius: frame.radius,
      footprintRadius: frame.footprintRadius,
      height: frame.height,
      floorY: frame.floorY
    }
  });
  const bounds = backgroundLayout.bounds;
  const position: [number, number, number] = [
    bounds.center[0] + bounds.radius * (decorationCount % 2 === 0 ? -1.25 : 1.25),
    frame.floorY + bounds.radius * (0.48 + decorationCount * 0.08),
    bounds.backZ + bounds.radius * (0.32 + decorationCount * 0.1)
  ];
  const descriptor = createStudioDecorationDescriptorForKind({
    styleProfile,
    kind,
    index: decorationCount,
    position,
    scale: getStudioDecorationScale(kind, bounds.radius)
  });
  return deps.transientEntityManager.addTransientMeshDescriptor(
    session,
    descriptor,
    "ui"
  );
}

export function replaceStudioDecoration(input: {
  deps: DecorationDeps;
  session: ActiveStudioSceneSession | null;
  entityId: string;
  kind: StudioDecorationKind;
  getTransientStudioEntityRole: (entityId: string) => StudioTransientEntityRole | null;
}) {
  const { deps, session, entityId, kind, getTransientStudioEntityRole } = input;
  const projectModel = deps.getProjectModel();
  if (
    !session ||
    !projectModel ||
    getTransientStudioEntityRole(entityId) !== "decoration"
  ) {
    return false;
  }
  const binding = deps.registry.get(entityId);
  const record = projectModel.getEntityById(entityId);
  if (!binding || !record || record.kind !== "mesh") return false;

  deps.registry.syncObjectTransformToModel(entityId);
  const styleProfile = resolveStudioSceneStyleProfile(
    session.productProfile,
    session.presetId
  );
  const descriptor = createStudioDecorationDescriptorForKind({
    styleProfile,
    kind,
    index: 0,
    position: record.item.position,
    scale: record.item.scale
  });

  deps.registry.remove(entityId);
  projectModel.removeEntity(entityId);
  session.transientEntityIds.delete(entityId);
  session.transientLayoutEntityIds.delete(entityId);
  session.transientEntityRoles.delete(entityId);

  const nextId = deps.transientEntityManager.addTransientMeshDescriptor(
    session,
    descriptor,
    "ui"
  );
  if (nextId) {
    deps.setSelectedEntity(nextId, "ui");
  }
  return Boolean(nextId);
}
