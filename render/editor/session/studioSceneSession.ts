import * as THREE from "three";

import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import type { EditorProjectJSON, SyncSource } from "../core/types";
import type { EditorProjectModel } from "../models";
import type { EditorRuntime } from "../runtime/editorRuntime";
import {
  DEFAULT_STUDIO_SCENE_VARIANT_ID,
  getStudioScenePreset,
  type StudioScenePresetId,
  type StudioSceneVariantId
} from "../studioScenes";
import { isStudioScenePreviewEntity } from "../studioSceneEligibility";
import { resolveStudioSceneStyleProfile } from "../studioSceneProfiles";
import {
  resolveStudioPlinthKind,
  type StudioDecorationKind,
  type StudioPlinthKind
} from "../studioSceneLayoutGenerator";
import {
  addStudioDecoration,
  replaceStudioDecoration
} from "./studioSceneSession/decorations";
import {
  applyStudioIbl,
  applyStudioStyleProfileToSceneEnv,
  frameStudioSceneCamera
} from "./studioSceneSession/environment";
import {
  canUseStudioSceneEntityAction,
  isStudioSceneEntityInteractive
} from "./studioSceneSession/policy";
import {
  captureObjectVisibilitySnapshot,
  captureViewHelperSnapshot,
  collectVisibleIds
} from "./studioSceneSession/snapshots";
import { StudioSceneTransientEntityManager } from "./studioSceneSession/transientEntityManager";
import {
  applyStudioTargetTransform,
  cloneObjectTransform,
  computeStudioFitScale,
  createStudioFrameFromObject,
  restoreObjectTransform,
  STUDIO_TARGET_MAX_SCALE,
  STUDIO_TARGET_MIN_SCALE
} from "./studioSceneSession/target";
import {
  cloneResolvedEnvConfig,
  createDefaultStudioSceneState,
  type ActiveStudioSceneSession,
  type StudioHdriResolveInput,
  type StudioHdriResolveResult,
  type StudioSceneEnterOptions,
  type StudioSceneEntityAction,
  type StudioSceneSessionControllerOptions,
  type StudioTargetFrame,
  type StudioTransientAdoptOptions,
  type StudioTransientEntityRole
} from "./studioSceneSession/types";

export { createDefaultStudioSceneState };
export type {
  StudioHdriResolveInput,
  StudioHdriResolveResult,
  StudioSceneEnterOptions,
  StudioSceneEntityAction,
  StudioTransientEntityRole
};

export class StudioSceneSessionController {
  private readonly runtime: EditorRuntime;
  private readonly registry: BindingRegistry;
  private readonly emit: (event: EditorAppEvent) => void;
  private readonly resolveStudioHdriUrl?: (
    input: StudioHdriResolveInput
  ) => Promise<StudioHdriResolveResult | null>;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private readonly getSelectedEntityId: () => string | null;
  private readonly hasEntityIsolation: () => boolean;
  private readonly clearEntityIsolation: (source: SyncSource) => void;
  private readonly setSelectedEntity: (
    entityId: string | null,
    source: SyncSource
  ) => void;
  private readonly rebuildGroupHierarchy: () => void;
  private readonly transientEntityManager: StudioSceneTransientEntityManager;
  private activeSession: ActiveStudioSceneSession | null = null;
  private hdriRequestId = 0;

  constructor({
    runtime,
    registry,
    emit,
    resolveStudioHdriUrl,
    getProjectModel,
    getSelectedEntityId,
    hasEntityIsolation,
    clearEntityIsolation,
    setSelectedEntity,
    rebuildGroupHierarchy
  }: StudioSceneSessionControllerOptions) {
    this.runtime = runtime;
    this.registry = registry;
    this.emit = emit;
    this.resolveStudioHdriUrl = resolveStudioHdriUrl;
    this.getProjectModel = getProjectModel;
    this.getSelectedEntityId = getSelectedEntityId;
    this.hasEntityIsolation = hasEntityIsolation;
    this.clearEntityIsolation = clearEntityIsolation;
    this.setSelectedEntity = setSelectedEntity;
    this.rebuildGroupHierarchy = rebuildGroupHierarchy;
    this.transientEntityManager = new StudioSceneTransientEntityManager({
      registry,
      runtime,
      emit,
      emitChanged: () => this.emitChanged(),
      getProjectModel,
      rebuildGroupHierarchy
    });
  }

  isActive() {
    return Boolean(this.activeSession);
  }

  isTargetEntity(entityId: string) {
    return this.activeSession?.targetEntityId === entityId;
  }

  isTransientStudioEntity(entityId: string) {
    return this.activeSession?.transientEntityIds.has(entityId) ?? false;
  }

  isStudioSceneEntityInteractive(entityId: string) {
    return isStudioSceneEntityInteractive(this.activeSession, entityId);
  }

  canUseStudioSceneEntityAction(
    entityId: string,
    action: StudioSceneEntityAction
  ) {
    return canUseStudioSceneEntityAction(this.activeSession, entityId, action);
  }

  getTransientStudioEntityRole(entityId: string) {
    return this.activeSession?.transientEntityRoles.get(entityId) ?? null;
  }

  getSelectedStudioEntityRole(entityId: string | null) {
    return entityId ? this.getTransientStudioEntityRole(entityId) : null;
  }

  getTransientStudioEntityIds() {
    return this.activeSession
      ? Array.from(this.activeSession.transientEntityIds)
      : [];
  }

  adoptTransientStudioEntity(
    entityId: string,
    role: StudioTransientEntityRole,
    options: StudioTransientAdoptOptions = {}
  ) {
    const session = this.activeSession;
    if (!session) return false;
    return this.transientEntityManager.adoptTransientStudioEntity(
      session,
      entityId,
      role,
      options
    );
  }

  filterTransientEntitiesFromProjectJSON(
    projectJson: EditorProjectJSON
  ): EditorProjectJSON {
    const session = this.activeSession;
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

  getState() {
    if (!this.activeSession) {
      return createDefaultStudioSceneState();
    }

    return {
      active: true,
      presetId: this.activeSession.presetId,
      variantId: this.activeSession.variantId,
      targetEntityId: this.activeSession.targetEntityId,
      productProfile: this.activeSession.productProfile,
      styleProfileId: this.activeSession.styleProfileId,
      styleSelectionMode: this.activeSession.styleSelectionMode,
      plinthKind: this.activeSession.plinthKind,
      targetScale: this.activeSession.targetScale,
      targetRotationY: this.activeSession.targetRotationY,
      hdriStatus: this.activeSession.hdriStatus,
      hdriError: this.activeSession.hdriError
    };
  }

  async enter(
    entityId: string,
    options: StudioSceneEnterOptions,
    source: SyncSource = "ui"
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return false;
    const record = projectModel.getEntityById(entityId);
    const binding = this.registry.get(entityId);
    if (
      !record ||
      !binding ||
      !isStudioScenePreviewEntity(projectModel, entityId) ||
      record.item.locked ||
      !projectModel.isEntityEffectivelyVisible(entityId)
    ) {
      return false;
    }

    if (this.activeSession) {
      this.exit(source);
    }

    if (this.hasEntityIsolation()) {
      this.clearEntityIsolation(source);
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
    const objectVisibilitySnapshot = captureObjectVisibilitySnapshot(this.registry);
    const viewHelperSnapshot = captureViewHelperSnapshot(this.runtime);
    const targetTransformSnapshot = cloneObjectTransform(binding.object);
    const sceneEnvConfigSnapshot = cloneResolvedEnvConfig(projectModel.envConfig);
    const targetFrame = createStudioFrameFromObject(binding.object);
    const defaultTargetScale = computeStudioFitScale(targetFrame);
    const keepVisibleIds = collectVisibleIds(projectModel, entityId);

    this.registry.list().forEach((entry) => {
      entry.object.visible =
        entry.kind === "light"
          ? false
          : keepVisibleIds.has(entry.model.id) &&
            (objectVisibilitySnapshot.find(
              (item) => item.entityId === entry.model.id
            )?.visible ?? true);
    });

    this.runtime.setGridHelperVisible(false);
    this.runtime.setTransformGizmoVisible(true);
    this.runtime.setLightHelpersVisible(false);
    this.runtime.setShadowEnabled(true);

    this.activeSession = {
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
      targetFrame,
      defaultTargetScale,
      visibleOriginalEntityIds: keepVisibleIds,
      transientEntityIds: new Set(),
      transientLayoutEntityIds: new Set(),
      transientLightingEntityIds: new Set(),
      transientRootGroupId: null,
      transientEntityRoles: new Map()
    };

    const studioFrame = applyStudioTargetTransform(
      binding.object,
      targetTransformSnapshot,
      targetFrame,
      defaultTargetScale,
      0
    );
    applyStudioStyleProfileToSceneEnv(this.getEnvironmentDeps(), styleProfile, source);
    void this.applyStudioIbl(this.activeSession, styleProfile, source);
    this.transientEntityManager.createTransientStudioEntities(
      this.activeSession,
      studioFrame
    );
    frameStudioSceneCamera(this.runtime, preset, studioFrame);
    this.setSelectedEntity(entityId, source);
    this.emitChanged();
    return true;
  }

  setPreset(presetId: StudioScenePresetId) {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

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
    applyStudioStyleProfileToSceneEnv(this.getEnvironmentDeps(), styleProfile, "ui");
    void this.applyStudioIbl(session, styleProfile, "ui");
    this.rebuildTransientStudioEntities(
      session,
      preset,
      createStudioFrameFromObject(binding.object)
    );
    this.emitChanged();
  }

  autoMatchStyle() {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

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
    applyStudioStyleProfileToSceneEnv(this.getEnvironmentDeps(), styleProfile, "ui");
    void this.applyStudioIbl(session, styleProfile, "ui");
    this.rebuildTransientStudioEntities(
      session,
      preset,
      createStudioFrameFromObject(binding.object)
    );
    this.emitChanged();
  }

  setVariant(variantId: StudioSceneVariantId) {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    session.variantId = variantId;
    session.plinthKind = resolveStudioPlinthKind(
      getStudioScenePreset(session.presetId).layout.plinth.type,
      variantId
    );
    this.rebuildTransientStudioEntities(
      session,
      getStudioScenePreset(session.presetId),
      createStudioFrameFromObject(binding.object)
    );
    this.emitChanged();
  }

  setPlinthKind(plinthKind: StudioPlinthKind) {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    session.plinthKind = plinthKind;
    this.rebuildTransientStudioEntities(
      session,
      getStudioScenePreset(session.presetId),
      createStudioFrameFromObject(binding.object)
    );
    this.emitChanged();
  }

  resetGeneratedLayout() {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    session.plinthKind = resolveStudioPlinthKind(
      getStudioScenePreset(session.presetId).layout.plinth.type,
      session.variantId
    );
    const selectedEntityId = this.getSelectedEntityId();
    if (selectedEntityId && session.transientLayoutEntityIds.has(selectedEntityId)) {
      this.setSelectedEntity(null, "ui");
    }
    this.transientEntityManager.removeTransientStudioEntityIds(
      session,
      session.transientLayoutEntityIds
    );
    this.transientEntityManager.createTransientStudioLayoutEntities(
      session,
      createStudioFrameFromObject(binding.object)
    );
    this.rebuildGroupHierarchy();
    this.emit({ type: "sceneUpdated", source: "ui", pathTraceInvalidation: "scene" });
    this.emitChanged();
  }

  resetLighting() {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    const selectedEntityId = this.getSelectedEntityId();
    if (
      selectedEntityId &&
      session.transientLightingEntityIds.has(selectedEntityId)
    ) {
      this.setSelectedEntity(null, "ui");
    }
    this.transientEntityManager.removeTransientStudioEntityIds(
      session,
      session.transientLightingEntityIds
    );
    this.transientEntityManager.createTransientStudioLightingEntities(
      session,
      createStudioFrameFromObject(binding.object)
    );
    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();
    this.emit({ type: "sceneUpdated", source: "ui", pathTraceInvalidation: "scene" });
    this.emitChanged();
  }

  setTransientEntityVisible(
    entityId: string,
    visible: boolean,
    source: SyncSource = "ui"
  ) {
    const session = this.activeSession;
    const projectModel = this.getProjectModel();
    if (!session || !projectModel || !session.transientEntityIds.has(entityId)) {
      return false;
    }
    if (!this.canUseStudioSceneEntityAction(entityId, "visibility")) {
      return false;
    }

    const record = projectModel.getEntityById(entityId);
    const binding = this.registry.get(entityId);
    if (!record || !binding) return false;

    if (record.kind !== "light" && "visible" in record.item) {
      record.item.visible = visible;
      binding.applyState?.();
    } else {
      binding.object.visible = visible;
    }

    const selectedEntityId = this.getSelectedEntityId();
    if (selectedEntityId === entityId && !visible) {
      this.setSelectedEntity(null, source);
    }

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: record.kind,
      source
    });
    this.emit({ type: "viewStateUpdated" });
    return true;
  }

  addDecoration(kind: StudioDecorationKind) {
    const session = this.activeSession;
    if (!session) return null;
    if (!this.registry.get(session.targetEntityId)) {
      this.exit("ui");
      return null;
    }
    return addStudioDecoration(this.getDecorationDeps(), session, kind);
  }

  replaceDecoration(entityId: string, kind: StudioDecorationKind) {
    return replaceStudioDecoration({
      deps: this.getDecorationDeps(),
      session: this.activeSession,
      entityId,
      kind,
      getTransientStudioEntityRole: (id) => this.getTransientStudioEntityRole(id)
    });
  }

  updateTargetTransform(input: { scale?: number; rotationY?: number }) {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    const nextScale =
      typeof input.scale === "number" && Number.isFinite(input.scale)
        ? THREE.MathUtils.clamp(
            input.scale,
            STUDIO_TARGET_MIN_SCALE,
            STUDIO_TARGET_MAX_SCALE
          )
        : session.targetScale;
    const nextRotationY =
      typeof input.rotationY === "number" && Number.isFinite(input.rotationY)
        ? input.rotationY
        : session.targetRotationY;
    const nextFrame = applyStudioTargetTransform(
      binding.object,
      session.targetTransformSnapshot,
      session.targetFrame,
      nextScale,
      nextRotationY
    );
    session.targetScale = nextScale;
    session.targetRotationY = nextRotationY;
    this.rebuildTransientStudioEntities(
      session,
      getStudioScenePreset(session.presetId),
      nextFrame
    );
    this.emitChanged();
  }

  resetTargetTransform() {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    const resetFrame = applyStudioTargetTransform(
      binding.object,
      session.targetTransformSnapshot,
      session.targetFrame,
      session.defaultTargetScale,
      0
    );
    session.targetScale = session.defaultTargetScale;
    session.targetRotationY = 0;
    this.rebuildTransientStudioEntities(
      session,
      getStudioScenePreset(session.presetId),
      resetFrame
    );
    this.emitChanged();
  }

  exit(source: SyncSource = "ui") {
    this.clear(source, true);
  }

  clear(source: SyncSource, emitEvent: boolean) {
    const session = this.activeSession;
    if (!session) return;
    this.hdriRequestId += 1;

    const binding = this.registry.get(session.targetEntityId);
    if (binding) {
      restoreObjectTransform(binding.object, session.targetTransformSnapshot);
      this.registry.syncModelTransformToObject(session.targetEntityId);
    }

    const selectedEntityId = this.getSelectedEntityId();
    if (selectedEntityId && session.transientEntityIds.has(selectedEntityId)) {
      this.setSelectedEntity(null, source);
    }
    this.transientEntityManager.removeTransientStudioEntities(session);

    session.objectVisibilitySnapshot.forEach(({ entityId, visible }) => {
      const entry = this.registry.get(entityId);
      if (entry) {
        entry.object.visible = visible;
      }
    });
    this.runtime.setGridHelperVisible(session.viewHelperSnapshot.gridHelper);
    this.runtime.setTransformGizmoVisible(
      session.viewHelperSnapshot.transformGizmo
    );
    this.runtime.setLightHelpersVisible(session.viewHelperSnapshot.lightHelper);
    this.runtime.setShadowEnabled(session.viewHelperSnapshot.shadow);

    const projectModel = this.getProjectModel();
    if (projectModel) {
      projectModel.envConfig = cloneResolvedEnvConfig(
        session.sceneEnvConfigSnapshot
      );
      if (projectModel.envConfig.panoUrl) {
        void this.runtime
          .setEnvironmentFromUrl(
            projectModel.envConfig.panoUrl,
            projectModel.envConfig.panoAssetName || projectModel.envConfig.panoUrl
          )
          .finally(() => {
            this.runtime.applyEnvConfig(projectModel.envConfig);
            this.emit({
              type: "sceneUpdated",
              source,
              pathTraceInvalidation: "environment"
            });
            this.emit({ type: "viewStateUpdated" });
          });
      } else {
        this.runtime.clearEnvironment();
      }
      this.runtime.applyEnvConfig(projectModel.envConfig);
      this.runtime.applyCameraModel(projectModel.camera);
    }

    this.activeSession = null;
    if (emitEvent) {
      this.emit({
        type: "studioSceneChanged",
        state: createDefaultStudioSceneState()
      });
      this.emit({ type: "viewStateUpdated" });
    }

    if (source === "ui" && this.getSelectedEntityId() === session.targetEntityId) {
      this.setSelectedEntity(session.targetEntityId, source);
    }
  }

  private rebuildTransientStudioEntities(
    session: ActiveStudioSceneSession,
    preset: ReturnType<typeof getStudioScenePreset>,
    frame: StudioTargetFrame
  ) {
    const selectedEntityId = this.getSelectedEntityId();
    if (selectedEntityId && session.transientEntityIds.has(selectedEntityId)) {
      this.setSelectedEntity(null, "ui");
    }
    this.transientEntityManager.removeTransientStudioEntities(session);
    this.transientEntityManager.createTransientStudioEntities(session, frame);
    frameStudioSceneCamera(this.runtime, preset, frame);
  }

  private async applyStudioIbl(
    session: ActiveStudioSceneSession,
    styleProfile: ReturnType<typeof resolveStudioSceneStyleProfile>,
    source: SyncSource
  ) {
    const requestId = ++this.hdriRequestId;
    await applyStudioIbl({
      deps: this.getEnvironmentDeps(),
      session,
      styleProfile,
      source,
      requestId,
      getCurrentRequestId: () => this.hdriRequestId,
      isSessionCurrent: (currentSession) => this.activeSession === currentSession,
      resolveStudioHdriUrl: this.resolveStudioHdriUrl,
      emitChanged: () => this.emitChanged()
    });
  }

  private emitChanged() {
    this.emit({
      type: "studioSceneChanged",
      state: this.getState()
    });
    this.emit({ type: "viewStateUpdated" });
  }

  private getEnvironmentDeps() {
    return {
      runtime: this.runtime,
      emit: this.emit,
      getProjectModel: this.getProjectModel
    };
  }

  private getDecorationDeps() {
    return {
      registry: this.registry,
      getProjectModel: this.getProjectModel,
      transientEntityManager: this.transientEntityManager,
      setSelectedEntity: this.setSelectedEntity
    };
  }
}
