import type { Ai3DPlan, Ai3DMeshDraft } from "../ai3d/plan";
import { buildAi3DMeshDrafts } from "../ai3d/plan";
import type { EditorCommand, MeshMaterialPatch } from "../core/commands";
import type {
  EditorCameraJSON,
  EditorEnvConfigJSON,
  EditorGroundConfigJSON,
  EditorLightJSON,
  LightingConflictState,
  EditorProjectJSON,
  ResolvedEditorEnvConfigJSON,
  StudioSceneState,
  SyncSource,
  TransformPatch
} from "../core/types";
import type { EditorAppEvent } from "../core/events";
import { BindingRegistry } from "../bindings/bindingRegistry";
import { updateLightBinding } from "../bindings/lightBinding";
import { updateMeshBindingMaterial } from "../bindings/meshBinding";
import { pickEntityId } from "../interaction/picker";
import { getLightPresetDefinition } from "../lightPresets";
import type { LightPresetId } from "../lightPresets";
import { DEFAULT_STUDIO_SCENE_PRESET_ID, type StudioScenePresetId } from "../studioScenes";
import { EditorProjectModel } from "../models";
import { createEmptyEditorProjectJSON } from "../factories/projectFactory";
import { mergeEditorPostProcessingConfig } from "../postProcessing";
import { hasTextureMaterialPatch, normalizeMeshMaterial } from "../materials/meshMaterial";
import { EditorRuntime } from "../runtime/editorRuntime";
import {
  GROUND_HELPER_NODE_ID,
  SCENE_NODE_ID as SCENE_SELECTION_ID
} from "../core/types";
import { Ai3DPreviewSession } from "./ai3dPreviewSession";
import { cloneEditorEntity } from "./entityDuplicator";
import { EntityIsolationSessionController } from "./entityIsolationSession";
import {
  createDefaultGroupLabel,
  createDefaultLightLabel,
  createDefaultMeshLabel,
  createGroupEntityId,
  createLightEntityId,
  createLightPayload,
  createMeshEntityId,
  createMeshPayload
} from "./entityFactories";
import { ModelImportSessionController } from "./modelImportSession";
import { ModelAnimationSessionController } from "./modelAnimationSession";
import { StudioSceneSessionController } from "./studioSceneSession";

type Emit = (event: EditorAppEvent) => void;

function getEnvConfigPathTraceInvalidation(patch: Partial<EditorEnvConfigJSON>) {
  const nonPostProcessingKeys = Object.keys(patch).filter((key) => key !== "postProcessing");
  return nonPostProcessingKeys.length > 0 ? "environment" : "none";
}

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
  private readonly ai3dPreview: Ai3DPreviewSession;
  private readonly entityIsolation: EntityIsolationSessionController;
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
    this.entityIsolation = new EntityIsolationSessionController({
      registry: this.registry,
      emit,
      getProjectModel: () => this.projectModel,
      getSelectedEntityId: () => this.selectedEntityId,
      setSelectedEntity: (entityId, source) => this.setSelectedEntity(entityId, source)
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
    this.studioScene = new StudioSceneSessionController({
      runtime,
      registry: this.registry,
      emit,
      getProjectModel: () => this.projectModel,
      getSelectedEntityId: () => this.selectedEntityId,
      hasEntityIsolation: () => this.entityIsolation.hasIsolation(),
      clearEntityIsolation: (source) => this.entityIsolation.clear(source),
      setSelectedEntity: (entityId, source) => this.setSelectedEntity(entityId, source)
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

    this.runtime.syncCameraModel(this.projectModel.camera);
    this.registry.refresh(deltaSeconds);
    this.registry.syncAllObjectTransformsToModel();
  }

  getProjectJSON(): EditorProjectJSON | null {
    if (!this.projectModel) return null;

    const projectJson = this.projectModel.toJSON();
    return this.entityIsolation.applyVisibilityToProjectJSON(projectJson);
  }

  getSelectedEntityId(): string | null {
    return this.selectedEntityId;
  }

  getGroundConfig() {
    return this.projectModel?.envConfig.ground ?? null;
  }

  getLightingConflictState(): LightingConflictState {
    if (!this.projectModel) {
      return {
        hasConflict: false,
        hasAmbientLight: false,
        hasHemisphereLight: false
      };
    }

    const hasActiveEnvironmentMap =
      this.projectModel.envConfig.environment === 1 && this.runtime.hasEnvironmentTexture();
    if (!hasActiveEnvironmentMap) {
      return {
        hasConflict: false,
        hasAmbientLight: false,
        hasHemisphereLight: false
      };
    }

    let hasAmbientLight = false;
    let hasHemisphereLight = false;
    this.projectModel.lights.forEach((light) => {
      if (light.lightType === 1) {
        hasAmbientLight = true;
      } else if (light.lightType === 6) {
        hasHemisphereLight = true;
      }
    });

    return {
      hasConflict: hasAmbientLight || hasHemisphereLight,
      hasAmbientLight,
      hasHemisphereLight
    };
  }

  getIsolatedEntityId(): string | null {
    return this.entityIsolation.getIsolatedEntityId();
  }

  getStudioSceneState(): StudioSceneState {
    return this.studioScene.getState();
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
    const drafts = buildAi3DMeshDrafts(plan);

    if (!this.projectModel) {
      await this.loadProject(createEmptyEditorProjectJSON());
    }
    if (!this.projectModel) return;

    if (drafts.length > 1) {
      const groupId = this.createGroupFromAiDrafts(drafts, source);
      this.clearAi3DPreview();
      this.setSelectedEntity(groupId, source);
      return;
    }

    let lastCreatedEntityId: string | null = null;
    drafts.forEach((draft) => {
      lastCreatedEntityId = this.createMeshFromDraft(draft, source);
    });

    this.clearAi3DPreview();

    if (lastCreatedEntityId) {
      this.setSelectedEntity(lastCreatedEntityId, source);
    }
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
    const binding = this.registry.get(entityId);
    if (!binding || binding.model.locked) return;

    binding.model.patchTransform(patch);
    this.registry.syncModelTransformToObject(entityId);
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: binding.kind,
      source,
      affectsSceneTree: false
    });
  }

  updateEntityLabel(entityId: string, label: string, source: SyncSource = "ui") {
    if (!this.projectModel) return;
    const record = this.projectModel.getEntityById(entityId);
    if (!record) return;

    record.item.patchLabel(label);
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: record.kind,
      source
    });
  }

  updateCamera(update: Partial<EditorCameraJSON>, source: SyncSource = "ui") {
    if (!this.projectModel) return;
    if (update.type === 2 && this.projectModel.camera.cameraType !== 2) {
      this.runtime.alignCameraModelToFirstPerson(this.projectModel.camera);
    }
    this.projectModel.camera.patch(update);
    this.runtime.applyCameraModel(this.projectModel.camera);
    this.emit({ type: "cameraUpdated", source });
  }

  async updateSceneEnvConfig(
    patch: Partial<EditorEnvConfigJSON>,
    source: SyncSource = "ui",
    options?: { panoAssetName?: string }
  ) {
    if (!this.projectModel) return;

    const nextEnvConfig: ResolvedEditorEnvConfigJSON = {
      ...this.projectModel.envConfig,
      ...patch,
      postProcessing: patch.postProcessing
        ? mergeEditorPostProcessingConfig(this.projectModel.envConfig.postProcessing, patch.postProcessing)
        : this.projectModel.envConfig.postProcessing,
      ground: this.projectModel.envConfig.ground
    };

    const shouldReloadEnvironment =
      patch.panoUrl !== undefined && patch.panoUrl !== this.projectModel.envConfig.panoUrl;

    if (shouldReloadEnvironment) {
      if (nextEnvConfig.panoUrl) {
        await this.runtime.setEnvironmentFromUrl(
          nextEnvConfig.panoUrl,
          options?.panoAssetName ?? nextEnvConfig.panoUrl
        );
      } else {
        this.runtime.clearEnvironment();
      }
    }

    this.projectModel.envConfig = nextEnvConfig;
    this.runtime.applyEnvConfig(this.projectModel.envConfig);
    this.emit({
      type: "sceneUpdated",
      source,
      pathTraceInvalidation: getEnvConfigPathTraceInvalidation(patch)
    });
    this.emit({ type: "viewStateUpdated" });
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
    if (!this.projectModel) return;

    this.projectModel.envConfig = {
      ...this.projectModel.envConfig,
      ground: {
        ...this.projectModel.envConfig.ground,
        ...patch,
        scale: patch.scale
          ? [
              patch.scale[0] ?? this.projectModel.envConfig.ground.scale[0],
              this.projectModel.envConfig.ground.scale[1],
              patch.scale[2] ?? this.projectModel.envConfig.ground.scale[2]
            ]
          : this.projectModel.envConfig.ground.scale,
        material: this.projectModel.envConfig.ground.material
      }
    };

    this.runtime.applyEnvConfig(this.projectModel.envConfig);

    if (!this.projectModel.envConfig.ground.visible && this.selectedEntityId === GROUND_HELPER_NODE_ID) {
      this.setSelectedEntity(null, source);
    }

    this.emit({ type: "sceneUpdated", source, pathTraceInvalidation: "scene" });
    this.emit({ type: "viewStateUpdated" });
  }

  updateGroundMaterial(patch: MeshMaterialPatch, source: SyncSource = "ui") {
    if (!this.projectModel) return;

    const material = this.projectModel.envConfig.ground.material;
    this.projectModel.envConfig = {
      ...this.projectModel.envConfig,
      ground: {
        ...this.projectModel.envConfig.ground,
        material: normalizeMeshMaterial({
          ...material,
          ...patch,
          diffuseMap: patch.diffuseMap
            ? { ...material.diffuseMap, ...patch.diffuseMap }
            : material.diffuseMap,
          metalnessMap: patch.metalnessMap
            ? { ...material.metalnessMap, ...patch.metalnessMap }
            : material.metalnessMap,
          roughnessMap: patch.roughnessMap
            ? { ...material.roughnessMap, ...patch.roughnessMap }
            : material.roughnessMap,
          normalMap: patch.normalMap
            ? { ...material.normalMap, ...patch.normalMap }
            : material.normalMap,
          aoMap: patch.aoMap ? { ...material.aoMap, ...patch.aoMap } : material.aoMap,
          emissiveMap: patch.emissiveMap
            ? { ...material.emissiveMap, ...patch.emissiveMap }
            : material.emissiveMap
        })
      }
    };

    if (hasTextureMaterialPatch(patch)) {
      this.runtime.applyEnvConfig(this.projectModel.envConfig);
    } else {
      this.runtime.updateGroundMaterial(this.projectModel.envConfig.ground.material);
    }
    this.emit({ type: "sceneUpdated", source, pathTraceInvalidation: "materials" });
  }

  async createMesh(geometryName: string, source: SyncSource = "ui") {
    if (!this.projectModel) {
      await this.loadProject(createEmptyEditorProjectJSON());
    }
    if (!this.projectModel) return;

    const meshId = this.createMeshFromDraft(
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
    const binding = this.registry.get(entityId);
    if (!binding || binding.kind !== "light" || binding.model.locked) return;

    updateLightBinding(binding, patch);
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "light",
      source,
      affectsSceneTree: false
    });
  }

  createLight(lightType: EditorLightJSON["type"], source: SyncSource = "ui") {
    if (!this.projectModel) return;

    const light = this.projectModel.addLight({
      ...createLightPayload(lightType),
      label: createDefaultLightLabel(lightType, this.projectModel.lights.size)
    });
    this.registry.create(light);
    this.runtime.syncLightHelperVisibility();
    this.emit({
      type: "entityUpdated",
      entityId: light.id,
      entityKind: "light",
      source
    });
    this.setSelectedEntity(light.id, source);
  }

  async createLightPreset(presetId: LightPresetId, source: SyncSource = "ui") {
    if (!this.projectModel) {
      await this.loadProject(createEmptyEditorProjectJSON());
    }
    if (!this.projectModel) return;

    const preset = getLightPresetDefinition(presetId);
    const group = this.projectModel.addGroup({
      id: createGroupEntityId(),
      label: preset.label,
      children: [],
      locked: false,
      visible: true,
      position: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      scale: [1, 1, 1]
    });

    this.registry.create(group);

    const childIds = preset.lights.map((presetLight) => {
      const light = this.projectModel!.addLight({
        id: createLightEntityId(),
        label: presetLight.label,
        locked: false,
        ...presetLight.light
      });
      this.registry.create(light);
      this.emit({
        type: "entityUpdated",
        entityId: light.id,
        entityKind: "light",
        source
      });
      return light.id;
    });

    group.children = childIds;
    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();
    this.emit({
      type: "entityUpdated",
      entityId: group.id,
      entityKind: "group",
      source
    });
    this.setSelectedEntity(group.id, source);
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
      const binding = this.registry.get(entityId);
      if (!binding || binding.model.locked || !this.projectModel?.isEntityEffectivelyVisible(entityId)) return;
    }
    if (this.selectedEntityId === entityId) return;
    this.selectedEntityId = entityId;
    const binding = entityId && entityId !== SCENE_SELECTION_ID ? this.registry.get(entityId) : null;
    this.runtime.attachTransformTarget(binding?.object ?? null);
    this.emit({ type: "selectionChanged", selectedEntityId: entityId, source });
  }

  private createMeshFromDraft(draft: Ai3DMeshDraft, source: SyncSource) {
    if (!this.projectModel) {
      throw new Error("Project model is not initialized.");
    }

    const mesh = this.projectModel.addMesh({
      ...draft.mesh,
      label:
        draft.mesh.label ||
        draft.label ||
        createDefaultMeshLabel(draft.mesh.geometryName ?? "", this.projectModel.meshes.size),
      id: createMeshEntityId()
    });
    this.registry.create(mesh);
    this.rebuildGroupHierarchy();
    this.emit({
      type: "entityUpdated",
      entityId: mesh.id,
      entityKind: "mesh",
      source
    });
    return mesh.id;
  }

  private createGroupFromAiDrafts(drafts: Ai3DMeshDraft[], source: SyncSource) {
    if (!this.projectModel) {
      throw new Error("Project model is not initialized.");
    }

    const center = drafts.reduce<[number, number, number]>(
      (acc, draft) => {
        acc[0] += draft.mesh.position?.[0] ?? 0;
        acc[1] += draft.mesh.position?.[1] ?? 0;
        acc[2] += draft.mesh.position?.[2] ?? 0;
        return acc;
      },
      [0, 0, 0]
    );

    center[0] /= drafts.length;
    center[1] /= drafts.length;
    center[2] /= drafts.length;

    const childIds = drafts.map((draft) =>
      this.createMeshFromDraft(
        {
          ...draft,
          mesh: {
            ...draft.mesh,
            position: [
              (draft.mesh.position?.[0] ?? 0) - center[0],
              (draft.mesh.position?.[1] ?? 0) - center[1],
              (draft.mesh.position?.[2] ?? 0) - center[2]
            ]
          }
        },
        source
      )
    );

    const group = this.projectModel.addGroup({
      id: createGroupEntityId(),
      label: createDefaultGroupLabel(this.projectModel.groups.size),
      children: childIds,
      locked: false,
      visible: true,
      position: center,
      quaternion: [0, 0, 0, 1],
      scale: [1, 1, 1]
    });

    this.registry.create(group);
    this.rebuildGroupHierarchy();
    this.emit({
      type: "entityUpdated",
      entityId: group.id,
      entityKind: "group",
      source
    });
    return group.id;
  }

  removeEntity(entityId: string, source: SyncSource = "ui") {
    if (!this.projectModel) return;
    if (this.studioScene.isTargetEntity(entityId)) {
      this.exitStudioScene(source);
    }
    this.entityIsolation.clear(source);
    const binding = this.registry.get(entityId);
    if (!binding || binding.model.locked || !this.projectModel.isEntityEffectivelyVisible(entityId)) return;

    if (binding.kind === "group") {
      const childIds = this.projectModel.listDirectChildren(entityId);
      const shouldRemoveChildren =
        childIds.length > 0 &&
        childIds.every((childId) => this.projectModel?.getEntityById(childId)?.kind === "light");

      if (shouldRemoveChildren) {
        childIds.forEach((childId) => {
          this.projectModel?.removeEntity(childId);
          this.registry.remove(childId);
          this.emit({
            type: "entityUpdated",
            entityId: childId,
            entityKind: "light",
            source
          });
        });
      } else {
        const parentGroupId = this.projectModel.getParentGroupId(entityId);
        childIds.forEach((childId) => {
          this.registry.attach(childId, parentGroupId, this.runtime.scene);
        });
      }
    }

    const removedKind = this.projectModel.removeEntity(entityId);
    if (!removedKind) return;
    this.registry.remove(entityId);
    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();

    if (this.selectedEntityId === entityId) {
      this.setSelectedEntity(null, source);
    }

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: removedKind,
      source
    });
  }

  duplicateEntity(entityId: string, source: SyncSource = "ui") {
    if (!this.projectModel) return;
    this.entityIsolation.clear(source);
    const record = this.projectModel.getEntityById(entityId);
    if (!record || record.item.locked || !this.projectModel.isEntityEffectivelyVisible(entityId)) return;

    const duplicate = cloneEditorEntity({
      projectModel: this.projectModel,
      registry: this.registry,
      entityId,
      source,
      emit: this.emit
    });
    if (!duplicate) return;

    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();
    this.setSelectedEntity(duplicate.id, source);
  }

  setEntityLocked(entityId: string, locked: boolean, source: SyncSource = "ui") {
    if (!this.projectModel) return;
    const record = this.projectModel.getEntityById(entityId);
    if (!record || record.item.locked === locked || !this.projectModel.isEntityEffectivelyVisible(entityId)) return;

    record.item.locked = locked;
    if (locked && this.selectedEntityId === entityId) {
      this.setSelectedEntity(null, source);
    }

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: record.kind,
      source
    });
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
