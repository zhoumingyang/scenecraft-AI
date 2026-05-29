import type { BindingRegistry } from "../../bindings/bindingRegistry";
import type { EditorAppEvent } from "../../core/events";
import type { SyncSource } from "../../core/types";
import type { EditorRuntime } from "../../runtime/editorRuntime";
import {
  getStudioScenePreset,
  type StudioScenePresetId,
  type StudioSceneVariantId
} from "../../studioScenes";
import { resolveStudioSceneStyleProfile } from "../../studioSceneProfiles";
import { resolveStudioPlinthKind, type StudioPlinthKind } from "../../studioSceneLayoutGenerator";
import { createStudioFrameFromObject } from "./target";
import { StudioSceneTransientEntityManager } from "./transientEntityManager";
import type { ActiveStudioSceneSession, StudioTargetFrame } from "./types";

type RebuildTransientStudioEntities = (
  session: ActiveStudioSceneSession,
  preset: ReturnType<typeof getStudioScenePreset>,
  frame: StudioTargetFrame
) => void;

type StyleMutationDeps = {
  registry: BindingRegistry;
  runtime: EditorRuntime;
  emit: (event: EditorAppEvent) => void;
  getSelectedEntityId: () => string | null;
  setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
  rebuildGroupHierarchy: () => void;
  transientEntityManager: StudioSceneTransientEntityManager;
  rebuildTransientStudioEntities: RebuildTransientStudioEntities;
  applyStyleProfileToSceneEnv: (
    styleProfile: ReturnType<typeof resolveStudioSceneStyleProfile>,
    source: SyncSource
  ) => void;
  applyStudioIbl: (
    session: ActiveStudioSceneSession,
    styleProfile: ReturnType<typeof resolveStudioSceneStyleProfile>,
    source: SyncSource
  ) => void;
  emitChanged: () => void;
};

export function setStudioPreset(input: {
  deps: StyleMutationDeps;
  session: ActiveStudioSceneSession | null;
  presetId: StudioScenePresetId;
}) {
  const { deps, session, presetId } = input;
  if (!session) return false;
  const binding = deps.registry.get(session.targetEntityId);
  if (!binding) return false;

  const preset = getStudioScenePreset(presetId);
  const styleProfile = resolveStudioSceneStyleProfile(
    session.productProfile,
    presetId
  );
  session.presetId = presetId;
  session.styleProfileId = presetId;
  session.styleSelectionMode = "manual";
  session.plinthKind = resolveStudioPlinthKind(
    styleProfile.layout.plinth.type,
    session.variantId
  );
  session.hdriStatus = "idle";
  session.hdriError = null;
  deps.applyStyleProfileToSceneEnv(styleProfile, "ui");
  void deps.applyStudioIbl(session, styleProfile, "ui");
  deps.rebuildTransientStudioEntities(
    session,
    preset,
    createStudioFrameFromObject(binding.object)
  );
  deps.emitChanged();
  return true;
}

export function autoMatchStudioStyle(input: {
  deps: StyleMutationDeps;
  session: ActiveStudioSceneSession | null;
}) {
  const { deps, session } = input;
  if (!session) return false;
  const binding = deps.registry.get(session.targetEntityId);
  if (!binding) return false;

  const styleProfile = resolveStudioSceneStyleProfile(session.productProfile);
  const preset = getStudioScenePreset(styleProfile.id);

  session.presetId = styleProfile.id;
  session.styleProfileId = styleProfile.id;
  session.styleSelectionMode = "auto";
  session.plinthKind = resolveStudioPlinthKind(
    styleProfile.layout.plinth.type,
    session.variantId
  );
  session.hdriStatus = "idle";
  session.hdriError = null;
  deps.applyStyleProfileToSceneEnv(styleProfile, "ui");
  void deps.applyStudioIbl(session, styleProfile, "ui");
  deps.rebuildTransientStudioEntities(
    session,
    preset,
    createStudioFrameFromObject(binding.object)
  );
  deps.emitChanged();
  return true;
}

export function setStudioVariant(input: {
  deps: StyleMutationDeps;
  session: ActiveStudioSceneSession | null;
  variantId: StudioSceneVariantId;
}) {
  const { deps, session, variantId } = input;
  if (!session) return false;
  const binding = deps.registry.get(session.targetEntityId);
  if (!binding) return false;

  session.variantId = variantId;
  session.plinthKind = resolveStudioPlinthKind(
    getStudioScenePreset(session.presetId).layout.plinth.type,
    variantId
  );
  deps.rebuildTransientStudioEntities(
    session,
    getStudioScenePreset(session.presetId),
    createStudioFrameFromObject(binding.object)
  );
  deps.emitChanged();
  return true;
}

export function setStudioPlinthKind(input: {
  deps: StyleMutationDeps;
  session: ActiveStudioSceneSession | null;
  plinthKind: StudioPlinthKind;
}) {
  const { deps, session, plinthKind } = input;
  if (!session) return false;
  const binding = deps.registry.get(session.targetEntityId);
  if (!binding) return false;

  session.plinthKind = plinthKind;
  deps.rebuildTransientStudioEntities(
    session,
    getStudioScenePreset(session.presetId),
    createStudioFrameFromObject(binding.object)
  );
  deps.emitChanged();
  return true;
}

export function resetStudioGeneratedLayout(input: {
  deps: StyleMutationDeps;
  session: ActiveStudioSceneSession | null;
}) {
  const { deps, session } = input;
  if (!session) return false;
  const binding = deps.registry.get(session.targetEntityId);
  if (!binding) return false;

  session.plinthKind = resolveStudioPlinthKind(
    getStudioScenePreset(session.presetId).layout.plinth.type,
    session.variantId
  );
  const selectedEntityId = deps.getSelectedEntityId();
  if (selectedEntityId && session.transientLayoutEntityIds.has(selectedEntityId)) {
    deps.setSelectedEntity(null, "ui");
  }
  deps.transientEntityManager.removeTransientStudioEntityIds(
    session,
    session.transientLayoutEntityIds
  );
  deps.transientEntityManager.createTransientStudioLayoutEntities(
    session,
    createStudioFrameFromObject(binding.object)
  );
  deps.rebuildGroupHierarchy();
  deps.emit({ type: "sceneUpdated", source: "ui", pathTraceInvalidation: "scene" });
  deps.emitChanged();
  return true;
}

export function resetStudioLighting(input: {
  deps: StyleMutationDeps;
  session: ActiveStudioSceneSession | null;
}) {
  const { deps, session } = input;
  if (!session) return false;
  const binding = deps.registry.get(session.targetEntityId);
  if (!binding) return false;

  const selectedEntityId = deps.getSelectedEntityId();
  if (selectedEntityId && session.transientLightingEntityIds.has(selectedEntityId)) {
    deps.setSelectedEntity(null, "ui");
  }
  deps.transientEntityManager.removeTransientStudioEntityIds(
    session,
    session.transientLightingEntityIds
  );
  deps.transientEntityManager.createTransientStudioLightingEntities(
    session,
    createStudioFrameFromObject(binding.object)
  );
  deps.rebuildGroupHierarchy();
  deps.runtime.syncLightHelperVisibility();
  deps.emit({ type: "sceneUpdated", source: "ui", pathTraceInvalidation: "scene" });
  deps.emitChanged();
  return true;
}
