import type { BindingRegistry } from "../../bindings/bindingRegistry";
import type { EditorAppEvent } from "../../core/events";
import type { SyncSource } from "../../core/types";
import type { EditorProjectModel } from "../../models";
import type { EditorRuntime } from "../../runtime/editorRuntime";
import { DEFAULT_STUDIO_SCENE_VARIANT_ID, getStudioScenePreset } from "../../studioScenes";
import { isStudioScenePreviewEntity } from "../../studioSceneEligibility";
import { resolveStudioSceneStyleProfile } from "../../studioSceneProfiles";
import { createStudioColorGradingConfigFromStyleProfile } from "../../studioColorGrading";
import { resolveStudioPlinthKind } from "../../studioSceneLayoutGenerator";
import {
  applyStudioBokehFocusFromDistance,
  frameStudioSceneCamera
} from "./environment";
import {
  captureObjectVisibilitySnapshot,
  captureViewHelperSnapshot,
  collectVisibleIds
} from "./snapshots";
import {
  applyStudioTargetTransform,
  cloneObjectTransform,
  computeStudioFitScale,
  createStudioFrameFromObject,
  restoreObjectTransform
} from "./target";
import { StudioSceneTransientEntityManager } from "./transientEntityManager";
import {
  cloneResolvedEnvConfig,
  createDefaultStudioSceneState,
  type ActiveStudioSceneSession,
  type StudioSceneEnterOptions
} from "./types";

type EnterStudioSceneDeps = {
  runtime: EditorRuntime;
  registry: BindingRegistry;
  emit: (event: EditorAppEvent) => void;
  getProjectModel: () => EditorProjectModel | null;
  setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
  transientEntityManager: StudioSceneTransientEntityManager;
  setActiveSession: (session: ActiveStudioSceneSession) => void;
  applyStyleProfileToSceneEnv: (
    styleProfile: ReturnType<typeof resolveStudioSceneStyleProfile>,
    source: SyncSource
  ) => void;
  applyStudioColorGradingDefaults: (
    session: ActiveStudioSceneSession,
    styleProfile: ReturnType<typeof resolveStudioSceneStyleProfile>
  ) => void;
  applyStudioIbl: (
    session: ActiveStudioSceneSession,
    styleProfile: ReturnType<typeof resolveStudioSceneStyleProfile>,
    source: SyncSource
  ) => void;
  emitChanged: () => void;
};

type ClearStudioSceneDeps = {
  runtime: EditorRuntime;
  registry: BindingRegistry;
  emit: (event: EditorAppEvent) => void;
  getProjectModel: () => EditorProjectModel | null;
  getSelectedEntityId: () => string | null;
  setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
  transientEntityManager: StudioSceneTransientEntityManager;
  clearActiveSession: () => void;
};

export function enterStudioScene(input: {
  deps: EnterStudioSceneDeps;
  entityId: string;
  options: StudioSceneEnterOptions;
  source: SyncSource;
}) {
  const { deps, entityId, options, source } = input;
  const projectModel = deps.getProjectModel();
  if (!projectModel) return false;
  const record = projectModel.getEntityById(entityId);
  const binding = deps.registry.get(entityId);
  if (
    !record ||
    !binding ||
    !isStudioScenePreviewEntity(projectModel, entityId) ||
    record.item.locked ||
    !projectModel.isEntityEffectivelyVisible(entityId)
  ) {
    return false;
  }

  const productProfile = options.productProfile;
  const styleProfile = resolveStudioSceneStyleProfile(
    productProfile,
    options.styleProfileId ?? null
  );
  const resolvedPresetId = styleProfile.id;
  const preset = getStudioScenePreset(resolvedPresetId);
  const plinthKind = resolveStudioPlinthKind(
    styleProfile.layout.plinth.type,
    DEFAULT_STUDIO_SCENE_VARIANT_ID
  );
  const objectVisibilitySnapshot = captureObjectVisibilitySnapshot(deps.registry);
  const viewHelperSnapshot = captureViewHelperSnapshot(deps.runtime);
  const targetTransformSnapshot = cloneObjectTransform(binding.object);
  const sceneEnvConfigSnapshot = cloneResolvedEnvConfig(projectModel.envConfig);
  const studioColorGradingDefaultConfig =
    createStudioColorGradingConfigFromStyleProfile(styleProfile);
  const targetFrame = createStudioFrameFromObject(binding.object);
  const defaultTargetScale = computeStudioFitScale(targetFrame);
  const keepVisibleIds = collectVisibleIds(projectModel, entityId);

  deps.registry.list().forEach((entry) => {
    entry.object.visible =
      entry.kind === "light"
        ? false
        : keepVisibleIds.has(entry.model.id) &&
          (objectVisibilitySnapshot.find(
            (item) => item.entityId === entry.model.id
          )?.visible ?? true);
  });

  deps.runtime.setGridHelperVisible(false);
  deps.runtime.setTransformGizmoVisible(true);
  deps.runtime.setLightHelpersVisible(false);
  deps.runtime.setShadowEnabled(true);

  const nextSession: ActiveStudioSceneSession = {
    targetEntityId: entityId,
    presetId: resolvedPresetId,
    variantId: DEFAULT_STUDIO_SCENE_VARIANT_ID,
    productProfile,
    styleProfileId: resolvedPresetId,
    styleSelectionMode: options.styleProfileId ? "manual" : "auto",
    plinthKind,
    targetScale: defaultTargetScale,
    targetRotationY: 0,
    hdriStatus: "idle",
    hdriError: null,
    objectVisibilitySnapshot,
    viewHelperSnapshot,
    targetTransformSnapshot,
    sceneEnvConfigSnapshot,
    studioColorGradingConfig: { ...studioColorGradingDefaultConfig },
    studioColorGradingDefaultConfig,
    studioPostProcessingDirty: false,
    targetFrame,
    defaultTargetScale,
    visibleOriginalEntityIds: keepVisibleIds,
    transientEntityIds: new Set(),
    transientLayoutEntityIds: new Set(),
    transientLightingEntityIds: new Set(),
    transientRootGroupId: null,
    transientEntityRoles: new Map(),
    transientEntityMetadata: new Map()
  };

  const studioFrame = applyStudioTargetTransform(
    binding.object,
    targetTransformSnapshot,
    targetFrame,
    defaultTargetScale,
    0
  );
  deps.setActiveSession(nextSession);
  deps.applyStyleProfileToSceneEnv(styleProfile, source);
  deps.applyStudioColorGradingDefaults(nextSession, styleProfile);
  void deps.applyStudioIbl(nextSession, styleProfile, source);
  deps.transientEntityManager.createTransientStudioEntities(nextSession, studioFrame);
  const focusDistance = frameStudioSceneCamera(deps.runtime, preset, studioFrame);
  applyStudioBokehFocusFromDistance(deps, styleProfile, focusDistance, source);
  deps.setSelectedEntity(entityId, source);
  deps.emitChanged();
  return true;
}

export function clearStudioScene(input: {
  deps: ClearStudioSceneDeps;
  session: ActiveStudioSceneSession | null;
  source: SyncSource;
  emitEvent: boolean;
}) {
  const { deps, session, source, emitEvent } = input;
  if (!session) return;

  const binding = deps.registry.get(session.targetEntityId);
  if (binding) {
    restoreObjectTransform(binding.object, session.targetTransformSnapshot);
    deps.registry.syncModelTransformToObject(session.targetEntityId);
  }

  const selectedEntityId = deps.getSelectedEntityId();
  if (selectedEntityId && session.transientEntityIds.has(selectedEntityId)) {
    deps.setSelectedEntity(null, source);
  }
  deps.transientEntityManager.removeTransientStudioEntities(session);

  session.objectVisibilitySnapshot.forEach(({ entityId, visible }) => {
    const entry = deps.registry.get(entityId);
    if (entry) {
      entry.object.visible = visible;
    }
  });
  deps.runtime.setGridHelperVisible(session.viewHelperSnapshot.gridHelper);
  deps.runtime.setTransformGizmoVisible(session.viewHelperSnapshot.transformGizmo);
  deps.runtime.setLightHelpersVisible(session.viewHelperSnapshot.lightHelper);
  deps.runtime.setShadowEnabled(session.viewHelperSnapshot.shadow);
  deps.runtime.applyStudioColorGradingConfig(null);

  const projectModel = deps.getProjectModel();
  if (projectModel) {
    projectModel.envConfig = cloneResolvedEnvConfig(session.sceneEnvConfigSnapshot);
    if (projectModel.envConfig.panoUrl) {
      void deps.runtime
        .setEnvironmentFromUrl(
          projectModel.envConfig.panoUrl,
          projectModel.envConfig.panoAssetName || projectModel.envConfig.panoUrl
        )
        .finally(() => {
          deps.runtime.applyEnvConfig(projectModel.envConfig);
          deps.emit({
            type: "sceneUpdated",
            source,
            pathTraceInvalidation: "environment"
          });
          deps.emit({ type: "viewStateUpdated" });
        });
    } else {
      deps.runtime.clearEnvironment();
    }
    deps.runtime.applyEnvConfig(projectModel.envConfig);
    deps.runtime.applyCameraModel(projectModel.camera);
  }

  deps.clearActiveSession();
  if (emitEvent) {
    deps.emit({
      type: "studioSceneChanged",
      state: createDefaultStudioSceneState()
    });
    deps.emit({ type: "viewStateUpdated" });
  }

  if (source === "ui" && deps.getSelectedEntityId() === session.targetEntityId) {
    deps.setSelectedEntity(session.targetEntityId, source);
  }
}
