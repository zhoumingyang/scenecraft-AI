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
import { pickEntityId } from "../interaction/picker";
import type { LightPresetId } from "../lightPresets";
import {
  DEFAULT_STUDIO_SCENE_PRESET_ID,
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
import { EntityIsolationSessionController } from "./entityIsolationSession";
import { EntityMutationSessionController } from "./entityMutationSession";
import { createMeshEntityId, createMeshPayload } from "./entityFactories";
import { LightSessionController } from "./lightSession";
import { ModelImportSessionController } from "./modelImportSession";
import { ModelAnimationSessionController } from "./modelAnimationSession";
import { SceneEnvironmentSessionController } from "./sceneEnvironmentSession";
import {
  StudioSceneSessionController,
  type StudioSceneEntityAction
} from "./studioSceneSession";

type Emit = (event: EditorAppEvent) => void;

function resolveCanvasPickedEntityId(projectModel: EditorProjectModel | null, entityId: string | null) {
  if (!projectModel || !entityId) return entityId;

  let resolvedEntityId = entityId;
  let parentGroupId = projectModel.getParentGroupId(resolvedEntityId);

  while (parentGroupId) {
    resolvedEntityId = parentGroupId;
    parentGroupId = projectModel.getParentGroupId(resolvedEntityId);
  }

  return resolvedEntityId;
}

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
  private selectedEntityId: string | null = null;

  projectModel: EditorProjectModel | null = null;

  constructor(runtime: EditorRuntime, emit: Emit) {
    this.runtime = runtime;
    this.emit = emit;
    this.registry = new BindingRegistry({
      scene: runtime.scene,
      modelLoaderFactory: runtime.modelLoaderFactory,
      textureLoader: runtime.textureLoader,
      invalidateScene: () => runtime.invalidatePathTraceScene(),
      invalidateMaterials: () => runtime.invalidatePathTraceMaterials()
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
      getProjectModel: () => this.projectModel,
      getSelectedEntityId: () => this.selectedEntityId,
      hasEntityIsolation: () => this.entityIsolation.hasIsolation(),
      clearEntityIsolation: (source) => this.entityIsolation.clear(source),
      setSelectedEntity: (entityId, source) => this.setSelectedEntity(entityId, source),
      rebuildGroupHierarchy: () => this.rebuildGroupHierarchy()
    });
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
    this.runtime.applyEnvConfig(this.projectModel.envConfig);
    this.runtime.applyCameraModel(this.projectModel.camera);

    const pendingBindingReady: Promise<void>[] = [];
    const registerBinding = (binding: { ready?: Promise<void> }) => {
      if (binding.ready) {
        pendingBindingReady.push(binding.ready);
      }
    };

    this.projectModel.groups.forEach((group) => registerBinding(this.registry.create(group)));
    this.projectModel.models.forEach((model) => registerBinding(this.registry.create(model)));
    this.projectModel.meshes.forEach((mesh) => registerBinding(this.registry.create(mesh)));
    this.projectModel.lights.forEach((light) => registerBinding(this.registry.create(light)));
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
    if (!this.projectModel) return;

    if (this.studioScene.isActive()) {
      this.registry.refresh(deltaSeconds);
      this.studioScene.getTransientStudioEntityIds().forEach((entityId) => {
        this.registry.syncObjectTransformToModel(entityId);
      });
      return;
    }

    this.runtime.syncCameraModel(this.projectModel.camera);
    this.registry.refresh(deltaSeconds);
    this.registry.syncAllObjectTransformsToModel();
  }

  getProjectJSON(): EditorProjectJSON | null {
    if (!this.projectModel) return null;

    const projectJson = this.projectModel.toJSON();
    return this.studioScene.filterTransientEntitiesFromProjectJSON(
      this.entityIsolation.applyVisibilityToProjectJSON(projectJson)
    );
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
    presetId: StudioScenePresetId = DEFAULT_STUDIO_SCENE_PRESET_ID,
    source: SyncSource = "ui"
  ) {
    return this.studioScene.enter(entityId, presetId, source);
  }

  setStudioScenePreset(presetId: StudioScenePresetId) {
    this.studioScene.setPreset(presetId);
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
    switch (command.type) {
      case "project.load":
        await this.loadProject(command.project);
        return;
      case "project.clear":
        await this.clearProject();
        return;
      case "model.import":
        await this.importModel(command.file, command.source ?? "ui");
        return;
      case "selection.set":
        this.setSelectedEntity(command.entityId, command.source ?? "ui");
        return;
      case "entity.remove":
        this.removeEntity(command.entityId, command.source ?? "ui");
        return;
      case "entity.duplicate":
        this.duplicateEntity(command.entityId, command.source ?? "ui");
        return;
      case "entity.lock":
        this.setEntityLocked(command.entityId, command.locked, command.source ?? "ui");
        return;
      case "entity.visible":
        this.setEntityVisible(command.entityId, command.visible, command.source ?? "ui");
        return;
      case "entity.transform":
        this.updateEntityTransform(command.entityId, command.patch, command.source ?? "ui");
        return;
      case "entity.label":
        this.updateEntityLabel(command.entityId, command.label, command.source ?? "ui");
        return;
      case "camera.patch":
        this.updateCamera(command.patch, command.source ?? "ui");
        return;
      case "scene.envConfig.patch":
        await this.updateSceneEnvConfig(command.patch, command.source ?? "ui");
        return;
      case "ground.patch":
        this.updateGroundConfig(command.patch, command.source ?? "ui");
        return;
      case "ground.material":
        this.updateGroundMaterial(command.patch, command.source ?? "ui");
        return;
      case "mesh.material":
        this.updateMeshMaterial(command.entityId, command.patch, command.source ?? "ui");
        return;
      case "mesh.create":
        this.createMesh(command.geometryName, command.source ?? "ui");
        return;
      case "light.patch":
        this.updateLight(command.entityId, command.patch, command.source ?? "ui");
        return;
      case "light.create":
        this.createLight(command.lightType, command.source ?? "ui");
        return;
      case "lightPreset.create":
        await this.createLightPreset(command.presetId, command.source ?? "ui");
        return;
      case "model.animation.select":
        this.modelAnimation.selectAnimation(command.entityId, command.animationId, command.source ?? "ui");
        return;
      case "model.animation.timeScale":
        this.modelAnimation.updateTimeScale(command.entityId, command.timeScale, command.source ?? "ui");
        return;
      case "model.animation.control":
        this.modelAnimation.control(command.entityId, command.action, command.source ?? "ui");
        return;
    }
  }

  async importModel(file: File, source: SyncSource = "ui") {
    return this.modelImport.importFile(file, source);
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
    return this.modelImport.importFromSource(input, source);
  }

  updateEntityTransform(entityId: string, patch: TransformPatch, source: SyncSource = "ui") {
    this.entityMutation.updateTransform(entityId, patch, source);
  }

  updateEntityLabel(entityId: string, label: string, source: SyncSource = "ui") {
    this.entityMutation.updateLabel(entityId, label, source);
  }

  updateCamera(update: Partial<EditorCameraJSON>, source: SyncSource = "ui") {
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
    this.sceneEnvironment.updateGroundConfig(patch, source);
  }

  updateGroundMaterial(patch: MeshMaterialPatch, source: SyncSource = "ui") {
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
    this.setSelectedEntity(meshId, source);
  }

  updateLight(entityId: string, patch: Partial<EditorLightJSON>, source: SyncSource = "ui") {
    this.lightSession.updateLight(entityId, patch, source);
  }

  createLight(lightType: EditorLightJSON["type"], source: SyncSource = "ui") {
    this.lightSession.createLight(lightType, source);
  }

  async createLightPreset(presetId: LightPresetId, source: SyncSource = "ui") {
    await this.lightSession.createLightPreset(presetId, source);
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
    let sceneChanged = false;
    if (this.projectModel && this.studioScene.isActive()) {
      sceneChanged = this.registry.refresh(deltaSeconds) || sceneChanged;

      const renderTransformedBinding =
        this.selectedEntityId && this.studioScene.isTransientStudioEntity(this.selectedEntityId)
          ? this.registry.syncObjectTransformToModel(this.selectedEntityId)
          : null;

      if (renderTransformedBinding) {
        this.emit({
          type: "entityUpdated",
          entityId: renderTransformedBinding.model.id,
          entityKind: renderTransformedBinding.kind,
          source: "render",
          affectsSceneTree: false
        });
        sceneChanged = true;
      }

      return sceneChanged;
    }

    if (
      this.projectModel &&
      !this.studioScene.isActive() &&
      this.runtime.syncCameraModel(this.projectModel.camera)
    ) {
      this.emit({ type: "cameraUpdated", source: "render" });
      sceneChanged = true;
    }

    sceneChanged = this.registry.refresh(deltaSeconds) || sceneChanged;

    const renderTransformedBinding =
      !this.studioScene.isActive() && this.selectedEntityId && this.selectedEntityId !== SCENE_SELECTION_ID
        ? this.registry.syncObjectTransformToModel(this.selectedEntityId)
        : null;

    if (renderTransformedBinding) {
      this.emit({
        type: "entityUpdated",
        entityId: renderTransformedBinding.model.id,
        entityKind: renderTransformedBinding.kind,
        source: "render",
        affectsSceneTree: false
      });
      sceneChanged = true;
    }

    return sceneChanged;
  }

  pick(clientX: number, clientY: number): string | null {
    const pickedEntityId = pickEntityId({
      camera: this.runtime.camera,
      raycaster: this.runtime.raycaster,
      domElement: this.runtime.renderer.domElement,
      pickTargets: this.registry.getPickTargets(),
      clientX,
      clientY
    });

    if (pickedEntityId && this.studioScene.isTransientStudioEntity(pickedEntityId)) {
      return pickedEntityId;
    }

    return resolveCanvasPickedEntityId(this.projectModel, pickedEntityId);
  }

  setSelectedEntity(entityId: string | null, source: SyncSource = "ui") {
    if (entityId === GROUND_HELPER_NODE_ID) {
      if (!this.projectModel?.envConfig.ground.visible) return;
      if (this.selectedEntityId === entityId) return;
      this.selectedEntityId = entityId;
      this.runtime.attachTransformTarget(null);
      this.emit({ type: "selectionChanged", selectedEntityId: entityId, source });
      return;
    }

    if (entityId && entityId !== SCENE_SELECTION_ID) {
      if (this.studioScene.isActive() && !this.studioScene.isStudioSceneEntityInteractive(entityId)) {
        return;
      }
      const binding = this.registry.get(entityId);
      if (!binding || binding.model.locked || !this.projectModel?.isEntityEffectivelyVisible(entityId)) return;
    }
    if (this.selectedEntityId === entityId) return;
    this.selectedEntityId = entityId;
    const binding = entityId && entityId !== SCENE_SELECTION_ID ? this.registry.get(entityId) : null;
    this.runtime.attachTransformTarget(binding?.object ?? null);
    this.emit({ type: "selectionChanged", selectedEntityId: entityId, source });
  }

  removeEntity(entityId: string, source: SyncSource = "ui") {
    this.entityMutation.remove(entityId, source);
  }

  duplicateEntity(entityId: string, source: SyncSource = "ui") {
    this.entityMutation.duplicate(entityId, source);
  }

  setEntityLocked(entityId: string, locked: boolean, source: SyncSource = "ui") {
    this.entityMutation.setLocked(entityId, locked, source);
  }

  toggleEntityIsolation(entityId: string, source: SyncSource = "ui") {
    this.entityIsolation.toggle(entityId, source);
  }

  setEntityVisible(entityId: string, visible: boolean, source: SyncSource = "ui") {
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

    this.projectModel.groups.forEach((group) => {
      const parentGroupId = this.projectModel?.getParentGroupId(group.id) ?? null;
      this.registry.attach(group.id, parentGroupId, this.runtime.scene);
    });

    this.projectModel.models.forEach((model) => {
      const parentGroupId = this.projectModel?.getParentGroupId(model.id) ?? null;
      this.registry.attach(model.id, parentGroupId, this.runtime.scene);
    });

    this.projectModel.meshes.forEach((mesh) => {
      const parentGroupId = this.projectModel?.getParentGroupId(mesh.id) ?? null;
      this.registry.attach(mesh.id, parentGroupId, this.runtime.scene);
    });

    this.projectModel.lights.forEach((light) => {
      const parentGroupId = this.projectModel?.getParentGroupId(light.id) ?? null;
      this.registry.attach(light.id, parentGroupId, this.runtime.scene);
    });
  }

}
