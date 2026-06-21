import * as THREE from "three";

import type { Ai3DPlan } from "../ai3d/plan";
import type { EditorCommand, MeshMaterialPatch } from "../core/commands";
import type {
  EditorCameraJSON,
  EditorEnvConfigJSON,
  EditorGroundConfigJSON,
  EditorLightJSON,
  LightingConflictState,
  EditorProjectJSON,
  StudioSceneState,
  SyncSource,
  TransformPatch
} from "../core/types";
import type { EditorAppEvent } from "../core/events";
import { BindingRegistry } from "../bindings/bindingRegistry";
import { updateMeshBindingMaterial } from "../bindings/meshBinding";
import type { LightPresetFrame, LightPresetId } from "../lightPresets";
import {
  type StudioScenePresetId,
  type StudioSceneVariantId
} from "../studioScenes";
import { EditorProjectModel } from "../models";
import { createEmptyEditorProjectJSON } from "../factories/projectFactory";
import { EditorRuntime } from "../runtime/editorRuntime";
import {
  GROUND_HELPER_NODE_ID,
  SCENE_NODE_ID as SCENE_SELECTION_ID
} from "../core/types";
import { Ai3DPlanSessionController } from "./ai3dPlanSession";
import { Ai3DPreviewSession } from "./ai3dPreviewSession";
import {
  dispatchEditorCommand,
  type EditorCommandHandlers
} from "./commandDispatcher";
import { EntityIsolationSessionController } from "./entityIsolationSession";
import type { EntityDuplicateOptions } from "./entityDuplicator";
import { EntityMutationSessionController } from "./entityMutationSession";
import { createMeshEntityId, createMeshPayload } from "./entityFactories";
import { LightSessionController } from "./lightSession";
import { ModelImportSessionController } from "./modelImportSession";
import { ModelAnimationSessionController } from "./modelAnimationSession";
import {
  createProjectBindings,
  rebuildProjectGroupHierarchy
} from "./projectBindings";
import {
  flushRuntimeStateToProjectModel as flushRenderStateToProjectModel,
  getSerializableProjectJSON,
  syncRenderChangesToModel as syncRenderStateChangesToModel
} from "./renderSync";
import { SceneEnvironmentSessionController } from "./sceneEnvironmentSession";
import { EditorSelectionSessionController } from "./selection";
import {
  StudioSceneSessionController,
  type StudioSceneEntityAction,
  type StudioSceneEnterOptions,
  type StudioHdriResolveInput,
  type StudioHdriResolveResult,
  type StudioScenePostProcessingPatch,
  type StudioTransientEntityRole
} from "./studioSceneSession";
import { suggestStudioProductProfile } from "../studioSceneProfiles";
import type { StudioDecorationKind, StudioPlinthKind } from "../studioSceneLayoutGenerator";

type Emit = (event: EditorAppEvent) => void;

export type EditorSessionOptions = {
  resolveStudioHdriUrl?: (input: StudioHdriResolveInput) => Promise<StudioHdriResolveResult | null>;
};

export class EditorSession {
  private readonly runtime: EditorRuntime;
  private readonly registry: BindingRegistry;
  private readonly emit: Emit;
  private readonly ai3dPlan: Ai3DPlanSessionController;
  private readonly ai3dPreview: Ai3DPreviewSession;
  private readonly entityIsolation: EntityIsolationSessionController;
  private readonly entityMutation: EntityMutationSessionController;
  private readonly lightSession: LightSessionController;
  private readonly sceneEnvironment: SceneEnvironmentSessionController;
  private readonly modelImport: ModelImportSessionController;
  private readonly modelAnimation: ModelAnimationSessionController;
  private readonly studioScene: StudioSceneSessionController;
  private readonly selection: EditorSelectionSessionController;
  private readonly commandHandlers: EditorCommandHandlers;
  private selectedEntityId: string | null = null;

  projectModel: EditorProjectModel | null = null;

  constructor(runtime: EditorRuntime, emit: Emit, options: EditorSessionOptions = {}) {
    this.runtime = runtime;
    this.emit = emit;
    this.registry = new BindingRegistry({
      scene: runtime.scene,
      modelLoaderFactory: runtime.modelLoaderFactory,
      textureLoader: runtime.textureLoader,
      invalidateScene: () => runtime.invalidatePathTraceScene(),
      invalidateMaterials: () => runtime.invalidatePathTraceMaterials(),
      onModelRuntimeStateChanged: (entityId) =>
        emit({
          type: "entityUpdated",
          entityId,
          entityKind: "model",
          source: "render",
          affectsSceneTree: false
        })
    });
    this.ai3dPreview = new Ai3DPreviewSession(runtime, this.registry);
    this.ai3dPlan = new Ai3DPlanSessionController({
      registry: this.registry,
      emit,
      getProjectModel: () => this.projectModel,
      ensureProject: () => this.ensureProject(),
      rebuildGroupHierarchy: () => this.rebuildGroupHierarchy(),
      setSelectedEntity: (entityId, source) => this.setSelectedEntity(entityId, source),
      clearPreview: () => this.clearAi3DPreview()
    });
    this.entityIsolation = new EntityIsolationSessionController({
      registry: this.registry,
      emit,
      getProjectModel: () => this.projectModel,
      getSelectedEntityId: () => this.selectedEntityId,
      setSelectedEntity: (entityId, source) => this.setSelectedEntity(entityId, source)
    });
    this.entityMutation = new EntityMutationSessionController({
      runtime,
      registry: this.registry,
      emit,
      getProjectModel: () => this.projectModel,
      getSelectedEntityId: () => this.selectedEntityId,
      setSelectedEntity: (entityId, source) => this.setSelectedEntity(entityId, source),
      rebuildGroupHierarchy: () => this.rebuildGroupHierarchy(),
      clearEntityIsolation: (source) => this.entityIsolation.clear(source),
      exitStudioSceneIfTarget: (entityId, source) => {
        if (this.studioScene.isTargetEntity(entityId)) {
          this.exitStudioScene(source);
        }
      }
    });
    this.modelImport = new ModelImportSessionController({
      runtime,
      registry: this.registry,
      emit,
      getProjectModel: () => this.projectModel,
      ensureProject: () => this.ensureProject(),
      setSelectedEntity: (entityId, source) => this.setSelectedEntity(entityId, source)
    });
    this.modelAnimation = new ModelAnimationSessionController(this.registry, emit);
    this.lightSession = new LightSessionController({
      runtime,
      registry: this.registry,
      emit,
      getProjectModel: () => this.projectModel,
      ensureProject: () => this.ensureProject(),
      rebuildGroupHierarchy: () => this.rebuildGroupHierarchy(),
      setSelectedEntity: (entityId, source) => this.setSelectedEntity(entityId, source)
    });
    this.sceneEnvironment = new SceneEnvironmentSessionController({
      runtime,
      emit,
      getProjectModel: () => this.projectModel,
      getSelectedEntityId: () => this.selectedEntityId,
      setSelectedEntity: (entityId, source) => this.setSelectedEntity(entityId, source)
    });
    this.studioScene = new StudioSceneSessionController({
      runtime,
      registry: this.registry,
      emit,
      resolveStudioHdriUrl: options.resolveStudioHdriUrl,
      getProjectModel: () => this.projectModel,
      getSelectedEntityId: () => this.selectedEntityId,
      hasEntityIsolation: () => this.entityIsolation.hasIsolation(),
      clearEntityIsolation: (source) => this.entityIsolation.clear(source),
      setSelectedEntity: (entityId, source) => this.setSelectedEntity(entityId, source),
      rebuildGroupHierarchy: () => this.rebuildGroupHierarchy()
    });
    this.selection = new EditorSelectionSessionController({
      runtime,
      registry: this.registry,
      emit,
      getProjectModel: () => this.projectModel,
      getSelectedEntityId: () => this.selectedEntityId,
      setSelectedEntityId: (entityId) => {
        this.selectedEntityId = entityId;
      },
      studioScene: this.studioScene,
      canUseStudioSceneEntityAction: (entityId, action) =>
        this.canUseStudioSceneEntityAction(entityId, action)
    });
    this.commandHandlers = {
      loadProject: (project) => this.loadProject(project),
      clearProject: () => this.clearProject(),
      importModel: (file, source) => this.importModel(file, source),
      setSelectedEntity: (entityId, source) => this.setSelectedEntity(entityId, source),
      removeEntity: (entityId, source) => this.removeEntity(entityId, source),
      duplicateEntity: (entityId, source, duplicateOptions) =>
        this.duplicateEntity(entityId, source, duplicateOptions),
      setEntityLocked: (entityId, locked, source) =>
        this.setEntityLocked(entityId, locked, source),
      setEntityVisible: (entityId, visible, source) =>
        this.setEntityVisible(entityId, visible, source),
      updateEntityTransform: (entityId, patch, source) =>
        this.updateEntityTransform(entityId, patch, source),
      updateEntityLabel: (entityId, label, source) =>
        this.updateEntityLabel(entityId, label, source),
      updateCamera: (patch, source) => this.updateCamera(patch, source),
      updateSceneEnvConfig: (patch, source) =>
        this.updateSceneEnvConfig(patch, source),
      updateGroundConfig: (patch, source) => this.updateGroundConfig(patch, source),
      updateGroundMaterial: (patch, source) => this.updateGroundMaterial(patch, source),
      updateMeshMaterial: (entityId, patch, source) =>
        this.updateMeshMaterial(entityId, patch, source),
      createMesh: (geometryName, source) => this.createMesh(geometryName, source),
      updateLight: (entityId, patch, source) => this.updateLight(entityId, patch, source),
      createLight: (lightType, source) => this.createLight(lightType, source),
      createLightPreset: (presetId, source) => this.createLightPreset(presetId, source),
      isStudioSceneActive: () => this.studioScene.isActive(),
      canUseStudioSceneEntityAction: (entityId, action) =>
        this.canUseStudioSceneEntityAction(entityId, action),
      selectModelAnimation: (entityId, animationId, source) =>
        this.modelAnimation.selectAnimation(entityId, animationId, source),
      updateModelAnimationTimeScale: (entityId, timeScale, source) =>
        this.modelAnimation.updateTimeScale(entityId, timeScale, source),
      controlModelAnimation: (entityId, action, source) =>
        this.modelAnimation.control(entityId, action, source),
      setModelSkeletonVisible: (entityId, visible, source) =>
        this.modelAnimation.setSkeletonVisible(entityId, visible, source)
    };
  }

  dispose() {
    this.clearAi3DPreview();
    this.clearProjectObjects();
    this.modelImport.revokeOwnedModelUrls();
  }

  async loadProject(projectJson: EditorProjectJSON) {
    this.modelImport.releaseUnusedOwnedModelUrls(projectJson);
    this.clearAi3DPreview();
    this.clearProjectObjects();

    this.projectModel = EditorProjectModel.fromJSON(projectJson);
    if (this.projectModel.envConfig.panoUrl) {
      await this.runtime.setEnvironmentFromUrl(this.projectModel.envConfig.panoUrl);
    } else {
      this.runtime.clearEnvironment();
    }
    this.runtime.applyEnvConfig(this.projectModel.envConfig, {
      syncShadowFromGroundMode: true
    });
    this.runtime.applyCameraModel(this.projectModel.camera);

    const pendingBindingReady = createProjectBindings(this.projectModel, this.registry);
    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();

    if (pendingBindingReady.length > 0) {
      const readyResults = await Promise.allSettled(pendingBindingReady);
      const failedBindings = readyResults.filter((result) => result.status === "rejected");
      if (failedBindings.length > 0) {
        throw new Error(
          failedBindings.length === 1
            ? "Failed to load a model asset in this project."
            : `Failed to load ${failedBindings.length} model assets in this project.`
        );
      }
    }

    this.emit({ type: "projectLoaded", projectId: this.projectModel.id });
  }

  async clearProject() {
    const projectId = this.projectModel?.id;
    await this.loadProject(createEmptyEditorProjectJSON(projectId));
  }

  private async ensureProject() {
    if (!this.projectModel) {
      await this.loadProject(createEmptyEditorProjectJSON());
    }
  }

  flushRuntimeStateToProjectModel(deltaSeconds = 0) {
    flushRenderStateToProjectModel({
      projectModel: this.projectModel,
      registry: this.registry,
      runtime: this.runtime,
      studioScene: this.studioScene,
      deltaSeconds
    });
  }

  getProjectJSON(): EditorProjectJSON | null {
    return getSerializableProjectJSON({
      projectModel: this.projectModel,
      studioScene: this.studioScene,
      applyEntityIsolationVisibility: (projectJson) =>
        this.entityIsolation.applyVisibilityToProjectJSON(projectJson)
    });
  }

  getSelectedEntityId(): string | null {
    return this.selectedEntityId;
  }

  getGroundConfig() {
    return this.sceneEnvironment.getGroundConfig();
  }

  getLightingConflictState(): LightingConflictState {
    return this.sceneEnvironment.getLightingConflictState();
  }

  removeEnvironmentFillLights(source: SyncSource = "ui") {
    return this.entityMutation.removeEnvironmentFillLights(source);
  }

  getIsolatedEntityId(): string | null {
    return this.entityIsolation.getIsolatedEntityId();
  }

  getStudioSceneState(): StudioSceneState {
    return this.studioScene.getState();
  }

  isStudioSceneEntityInteractive(entityId: string) {
    return this.studioScene.isStudioSceneEntityInteractive(entityId);
  }

  canUseStudioSceneEntityAction(entityId: string, action: StudioSceneEntityAction) {
    if (!this.studioScene.isActive()) return true;
    if (entityId === SCENE_SELECTION_ID) {
      return action === "select";
    }
    if (entityId === GROUND_HELPER_NODE_ID) {
      return false;
    }
    return this.studioScene.canUseStudioSceneEntityAction(entityId, action);
  }

  getRenderObject(entityId: string) {
    return this.registry.getObject(entityId);
  }

  previewAi3DPlan(plan: Ai3DPlan) {
    this.ai3dPreview.previewPlan(plan);
  }

  captureAi3DPreviewImages() {
    return this.ai3dPreview.captureImages();
  }

  clearAi3DPreview() {
    this.ai3dPreview.clear();
  }

  async applyAi3DPlan(plan: Ai3DPlan, source: SyncSource = "ui") {
    await this.ai3dPlan.applyPlan(plan, source);
  }

  async enterStudioScene(
    entityId: string,
    options: StudioSceneEnterOptions,
    source: SyncSource = "ui"
  ) {
    return this.studioScene.enter(entityId, options, source);
  }

  suggestStudioProductProfile(entityId: string) {
    if (!this.projectModel) return null;
    return suggestStudioProductProfile(this.projectModel, this.registry, entityId);
  }

  setStudioScenePreset(presetId: StudioScenePresetId) {
    this.studioScene.setPreset(presetId);
  }

  autoMatchStudioSceneStyle() {
    this.studioScene.autoMatchStyle();
  }

  getTransientStudioEntityRole(entityId: string | null) {
    return entityId ? this.studioScene.getTransientStudioEntityRole(entityId) : null;
  }

  getStudioSceneEntityMetadata(entityId: string | null) {
    return this.studioScene.getStudioSceneEntityMetadata(entityId);
  }

  resetStudioSceneEntity(entityId: string) {
    return this.studioScene.resetStudioSceneEntity(entityId);
  }

  setStudioScenePlinthKind(plinthKind: StudioPlinthKind) {
    this.studioScene.setPlinthKind(plinthKind);
  }

  resetStudioSceneGeneratedLayout() {
    this.studioScene.resetGeneratedLayout();
  }

  resetStudioSceneLighting() {
    this.studioScene.resetLighting();
  }

  getStudioScenePostProcessingState() {
    return this.studioScene.getPostProcessingState();
  }

  updateStudioScenePostProcessing(patch: StudioScenePostProcessingPatch) {
    return this.studioScene.updatePostProcessing(patch);
  }

  resetStudioScenePostProcessing() {
    return this.studioScene.resetPostProcessing();
  }

  addStudioSceneDecoration(kind: StudioDecorationKind) {
    return this.studioScene.addDecoration(kind);
  }

  replaceStudioSceneDecoration(entityId: string, kind: StudioDecorationKind) {
    return this.studioScene.replaceDecoration(entityId, kind);
  }

  setStudioSceneVariant(variantId: StudioSceneVariantId) {
    this.studioScene.setVariant(variantId);
  }

  updateStudioSceneTargetTransform(input: {
    scale?: number;
    rotationY?: number;
  }) {
    this.studioScene.updateTargetTransform(input);
  }

  resetStudioSceneTargetTransform() {
    this.studioScene.resetTargetTransform();
  }

  exitStudioScene(source: SyncSource = "ui") {
    this.studioScene.exit(source);
  }

  async dispatch(command: EditorCommand) {
    await dispatchEditorCommand(this.commandHandlers, command);
  }

  async importModel(file: File, source: SyncSource = "ui") {
    const imported = await this.modelImport.importFile(file, source);
    if (imported && this.studioScene.isActive()) {
      this.adoptStudioEntity(imported.entityId, "userModel", { placeAtSpawn: true, source });
      this.setSelectedEntity(imported.entityId, source);
    }
    return imported;
  }

  async importModelFromSource(
    input: {
      sourceUrl: string;
      format: "gltf" | "fbx";
      label: string;
      externalSource: Parameters<ModelImportSessionController["importFromSource"]>[0]["externalSource"];
    },
    source: SyncSource = "ui"
  ) {
    const imported = await this.modelImport.importFromSource(input, source);
    if (imported && this.studioScene.isActive()) {
      this.adoptStudioEntity(imported.entityId, "userModel", { placeAtSpawn: true, source });
      this.setSelectedEntity(imported.entityId, source);
    }
    return imported;
  }

  updateEntityTransform(entityId: string, patch: TransformPatch, source: SyncSource = "ui") {
    if (this.studioScene.isActive() && !this.canUseStudioSceneEntityAction(entityId, "transform")) return;
    this.entityMutation.updateTransform(entityId, patch, source);
  }

  updateEntityLabel(entityId: string, label: string, source: SyncSource = "ui") {
    if (this.studioScene.isActive() && !this.canUseStudioSceneEntityAction(entityId, "rename")) return;
    this.entityMutation.updateLabel(entityId, label, source);
  }

  updateCamera(update: Partial<EditorCameraJSON>, source: SyncSource = "ui") {
    if (this.studioScene.isActive()) return;
    this.sceneEnvironment.updateCamera(update, source);
  }

  async updateSceneEnvConfig(
    patch: Partial<EditorEnvConfigJSON>,
    source: SyncSource = "ui",
    options?: { panoAssetName?: string }
  ) {
    await this.sceneEnvironment.updateSceneEnvConfig(patch, source, options);
  }

  updateMeshMaterial(
    entityId: string,
    patch: MeshMaterialPatch,
    source: SyncSource = "ui"
  ) {
    if (this.studioScene.isActive() && !this.canUseStudioSceneEntityAction(entityId, "material")) return;
    const binding = this.registry.get(entityId);
    if (!binding || binding.kind !== "mesh" || binding.model.locked) return;

    updateMeshBindingMaterial(
      binding,
      this.runtime.textureLoader,
      patch,
      () => this.runtime.invalidatePathTraceMaterials()
    );
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "mesh",
      source,
      affectsSceneTree: false,
      affectsMeshList: false
    });
  }

  updateGroundConfig(patch: Partial<EditorGroundConfigJSON>, source: SyncSource = "ui") {
    if (this.studioScene.isActive()) return;
    this.sceneEnvironment.updateGroundConfig(patch, source);
  }

  updateGroundMaterial(patch: MeshMaterialPatch, source: SyncSource = "ui") {
    if (this.studioScene.isActive()) return;
    this.sceneEnvironment.updateGroundMaterial(patch, source);
  }

  async createMesh(geometryName: string, source: SyncSource = "ui") {
    if (!this.projectModel) {
      await this.loadProject(createEmptyEditorProjectJSON());
    }
    if (!this.projectModel) return;

    const meshId = this.ai3dPlan.createMeshFromDraft(
      {
        nodeId: createMeshEntityId(),
        label: geometryName,
        mesh: createMeshPayload(geometryName)
      },
      source
    );
    if (this.studioScene.isActive()) {
      this.adoptStudioEntity(meshId, "userMesh", { placeAtSpawn: true, source });
    }
    this.setSelectedEntity(meshId, source);
  }

  updateLight(entityId: string, patch: Partial<EditorLightJSON>, source: SyncSource = "ui") {
    if (this.studioScene.isActive() && !this.canUseStudioSceneEntityAction(entityId, "light")) return;
    this.lightSession.updateLight(entityId, patch, source);
  }

  createLight(lightType: EditorLightJSON["type"], source: SyncSource = "ui") {
    const lightId = this.lightSession.createLight(lightType, source);
    if (lightId && this.studioScene.isActive()) {
      this.adoptStudioEntity(lightId, "userLight", { source });
      this.setSelectedEntity(lightId, source);
    }
  }

  async createLightPreset(presetId: LightPresetId, source: SyncSource = "ui") {
    await this.ensureProject();
    const adaptiveFrame = this.studioScene.isActive()
      ? null
      : await this.createVisibleSceneLightPresetFrame();
    const preset = await this.lightSession.createLightPreset(presetId, source, {
      adaptiveFrame
    });
    if (preset && this.studioScene.isActive()) {
      this.adoptStudioEntity(preset.groupId, "userLightGroup", {
        childRole: "userLightGroup",
        source
      });
      this.setSelectedEntity(preset.groupId, source);
    }
  }

  private async createVisibleSceneLightPresetFrame(): Promise<LightPresetFrame | null> {
    const projectModel = this.projectModel;
    if (!projectModel) return null;

    const bindings = this.registry
      .list()
      .filter(
        (binding) =>
          (binding.kind === "model" || binding.kind === "mesh") &&
          projectModel.isEntityEffectivelyVisible(binding.model.id)
      );

    if (bindings.length === 0) return null;

    await Promise.allSettled(
      bindings.map((binding) => binding.ready ?? Promise.resolve())
    );

    const sceneBox = new THREE.Box3();
    const objectBox = new THREE.Box3();

    bindings.forEach((binding) => {
      binding.object.updateMatrixWorld(true);
      objectBox.setFromObject(binding.object);
      if (!objectBox.isEmpty()) {
        sceneBox.union(objectBox);
      }
    });

    if (sceneBox.isEmpty()) return null;

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    sceneBox.getCenter(center);
    sceneBox.getSize(size);

    return {
      center: [center.x, center.y, center.z],
      floorY: sceneBox.min.y,
      radius: Math.max(size.x, size.y, size.z) * 0.5
    };
  }

  private adoptStudioEntity(
    entityId: string,
    role: StudioTransientEntityRole,
    options: {
      childRole?: StudioTransientEntityRole;
      placeAtSpawn?: boolean;
      source?: SyncSource;
    } = {}
  ) {
    if (!this.studioScene.isActive()) return false;
    return this.studioScene.adoptTransientStudioEntity(entityId, role, {
      childRole: options.childRole,
      placeAtSpawn: options.placeAtSpawn
    });
  }

  syncEntityModelFromRenderObject(entityId: string) {
    const binding = this.registry.syncObjectTransformToModel(entityId);
    if (!binding) return;

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: binding.kind,
      source: "render",
      affectsSceneTree: false
    });
  }

  syncRenderChangesToModel(deltaSeconds = 0) {
    return syncRenderStateChangesToModel({
      projectModel: this.projectModel,
      registry: this.registry,
      runtime: this.runtime,
      studioScene: this.studioScene,
      selectedEntityId: this.selectedEntityId,
      emit: this.emit,
      deltaSeconds
    });
  }

  pick(clientX: number, clientY: number): string | null {
    return this.selection.pick(clientX, clientY);
  }

  setSelectedEntity(entityId: string | null, source: SyncSource = "ui") {
    this.selection.setSelectedEntity(entityId, source);
  }

  removeEntity(entityId: string, source: SyncSource = "ui") {
    if (this.studioScene.isActive() && !this.canUseStudioSceneEntityAction(entityId, "delete")) return;
    this.entityMutation.remove(entityId, source);
  }

  duplicateEntity(
    entityId: string,
    source: SyncSource = "ui",
    duplicateOptions?: EntityDuplicateOptions
  ) {
    if (this.studioScene.isActive() && !this.canUseStudioSceneEntityAction(entityId, "duplicate")) return;
    this.entityMutation.duplicate(entityId, source, duplicateOptions);
  }

  setEntityLocked(entityId: string, locked: boolean, source: SyncSource = "ui") {
    if (this.studioScene.isActive() && !this.canUseStudioSceneEntityAction(entityId, "lock")) return;
    this.entityMutation.setLocked(entityId, locked, source);
  }

  toggleEntityIsolation(entityId: string, source: SyncSource = "ui") {
    this.entityIsolation.toggle(entityId, source);
  }

  setEntityVisible(entityId: string, visible: boolean, source: SyncSource = "ui") {
    if (this.studioScene.isActive() && !this.canUseStudioSceneEntityAction(entityId, "visibility")) return;
    if (this.studioScene.setTransientEntityVisible(entityId, visible, source)) return;
    this.entityIsolation.setVisible(entityId, visible, source);
  }

  private clearProjectObjects() {
    this.studioScene.clear("load", false);
    this.registry.clear();
    this.projectModel = null;
    this.entityIsolation.reset();
    this.setSelectedEntity(null, "load");
  }

  private rebuildGroupHierarchy() {
    if (!this.projectModel) return;
    rebuildProjectGroupHierarchy({
      projectModel: this.projectModel,
      registry: this.registry,
      scene: this.runtime.scene
    });
  }

}
