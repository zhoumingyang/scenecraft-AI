import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import type { EditorProjectJSON, SyncSource } from "../core/types";
import type { EditorProjectModel } from "../models";
import type { EditorRuntime } from "../runtime/editorRuntime";
import {
  getStudioScenePreset,
  type StudioScenePresetId,
  type StudioSceneVariantId
} from "../studioScenes";
import { resolveStudioSceneStyleProfile } from "../studioSceneProfiles";
import {
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
  clearStudioScene,
  enterStudioScene
} from "./studioSceneSession/lifecycle";
import {
  canUseStudioSceneEntityAction,
  isStudioSceneEntityInteractive
} from "./studioSceneSession/policy";
import { StudioSceneTransientEntityManager } from "./studioSceneSession/transientEntityManager";
import {
  autoMatchStudioStyle,
  resetStudioGeneratedLayout,
  resetStudioLighting,
  setStudioPlinthKind,
  setStudioPreset,
  setStudioVariant
} from "./studioSceneSession/styleMutations";
import {
  resetStudioTargetTransform,
  updateStudioTargetTransform
} from "./studioSceneSession/targetTransformMutations";
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
    if (this.activeSession) {
      this.exit(source);
    }

    if (this.hasEntityIsolation()) {
      this.clearEntityIsolation(source);
    }

    return enterStudioScene({
      deps: {
        runtime: this.runtime,
        registry: this.registry,
        emit: this.emit,
        getProjectModel: this.getProjectModel,
        setSelectedEntity: this.setSelectedEntity,
        transientEntityManager: this.transientEntityManager,
        setActiveSession: (session) => {
          this.activeSession = session;
        },
        applyStyleProfileToSceneEnv: (
          styleProfile,
          nextSource
        ) => applyStudioStyleProfileToSceneEnv(this.getEnvironmentDeps(), styleProfile, nextSource),
        applyStudioIbl: (session, styleProfile, nextSource) =>
          this.applyStudioIbl(session, styleProfile, nextSource),
        emitChanged: () => this.emitChanged()
      },
      entityId,
      options,
      source
    });
  }

  setPreset(presetId: StudioScenePresetId) {
    if (!setStudioPreset({
      deps: this.getStyleMutationDeps(),
      session: this.activeSession,
      presetId
    })) {
      this.exit("ui");
    }
  }

  autoMatchStyle() {
    if (!autoMatchStudioStyle({
      deps: this.getStyleMutationDeps(),
      session: this.activeSession
    })) {
      this.exit("ui");
    }
  }

  setVariant(variantId: StudioSceneVariantId) {
    if (!setStudioVariant({
      deps: this.getStyleMutationDeps(),
      session: this.activeSession,
      variantId
    })) {
      this.exit("ui");
    }
  }

  setPlinthKind(plinthKind: StudioPlinthKind) {
    if (!setStudioPlinthKind({
      deps: this.getStyleMutationDeps(),
      session: this.activeSession,
      plinthKind
    })) {
      this.exit("ui");
    }
  }

  resetGeneratedLayout() {
    if (!resetStudioGeneratedLayout({
      deps: this.getStyleMutationDeps(),
      session: this.activeSession
    })) {
      this.exit("ui");
    }
  }

  resetLighting() {
    if (!resetStudioLighting({
      deps: this.getStyleMutationDeps(),
      session: this.activeSession
    })) {
      this.exit("ui");
    }
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
    if (!updateStudioTargetTransform({
      session: this.activeSession,
      object: this.activeSession
        ? this.registry.get(this.activeSession.targetEntityId)?.object ?? null
        : null,
      scale: input.scale,
      rotationY: input.rotationY,
      rebuildTransientStudioEntities: (session, preset, frame) =>
        this.rebuildTransientStudioEntities(session, preset, frame),
      emitChanged: () => this.emitChanged()
    })) {
      this.exit("ui");
    }
  }

  resetTargetTransform() {
    if (!resetStudioTargetTransform({
      session: this.activeSession,
      object: this.activeSession
        ? this.registry.get(this.activeSession.targetEntityId)?.object ?? null
        : null,
      rebuildTransientStudioEntities: (session, preset, frame) =>
        this.rebuildTransientStudioEntities(session, preset, frame),
      emitChanged: () => this.emitChanged()
    })) {
      this.exit("ui");
    }
  }

  exit(source: SyncSource = "ui") {
    this.clear(source, true);
  }

  clear(source: SyncSource, emitEvent: boolean) {
    this.hdriRequestId += 1;
    clearStudioScene({
      deps: {
        runtime: this.runtime,
        registry: this.registry,
        emit: this.emit,
        getProjectModel: this.getProjectModel,
        getSelectedEntityId: this.getSelectedEntityId,
        setSelectedEntity: this.setSelectedEntity,
        transientEntityManager: this.transientEntityManager,
        clearActiveSession: () => {
          this.activeSession = null;
        }
      },
      session: this.activeSession,
      source,
      emitEvent
    });
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

  private getStyleMutationDeps() {
    return {
      registry: this.registry,
      runtime: this.runtime,
      emit: this.emit,
      getSelectedEntityId: this.getSelectedEntityId,
      setSelectedEntity: this.setSelectedEntity,
      rebuildGroupHierarchy: this.rebuildGroupHierarchy,
      transientEntityManager: this.transientEntityManager,
      rebuildTransientStudioEntities: (
        session: ActiveStudioSceneSession,
        preset: ReturnType<typeof getStudioScenePreset>,
        frame: StudioTargetFrame
      ) => this.rebuildTransientStudioEntities(session, preset, frame),
      applyStyleProfileToSceneEnv: (
        styleProfile: ReturnType<typeof resolveStudioSceneStyleProfile>,
        source: SyncSource
      ) => applyStudioStyleProfileToSceneEnv(this.getEnvironmentDeps(), styleProfile, source),
      applyStudioIbl: (
        session: ActiveStudioSceneSession,
        styleProfile: ReturnType<typeof resolveStudioSceneStyleProfile>,
        source: SyncSource
      ) => this.applyStudioIbl(session, styleProfile, source),
      emitChanged: () => this.emitChanged()
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
