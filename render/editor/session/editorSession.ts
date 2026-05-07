import * as THREE from "three";

import { getExternalAssetIncludedFiles } from "@/lib/externalAssets/source";
import type { ExternalAssetSourceJSON } from "@/lib/externalAssets/types";
import type { Ai3DPlan, Ai3DMeshDraft } from "../ai3d/plan";
import { buildAi3DMeshDrafts } from "../ai3d/plan";
import type { EditorCommand, MeshMaterialPatch } from "../core/commands";
import type {
  EditorCameraJSON,
  EditorEnvConfigJSON,
  EditorLightJSON,
  LightingConflictState,
  EditorProjectJSON,
  ResolvedEditorEnvConfigJSON,
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
import { EditorProjectModel, MeshEntityModel, ModelEntityModel } from "../models";
import { createEmptyEditorProjectJSON } from "../factories/projectFactory";
import { mergeEditorPostProcessingConfig } from "../postProcessing";
import { EditorRuntime } from "../runtime/editorRuntime";
import { createMeshGeometry } from "../utils/geometry";
import { inferModelFileFormat } from "../utils/modelFile";
import { SCENE_NODE_ID as SCENE_SELECTION_ID } from "../core/types";

type Emit = (event: EditorAppEvent) => void;

type EntityVisibilitySnapshot = Map<string, boolean>;

type PreviewMeshRecord = {
  nodeId: string;
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
};

function createPreviewMeshRecord(draft: Ai3DMeshDraft): PreviewMeshRecord {
  const geometry = createMeshGeometry(new MeshEntityModel(0, draft.mesh));
  const material = new THREE.MeshStandardMaterial();
  material.color.set(draft.mesh.material?.color || "#d9e8ff");
  material.opacity = draft.mesh.material?.opacity ?? 1;
  material.transparent = (draft.mesh.material?.opacity ?? 1) < 1;
  material.metalness = draft.mesh.material?.metalness ?? 0;
  material.roughness = draft.mesh.material?.roughness ?? 1;
  material.emissive.set(draft.mesh.material?.emissive || "#000000");
  material.emissiveIntensity = draft.mesh.material?.emissiveIntensity ?? 1;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `ai-preview:${draft.nodeId}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(
    draft.mesh.position?.[0] ?? 0,
    draft.mesh.position?.[1] ?? 0.8,
    draft.mesh.position?.[2] ?? 0
  );
  mesh.quaternion.set(
    draft.mesh.quaternion?.[0] ?? 0,
    draft.mesh.quaternion?.[1] ?? 0,
    draft.mesh.quaternion?.[2] ?? 0,
    draft.mesh.quaternion?.[3] ?? 1
  );
  mesh.scale.set(
    draft.mesh.scale?.[0] ?? 1,
    draft.mesh.scale?.[1] ?? 1,
    draft.mesh.scale?.[2] ?? 1
  );

  return {
    nodeId: draft.nodeId,
    mesh,
    geometry,
    material
  };
}

function disposePreviewMeshRecord(record: PreviewMeshRecord) {
  record.geometry.dispose();
  record.material.dispose();
}

function createEntityId(prefix: "model" | "mesh" | "light" | "group") {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now().toString(36)}`;
}

function formatTitleCase(value: string) {
  if (!value) return "Mesh";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createDefaultGroupLabel(index: number) {
  return `Group ${index + 1}`;
}

function createDefaultModelLabel(index: number) {
  return `Model ${index + 1}`;
}

function createDefaultMeshLabel(geometryName: string, index: number) {
  return `${formatTitleCase(geometryName.trim() || "Mesh")} ${index + 1}`;
}

function createDefaultLightLabel(lightType: EditorLightJSON["type"], index: number) {
  const normalizedType = typeof lightType === "string" ? lightType : Number(lightType);
  const typeLabel =
    normalizedType === 2 || normalizedType === "directional"
      ? "Directional Light"
      : normalizedType === 3 || normalizedType === "point"
        ? "Point Light"
        : normalizedType === 4 || normalizedType === "spot"
          ? "Spot Light"
          : normalizedType === 5 || normalizedType === "rectArea"
            ? "Rect Area Light"
            : normalizedType === 6 || normalizedType === "hemisphere"
              ? "Hemisphere Light"
              : "Ambient Light";
  return `${typeLabel} ${index + 1}`;
}

function getFileBaseName(fileName: string) {
  const trimmed = fileName.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\.[^.]+$/, "").trim();
}

function createLightEntityId() {
  return createEntityId("light");
}

function createMeshEntityId() {
  return createEntityId("mesh");
}

function createGroupEntityId() {
  return createEntityId("group");
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

function createMeshPayload(geometryName: string) {
  const normalizedGeometryName = geometryName.trim() || "Box";
  return {
    id: createMeshEntityId(),
    label: normalizedGeometryName,
    type: 1,
    geometryName: normalizedGeometryName,
    material: {
      color: "#d9e8ff",
      opacity: 1,
      diffuseMap: {
        url: "",
        offset: [0, 0],
        repeat: [1, 1],
        rotation: 0
      },
      metalness: 0,
      metalnessMap: {
        url: "",
        offset: [0, 0],
        repeat: [1, 1],
        rotation: 0
      },
      roughness: 1,
      roughnessMap: {
        url: "",
        offset: [0, 0],
        repeat: [1, 1],
        rotation: 0
      },
      normalMap: {
        url: "",
        offset: [0, 0],
        repeat: [1, 1],
        rotation: 0
      },
      normalScale: [1, 1],
      aoMap: {
        url: "",
        offset: [0, 0],
        repeat: [1, 1],
        rotation: 0
      },
      aoMapIntensity: 1,
      emissive: "#000000",
      emissiveIntensity: 1,
      emissiveMap: {
        url: "",
        offset: [0, 0],
        repeat: [1, 1],
        rotation: 0
      }
    },
    position: [0, 0.8, 0],
    quaternion: [0, 0, 0, 1],
    scale: [1, 1, 1]
  };
}

function createLightPayload(lightType: EditorLightJSON["type"]): EditorLightJSON {
  const normalizedType = typeof lightType === "string" ? lightType : Number(lightType);
  const base: EditorLightJSON = {
    id: createLightEntityId(),
    label: "",
    type: normalizedType,
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
    scale: [1, 1, 1],
    color: "#ffffff",
    groundColor: "#2a3548",
    intensity: 1,
    distance: 0,
    decay: 2,
    angle: Math.PI / 3,
    penumbra: 0,
    width: 1,
    height: 1
  };

  if (normalizedType === 1 || normalizedType === "ambient") {
    base.intensity = 0.55;
  }

  if (normalizedType === 2 || normalizedType === "directional") {
    const helper = new THREE.Object3D();
    helper.position.set(6, 8, 6);
    helper.lookAt(0, 0, 0);
    base.position = [helper.position.x, helper.position.y, helper.position.z];
    base.quaternion = [
      helper.quaternion.x,
      helper.quaternion.y,
      helper.quaternion.z,
      helper.quaternion.w
    ];
    base.intensity = 1.1;
  }

  if (normalizedType === 3 || normalizedType === "point") {
    base.position = [4, 4, 4];
    base.intensity = 90;
    base.distance = 14;
    base.decay = 2;
  }

  if (normalizedType === 4 || normalizedType === "spot") {
    const helper = new THREE.Object3D();
    helper.position.set(5, 7, 5);
    helper.lookAt(0, 0.8, 0);
    base.position = [helper.position.x, helper.position.y, helper.position.z];
    base.quaternion = [
      helper.quaternion.x,
      helper.quaternion.y,
      helper.quaternion.z,
      helper.quaternion.w
    ];
    base.intensity = 160;
    base.distance = 18;
    base.decay = 2;
    base.angle = 0.72;
    base.penumbra = 0.35;
  }

  if (normalizedType === 6 || normalizedType === "hemisphere") {
    base.position = [0, 8, 0];
    base.intensity = 0.9;
    base.color = "#d7ecff";
    base.groundColor = "#2b3244";
  }

  return base;
}

export class EditorSession {
  private readonly runtime: EditorRuntime;
  private readonly registry: BindingRegistry;
  private readonly emit: Emit;
  private readonly ownedModelUrls = new Set<string>();
  private readonly aiPreviewRecords = new Map<string, PreviewMeshRecord>();
  private selectedEntityId: string | null = null;
  private isolatedEntityId: string | null = null;
  private isolatedVisibilitySnapshot: EntityVisibilitySnapshot | null = null;

  projectModel: EditorProjectModel | null = null;

  constructor(runtime: EditorRuntime, emit: Emit) {
    this.runtime = runtime;
    this.emit = emit;
    this.registry = new BindingRegistry({
      scene: runtime.scene,
      modelLoaderFactory: runtime.modelLoaderFactory,
      textureLoader: runtime.textureLoader
    });
  }

  dispose() {
    this.clearAi3DPreview();
    this.clearProjectObjects();
    this.revokeOwnedModelUrls();
  }

  async loadProject(projectJson: EditorProjectJSON) {
    this.releaseUnusedOwnedModelUrls(projectJson);
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
      await Promise.allSettled(pendingBindingReady);
    }

    this.emit({ type: "projectLoaded", projectId: this.projectModel.id });
  }

  async clearProject() {
    const projectId = this.projectModel?.id;
    await this.loadProject(createEmptyEditorProjectJSON(projectId));
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
    if (!this.isolatedVisibilitySnapshot) {
      return projectJson;
    }

    projectJson.groups = (projectJson.groups || []).map((group) => ({
      ...group,
      visible: this.isolatedVisibilitySnapshot?.get(group.id) ?? group.visible
    }));
    projectJson.model = (projectJson.model || []).map((model) => ({
      ...model,
      visible: this.isolatedVisibilitySnapshot?.get(model.id) ?? model.visible
    }));
    projectJson.mesh = (projectJson.mesh || []).map((mesh) => ({
      ...mesh,
      visible: this.isolatedVisibilitySnapshot?.get(mesh.id) ?? mesh.visible
    }));

    return projectJson;
  }

  getSelectedEntityId(): string | null {
    return this.selectedEntityId;
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
    return this.isolatedEntityId;
  }

  getRenderObject(entityId: string) {
    return this.registry.getObject(entityId);
  }

  previewAi3DPlan(plan: Ai3DPlan) {
    const drafts = buildAi3DMeshDrafts(plan);
    this.clearAi3DPreview();

    drafts.forEach((draft) => {
      const record = createPreviewMeshRecord(draft);
      this.runtime.scene.add(record.mesh);
      this.aiPreviewRecords.set(draft.nodeId, record);
    });
  }

  captureAi3DPreviewImages() {
    if (this.aiPreviewRecords.size === 0) {
      return [this.runtime.captureViewportImage("clean")];
    }

    const bindingVisibilitySnapshot = this.registry.list().map((binding) => ({
      binding,
      visible: binding.object.visible
    }));
    const previewVisibilitySnapshot = Array.from(this.aiPreviewRecords.values()).map((record) => ({
      record,
      visible: record.mesh.visible
    }));

    bindingVisibilitySnapshot.forEach(({ binding }) => {
      binding.object.visible = false;
    });
    previewVisibilitySnapshot.forEach(({ record }) => {
      record.mesh.visible = true;
    });

    try {
      return [this.runtime.captureViewportImage("clean")];
    } finally {
      bindingVisibilitySnapshot.forEach(({ binding, visible }) => {
        binding.object.visible = visible;
      });
      previewVisibilitySnapshot.forEach(({ record, visible }) => {
        record.mesh.visible = visible;
      });
    }
  }

  clearAi3DPreview() {
    this.aiPreviewRecords.forEach((record) => {
      this.runtime.scene.remove(record.mesh);
      disposePreviewMeshRecord(record);
    });
    this.aiPreviewRecords.clear();
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
        this.selectModelAnimation(command.entityId, command.animationId, command.source ?? "ui");
        return;
      case "model.animation.timeScale":
        this.updateModelAnimationTimeScale(command.entityId, command.timeScale, command.source ?? "ui");
        return;
      case "model.animation.control":
        this.controlModelAnimation(command.entityId, command.action, command.source ?? "ui");
        return;
    }
  }

  async importModel(file: File, source: SyncSource = "ui") {
    const format = inferModelFileFormat(file.name);
    if (!format) return null;

    if (!this.projectModel) {
      await this.loadProject(createEmptyEditorProjectJSON());
    }
    if (!this.projectModel) return null;

    const objectUrl = URL.createObjectURL(file);
    this.ownedModelUrls.add(objectUrl);
    let asset;
    try {
      asset = await this.runtime.modelLoaderFactory.load(objectUrl, format);
    } catch (error) {
      this.runtime.modelLoaderFactory.release(objectUrl, format);
      URL.revokeObjectURL(objectUrl);
      this.ownedModelUrls.delete(objectUrl);
      throw error;
    }

    const model = this.projectModel.addModel({
      id: createEntityId("model"),
      label: getFileBaseName(file.name) || createDefaultModelLabel(this.projectModel.models.size),
      source: objectUrl,
      format,
      externalSource: null,
      assetUnit: "m",
      assetImportScale: 1,
      animations: asset.animations,
      activeAnimationId: asset.animations[0]?.id ?? null,
      animationTimeScale: 1,
      animationPlaybackState: asset.animations.length > 0 ? "playing" : "stopped"
    });

    this.registry.create(model);
    this.emit({
      type: "entityUpdated",
      entityId: model.id,
      entityKind: "model",
      source
    });
    this.setSelectedEntity(model.id, source);
    return {
      entityId: model.id,
      sourceUrl: objectUrl
    };
  }

  async importModelFromSource(
    input: {
      sourceUrl: string;
      format: "gltf" | "fbx";
      label: string;
      externalSource: ExternalAssetSourceJSON;
    },
    source: SyncSource = "ui"
  ) {
    if (!this.projectModel) {
      await this.loadProject(createEmptyEditorProjectJSON());
    }
    if (!this.projectModel) return null;

    const asset = await this.runtime.modelLoaderFactory.load(input.sourceUrl, input.format, {
      includedFiles: getExternalAssetIncludedFiles(input.externalSource)
    });
    const model = this.projectModel.addModel({
      id: createEntityId("model"),
      label: input.label.trim() || createDefaultModelLabel(this.projectModel.models.size),
      source: input.sourceUrl,
      sourceAssetId: "",
      externalSource: input.externalSource,
      format: input.format,
      assetUnit: "m",
      assetImportScale: 1,
      animations: asset.animations,
      activeAnimationId: asset.animations[0]?.id ?? null,
      animationTimeScale: 1,
      animationPlaybackState: asset.animations.length > 0 ? "playing" : "stopped"
    });

    this.registry.create(model);
    this.emit({
      type: "entityUpdated",
      entityId: model.id,
      entityKind: "model",
      source
    });
    this.setSelectedEntity(model.id, source);
    return {
      entityId: model.id,
      sourceUrl: input.sourceUrl
    };
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
      source
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
        : this.projectModel.envConfig.postProcessing
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
    this.emit({ type: "sceneUpdated", source });
    this.emit({ type: "viewStateUpdated" });
  }

  updateMeshMaterial(
    entityId: string,
    patch: MeshMaterialPatch,
    source: SyncSource = "ui"
  ) {
    const binding = this.registry.get(entityId);
    if (!binding || binding.kind !== "mesh" || binding.model.locked) return;

    updateMeshBindingMaterial(binding, this.runtime.textureLoader, patch);
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "mesh",
      source
    });
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
      source
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
      source: "render"
    });
  }

  syncRenderChangesToModel(deltaSeconds = 0) {
    if (this.projectModel && this.runtime.syncCameraModel(this.projectModel.camera)) {
      this.emit({ type: "cameraUpdated", source: "render" });
    }

    this.registry.refresh(deltaSeconds);

    this.registry.syncAllObjectTransformsToModel().forEach((binding) => {
      this.emit({
        type: "entityUpdated",
        entityId: binding.model.id,
        entityKind: binding.kind,
        source: "render"
      });
    });
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
    if (this.isolatedVisibilitySnapshot) {
      this.clearEntityIsolation(source);
    }
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
    if (this.isolatedVisibilitySnapshot) {
      this.clearEntityIsolation(source);
    }
    const record = this.projectModel.getEntityById(entityId);
    if (!record || record.item.locked || !this.projectModel.isEntityEffectivelyVisible(entityId)) return;

    const duplicate = this.cloneEntity(entityId, source);
    if (!duplicate) return;

    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();
    this.setSelectedEntity(duplicate.id, source);
  }

  private cloneEntity(entityId: string, source: SyncSource) {
    if (!this.projectModel) return null;
    const record = this.projectModel.getEntityById(entityId);
    if (!record || record.item.locked) return null;

    if (record.kind === "group") {
      const childIds = record.item.children
        .map((childId) => this.cloneEntity(childId, source)?.id ?? null)
        .filter((childId): childId is string => Boolean(childId));

      const duplicate = this.projectModel.addGroup({
        id: createEntityId("group"),
        label: record.item.label,
        children: childIds,
        locked: false,
        visible: record.item.visible,
        position: [...record.item.position],
        quaternion: [...record.item.quaternion],
        scale: [...record.item.scale]
      });
      this.registry.create(duplicate);
      this.emit({
        type: "entityUpdated",
        entityId: duplicate.id,
        entityKind: "group",
        source
      });
      return { id: duplicate.id, kind: "group" as const };
    }

    if (record.kind === "model") {
      const duplicate = this.projectModel.addModel({
        id: createEntityId("model"),
        label: record.item.label,
        source: record.item.source,
        sourceAssetId: record.item.sourceAssetId,
        externalSource: record.item.externalSource ?? undefined,
        format: record.item.format,
        assetUnit: record.item.assetUnit,
        assetImportScale: record.item.assetImportScale,
        animations: record.item.animations.map((clip) => ({ ...clip })),
        activeAnimationId: record.item.activeAnimationId,
        animationTimeScale: record.item.animationTimeScale,
        animationPlaybackState: record.item.animationPlaybackState,
        locked: false,
        visible: record.item.visible,
        position: [...record.item.position],
        quaternion: [...record.item.quaternion],
        scale: [...record.item.scale]
      });
      this.registry.create(duplicate);
      this.emit({
        type: "entityUpdated",
        entityId: duplicate.id,
        entityKind: "model",
        source
      });
      return { id: duplicate.id, kind: "model" as const };
    }

    if (record.kind === "mesh") {
      const duplicate = this.projectModel.addMesh({
        id: createEntityId("mesh"),
        label: record.item.label,
        type: record.item.meshType,
        geometryName: record.item.geometryName,
        vertices: record.item.vertices.map((vertex) => ({ ...vertex })),
        uvs: record.item.uvs.map((uv) => ({ ...uv })),
        normals: record.item.normals.map((normal) => ({ ...normal })),
        indices: [...record.item.indices],
        material: {
          color: record.item.material.color,
          opacity: record.item.material.opacity,
          diffuseMap: {
            assetId: record.item.material.diffuseMap.assetId,
            url: record.item.material.diffuseMap.url,
            externalSource: record.item.material.diffuseMap.externalSource ?? undefined,
            offset: [...record.item.material.diffuseMap.offset],
            repeat: [...record.item.material.diffuseMap.repeat],
            rotation: record.item.material.diffuseMap.rotation
          },
          metalness: record.item.material.metalness,
          metalnessMap: {
            assetId: record.item.material.metalnessMap.assetId,
            url: record.item.material.metalnessMap.url,
            externalSource: record.item.material.metalnessMap.externalSource ?? undefined,
            offset: [...record.item.material.metalnessMap.offset],
            repeat: [...record.item.material.metalnessMap.repeat],
            rotation: record.item.material.metalnessMap.rotation
          },
          roughness: record.item.material.roughness,
          roughnessMap: {
            assetId: record.item.material.roughnessMap.assetId,
            url: record.item.material.roughnessMap.url,
            externalSource: record.item.material.roughnessMap.externalSource ?? undefined,
            offset: [...record.item.material.roughnessMap.offset],
            repeat: [...record.item.material.roughnessMap.repeat],
            rotation: record.item.material.roughnessMap.rotation
          },
          normalMap: {
            assetId: record.item.material.normalMap.assetId,
            url: record.item.material.normalMap.url,
            externalSource: record.item.material.normalMap.externalSource ?? undefined,
            offset: [...record.item.material.normalMap.offset],
            repeat: [...record.item.material.normalMap.repeat],
            rotation: record.item.material.normalMap.rotation
          },
          normalScale: [...record.item.material.normalScale],
          aoMap: {
            assetId: record.item.material.aoMap.assetId,
            url: record.item.material.aoMap.url,
            externalSource: record.item.material.aoMap.externalSource ?? undefined,
            offset: [...record.item.material.aoMap.offset],
            repeat: [...record.item.material.aoMap.repeat],
            rotation: record.item.material.aoMap.rotation
          },
          aoMapIntensity: record.item.material.aoMapIntensity,
          emissive: record.item.material.emissive,
          emissiveIntensity: record.item.material.emissiveIntensity,
          emissiveMap: {
            assetId: record.item.material.emissiveMap.assetId,
            url: record.item.material.emissiveMap.url,
            externalSource: record.item.material.emissiveMap.externalSource ?? undefined,
            offset: [...record.item.material.emissiveMap.offset],
            repeat: [...record.item.material.emissiveMap.repeat],
            rotation: record.item.material.emissiveMap.rotation
          }
        },
        locked: false,
        visible: record.item.visible,
        position: [...record.item.position],
        quaternion: [...record.item.quaternion],
        scale: [...record.item.scale]
      });
      this.registry.create(duplicate);
      this.emit({
        type: "entityUpdated",
        entityId: duplicate.id,
        entityKind: "mesh",
        source
      });
      return { id: duplicate.id, kind: "mesh" as const };
    }

    if (record.kind !== "light") {
      return null;
    }

    const duplicate = this.projectModel.addLight({
      id: createEntityId("light"),
      label: record.item.label,
      type: record.item.lightType,
      locked: false,
      position: [...record.item.position],
      quaternion: [...record.item.quaternion],
      scale: [...record.item.scale],
      color: record.item.color,
      groundColor: record.item.groundColor,
      intensity: record.item.intensity,
      distance: record.item.distance,
      decay: record.item.decay,
      angle: record.item.angle,
      penumbra: record.item.penumbra,
      width: record.item.width,
      height: record.item.height
    });
    this.registry.create(duplicate);
    this.emit({
      type: "entityUpdated",
      entityId: duplicate.id,
      entityKind: "light",
      source
    });
    return { id: duplicate.id, kind: "light" as const };
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
    if (!this.projectModel) return;
    const record = this.projectModel.getEntityById(entityId);
    if (!record || record.kind === "light" || record.item.locked) return;

    if (this.isolatedEntityId === entityId) {
      this.clearEntityIsolation(source);
      return;
    }

    if (this.isolatedVisibilitySnapshot) {
      this.clearEntityIsolation(source);
    }

    const snapshot = this.captureEntityVisibilitySnapshot();
    const keepVisibleIds = this.collectIsolationVisibleIds(entityId);

    snapshot.forEach((visible, targetEntityId) => {
      const nextVisible = keepVisibleIds.has(targetEntityId) ? visible : false;
      this.applyEntityVisibleState(targetEntityId, nextVisible, source);
    });

    this.isolatedEntityId = entityId;
    this.isolatedVisibilitySnapshot = snapshot;
    this.emit({ type: "viewStateUpdated" });
  }

  setEntityVisible(entityId: string, visible: boolean, source: SyncSource = "ui") {
    if (!this.projectModel) return;
    if (this.isolatedVisibilitySnapshot) {
      this.clearEntityIsolation(source);
    }
    const record = this.projectModel.getEntityById(entityId);
    if (!record || record.item.locked || record.kind === "light") return;
    this.applyEntityVisibleState(entityId, visible, source);
  }

  private clearProjectObjects() {
    this.registry.clear();
    this.projectModel = null;
    this.isolatedEntityId = null;
    this.isolatedVisibilitySnapshot = null;
    this.setSelectedEntity(null, "load");
  }

  private captureEntityVisibilitySnapshot(): EntityVisibilitySnapshot {
    const snapshot: EntityVisibilitySnapshot = new Map();
    if (!this.projectModel) return snapshot;

    this.projectModel.groups.forEach((group) => {
      snapshot.set(group.id, group.visible);
    });
    this.projectModel.models.forEach((model) => {
      snapshot.set(model.id, model.visible);
    });
    this.projectModel.meshes.forEach((mesh) => {
      snapshot.set(mesh.id, mesh.visible);
    });

    return snapshot;
  }

  private collectIsolationVisibleIds(entityId: string) {
    const keepVisibleIds = new Set<string>([entityId]);
    if (!this.projectModel) return keepVisibleIds;

    let currentEntityId = entityId;
    let parentGroupId = this.projectModel.getParentGroupId(currentEntityId);
    while (parentGroupId) {
      keepVisibleIds.add(parentGroupId);
      currentEntityId = parentGroupId;
      parentGroupId = this.projectModel.getParentGroupId(currentEntityId);
    }

    const record = this.projectModel.getEntityById(entityId);
    if (record?.kind === "group") {
      this.collectGroupDescendantIds(entityId, keepVisibleIds);
    }

    return keepVisibleIds;
  }

  private collectGroupDescendantIds(groupId: string, keepVisibleIds: Set<string>) {
    if (!this.projectModel) return;

    this.projectModel.listDirectChildren(groupId).forEach((childId) => {
      const childRecord = this.projectModel?.getEntityById(childId);
      if (!childRecord || childRecord.kind === "light") return;

      keepVisibleIds.add(childId);
      if (childRecord.kind === "group") {
        this.collectGroupDescendantIds(childId, keepVisibleIds);
      }
    });
  }

  private clearEntityIsolation(source: SyncSource) {
    const snapshot = this.isolatedVisibilitySnapshot;
    if (!snapshot) return;

    this.isolatedEntityId = null;
    this.isolatedVisibilitySnapshot = null;

    snapshot.forEach((visible, entityId) => {
      this.applyEntityVisibleState(entityId, visible, source);
    });

    this.emit({ type: "viewStateUpdated" });
  }

  private applyEntityVisibleState(entityId: string, visible: boolean, source: SyncSource) {
    if (!this.projectModel) return;
    const record = this.projectModel.getEntityById(entityId);
    if (!record || record.kind === "light" || record.item.visible === visible) return;

    record.item.visible = visible;
    const binding = this.registry.get(entityId);
    binding?.applyState?.();

    if (this.selectedEntityId && !this.projectModel.isEntityEffectivelyVisible(this.selectedEntityId)) {
      this.setSelectedEntity(null, source);
    }

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: record.kind,
      source
    });
  }

  private releaseUnusedOwnedModelUrls(projectJson: EditorProjectJSON) {
    const nextSources = new Set((projectJson.model || []).map((item) => item.source));
    Array.from(this.ownedModelUrls).forEach((url) => {
      if (nextSources.has(url)) return;
      const model = this.projectModel
        ? Array.from(this.projectModel.models.values()).find((item) => item.source === url)
        : null;
      if (model) {
        this.runtime.modelLoaderFactory.release(url, model.format);
      }
      URL.revokeObjectURL(url);
      this.ownedModelUrls.delete(url);
    });
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

  private revokeOwnedModelUrls() {
    Array.from(this.ownedModelUrls).forEach((url) => {
      const model = this.projectModel
        ? Array.from(this.projectModel.models.values()).find((item) => item.source === url)
        : null;
      if (model) {
        this.runtime.modelLoaderFactory.release(url, model.format);
      }
      URL.revokeObjectURL(url);
      this.ownedModelUrls.delete(url);
    });
  }

  private selectModelAnimation(entityId: string, animationId: string, source: SyncSource = "ui") {
    const binding = this.registry.get(entityId);
    if (!binding || binding.kind !== "model" || binding.model.locked) return;
    const model = binding.model as ModelEntityModel;
    if (!binding.modelAnimation?.hasClip(animationId)) return;

    model.setActiveAnimation(animationId);
    model.animationPlaybackState = "playing";
    binding.modelAnimation.applyState();
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "model",
      source
    });
  }

  private updateModelAnimationTimeScale(entityId: string, timeScale: number, source: SyncSource = "ui") {
    const binding = this.registry.get(entityId);
    if (!binding || binding.kind !== "model" || binding.model.locked) return;
    const model = binding.model as ModelEntityModel;

    model.animationTimeScale = THREE.MathUtils.clamp(timeScale, 0.1, 4);
    binding.modelAnimation?.applyState();
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "model",
      source
    });
  }

  private controlModelAnimation(
    entityId: string,
    action: "play" | "pause" | "stop" | "step",
    source: SyncSource = "ui"
  ) {
    const binding = this.registry.get(entityId);
    if (!binding || binding.kind !== "model" || binding.model.locked) return;
    const model = binding.model as ModelEntityModel;
    if (!model.animations.length) return;

    if (!model.activeAnimationId) {
      model.activeAnimationId = model.animations[0].id;
    }

    if (action === "play") {
      if (model.animationPlaybackState === "playing") return;
      model.animationPlaybackState = "playing";
      binding.modelAnimation?.applyState();
    } else if (action === "pause") {
      if (model.animationPlaybackState !== "playing") return;
      model.animationPlaybackState = "paused";
      binding.modelAnimation?.applyState();
    } else if (action === "stop") {
      if (model.animationPlaybackState === "stopped") return;
      model.animationPlaybackState = "stopped";
      binding.modelAnimation?.applyState();
    } else if (action === "step") {
      model.animationPlaybackState = "paused";
      const stepped = binding.modelAnimation?.step() ?? false;
      if (!stepped) return;
    }

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "model",
      source
    });
  }
}
