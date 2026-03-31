import * as THREE from "three";

import type { EditorCommand, MeshMaterialPatch } from "../core/commands";
import type {
  EditorCameraJSON,
  EditorLightJSON,
  EditorProjectJSON,
  SyncSource,
  TransformPatch
} from "../core/types";
import type { EditorAppEvent } from "../core/events";
import { BindingRegistry } from "../bindings/bindingRegistry";
import { updateLightBinding } from "../bindings/lightBinding";
import { updateMeshBindingMaterial } from "../bindings/meshBinding";
import { pickEntityId } from "../interaction/picker";
import { EditorProjectModel } from "../models";
import { createEmptyEditorProjectJSON } from "../factories/projectFactory";
import { EditorRuntime } from "../runtime/editorRuntime";
import { inferModelFileFormat } from "../utils/modelFile";

type Emit = (event: EditorAppEvent) => void;

function createLightEntityId() {
  return globalThis.crypto?.randomUUID?.() ?? `light-${Date.now().toString(36)}`;
}

function createMeshEntityId() {
  return globalThis.crypto?.randomUUID?.() ?? `mesh-${Date.now().toString(36)}`;
}

function createMeshPayload(geometryName: string) {
  const normalizedGeometryName = geometryName.trim() || "Box";
  return {
    id: createMeshEntityId(),
    type: 1,
    geometryName: normalizedGeometryName,
    color: "#d9e8ff",
    textureUrl: "",
    position: [0, 0.8, 0],
    quaternion: [0, 0, 0, 1],
    scale: [1, 1, 1]
  };
}

function createLightPayload(lightType: EditorLightJSON["type"]): EditorLightJSON {
  const normalizedType = typeof lightType === "string" ? lightType : Number(lightType);
  const base: EditorLightJSON = {
    id: createLightEntityId(),
    type: normalizedType,
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
    scale: [1, 1, 1],
    color: "#ffffff",
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

  return base;
}

export class EditorSession {
  private readonly runtime: EditorRuntime;
  private readonly registry: BindingRegistry;
  private readonly emit: Emit;
  private readonly ownedModelUrls = new Set<string>();
  private selectedEntityId: string | null = null;

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
    this.clearProjectObjects();
    this.revokeOwnedModelUrls();
  }

  async loadProject(projectJson: EditorProjectJSON) {
    this.releaseUnusedOwnedModelUrls(projectJson);
    this.clearProjectObjects();

    this.projectModel = EditorProjectModel.fromJSON(projectJson);
    this.runtime.applyCameraModel(this.projectModel.camera);

    this.projectModel.models.forEach((model) => this.registry.create(model));
    this.projectModel.meshes.forEach((mesh) => this.registry.create(mesh));
    this.projectModel.lights.forEach((light) => this.registry.create(light));

    if (this.projectModel.lights.size === 0) {
      this.runtime.scene.add(this.runtime.fallbackAmbientLight);
    }

    this.emit({ type: "projectLoaded", projectId: this.projectModel.id });
  }

  async clearProject() {
    const projectId = this.projectModel?.id;
    await this.loadProject(createEmptyEditorProjectJSON(projectId));
  }

  getProjectJSON(): EditorProjectJSON | null {
    return this.projectModel?.toJSON() ?? null;
  }

  getSelectedEntityId(): string | null {
    return this.selectedEntityId;
  }

  getRenderObject(entityId: string) {
    return this.registry.getObject(entityId);
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
      case "entity.transform":
        this.updateEntityTransform(command.entityId, command.patch, command.source ?? "ui");
        return;
      case "camera.patch":
        this.updateCamera(command.patch, command.source ?? "ui");
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
    }
  }

  async importModel(file: File, source: SyncSource = "ui") {
    const format = inferModelFileFormat(file.name);
    if (!format) return;

    if (!this.projectModel) {
      await this.loadProject(createEmptyEditorProjectJSON());
    }
    if (!this.projectModel) return;

    const objectUrl = URL.createObjectURL(file);
    this.ownedModelUrls.add(objectUrl);

    const model = this.projectModel.addModel({
      id: globalThis.crypto?.randomUUID?.() ?? `model-${Date.now().toString(36)}`,
      source: objectUrl,
      format,
      assetUnit: "m",
      assetImportScale: 1
    });

    this.registry.create(model);
    this.emit({
      type: "entityUpdated",
      entityId: model.id,
      entityKind: "model",
      source
    });
    this.setSelectedEntity(model.id, source);
  }

  updateEntityTransform(entityId: string, patch: TransformPatch, source: SyncSource = "ui") {
    const binding = this.registry.get(entityId);
    if (!binding) return;

    binding.model.patchTransform(patch);
    this.registry.syncModelTransformToObject(entityId);
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: binding.kind,
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

  updateMeshMaterial(
    entityId: string,
    patch: MeshMaterialPatch,
    source: SyncSource = "ui"
  ) {
    const binding = this.registry.get(entityId);
    if (!binding || binding.kind !== "mesh") return;

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

    const mesh = this.projectModel.addMesh(createMeshPayload(geometryName));
    this.registry.create(mesh);
    this.emit({
      type: "entityUpdated",
      entityId: mesh.id,
      entityKind: "mesh",
      source
    });
    this.setSelectedEntity(mesh.id, source);
  }

  updateLight(entityId: string, patch: Partial<EditorLightJSON>, source: SyncSource = "ui") {
    const binding = this.registry.get(entityId);
    if (!binding || binding.kind !== "light") return;

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

    const light = this.projectModel.addLight(createLightPayload(lightType));
    this.runtime.scene.remove(this.runtime.fallbackAmbientLight);
    this.registry.create(light);
    this.emit({
      type: "entityUpdated",
      entityId: light.id,
      entityKind: "light",
      source
    });
    this.setSelectedEntity(light.id, source);
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

  syncRenderChangesToModel() {
    if (this.projectModel && this.runtime.syncCameraModel(this.projectModel.camera)) {
      this.emit({ type: "cameraUpdated", source: "render" });
    }

    this.registry.refresh();

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
    return pickEntityId({
      camera: this.runtime.camera,
      raycaster: this.runtime.raycaster,
      domElement: this.runtime.renderer.domElement,
      pickTargets: this.registry.getPickTargets(),
      clientX,
      clientY
    });
  }

  setSelectedEntity(entityId: string | null, source: SyncSource = "ui") {
    if (this.selectedEntityId === entityId) return;
    this.selectedEntityId = entityId;
    const binding = entityId ? this.registry.get(entityId) : null;
    this.runtime.attachTransformTarget(binding?.object ?? null);
    this.emit({ type: "selectionChanged", selectedEntityId: entityId, source });
  }

  private clearProjectObjects() {
    this.registry.clear();
    this.runtime.scene.remove(this.runtime.fallbackAmbientLight);
    this.projectModel = null;
    this.setSelectedEntity(null, "load");
  }

  private releaseUnusedOwnedModelUrls(projectJson: EditorProjectJSON) {
    const nextSources = new Set((projectJson.model || []).map((item) => item.source));
    Array.from(this.ownedModelUrls).forEach((url) => {
      if (nextSources.has(url)) return;
      URL.revokeObjectURL(url);
      this.ownedModelUrls.delete(url);
    });
  }

  private revokeOwnedModelUrls() {
    Array.from(this.ownedModelUrls).forEach((url) => {
      URL.revokeObjectURL(url);
      this.ownedModelUrls.delete(url);
    });
  }
}
