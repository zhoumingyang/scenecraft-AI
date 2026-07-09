import type {
  EditorProjectMetaJSON,
  EditorProjectJSON,
  EditorProjectThumbnailJSON,
  ResolvedEditorEnvConfigJSON
} from "../core/types";
import { normalizeString } from "../utils/normalize";
import { CameraModel } from "./cameraModel";
import { CsgMeshEntityModel } from "./csgMeshEntityModel";
import { GroupEntityModel } from "./groupEntityModel";
import { LightEntityModel } from "./lightEntityModel";
import { MeshEntityModel } from "./meshEntityModel";
import { ModelEntityModel } from "./modelEntityModel";
import {
  normalizeEnvConfig,
  normalizeProjectMeta,
  normalizeProjectThumbnail,
  serializeProjectModel
} from "./projectModelSerialization";

export class EditorProjectModel {
  id: string;
  meta: EditorProjectMetaJSON | null;
  thumbnail: EditorProjectThumbnailJSON | null;
  envConfig: ResolvedEditorEnvConfigJSON;
  models: Map<string, ModelEntityModel>;
  meshes: Map<string, MeshEntityModel>;
  csgMeshes: Map<string, CsgMeshEntityModel>;
  lights: Map<string, LightEntityModel>;
  groups: Map<string, GroupEntityModel>;
  camera: CameraModel;

  private constructor(
    id: string,
    camera: CameraModel,
    envConfig: ResolvedEditorEnvConfigJSON,
    meta: EditorProjectMetaJSON | null,
    thumbnail: EditorProjectThumbnailJSON | null
  ) {
    this.id = id;
    this.meta = meta;
    this.thumbnail = thumbnail;
    this.envConfig = envConfig;
    this.camera = camera;
    this.models = new Map();
    this.meshes = new Map();
    this.csgMeshes = new Map();
    this.lights = new Map();
    this.groups = new Map();
  }

  static fromJSON(source: EditorProjectJSON): EditorProjectModel {
    const id = normalizeString(source.id, `project-${Date.now().toString(36)}`);
    const project = new EditorProjectModel(
      id,
      new CameraModel(source.camera),
      normalizeEnvConfig(source.envConfig),
      normalizeProjectMeta(source.meta),
      normalizeProjectThumbnail(source.thumbnail)
    );

    ((source.groups || []) as NonNullable<EditorProjectJSON["groups"]>).forEach((item, index) => {
      const group = new GroupEntityModel(index, item);
      project.groups.set(group.id, group);
    });

    (source.model || []).forEach((item, index) => {
      const model = new ModelEntityModel(index, item);
      project.models.set(model.id, model);
    });

    (source.mesh || []).forEach((item, index) => {
      const mesh = new MeshEntityModel(index, item);
      project.meshes.set(mesh.id, mesh);
    });

    (source.csgMesh || []).forEach((item, index) => {
      const csgMesh = new CsgMeshEntityModel(index, item);
      project.csgMeshes.set(csgMesh.id, csgMesh);
    });

    (source.light || []).forEach((item, index) => {
      const light = new LightEntityModel(index, item);
      project.lights.set(light.id, light);
    });

    return project;
  }

  toJSON(): EditorProjectJSON {
    return serializeProjectModel(this);
  }

  getEntityById(id: string):
    | { kind: "group"; item: GroupEntityModel }
    | { kind: "model"; item: ModelEntityModel }
    | { kind: "mesh"; item: MeshEntityModel }
    | { kind: "csgMesh"; item: CsgMeshEntityModel }
    | { kind: "light"; item: LightEntityModel }
    | null {
    if (this.groups.has(id)) return { kind: "group", item: this.groups.get(id)! };
    if (this.models.has(id)) return { kind: "model", item: this.models.get(id)! };
    if (this.meshes.has(id)) return { kind: "mesh", item: this.meshes.get(id)! };
    if (this.csgMeshes.has(id)) return { kind: "csgMesh", item: this.csgMeshes.get(id)! };
    if (this.lights.has(id)) return { kind: "light", item: this.lights.get(id)! };
    return null;
  }

  getParentGroupId(childId: string) {
    for (const group of this.groups.values()) {
      if (group.children.includes(childId)) {
        return group.id;
      }
    }
    return null;
  }

  listDirectChildren(groupId: string) {
    return this.groups.get(groupId)?.children ?? [];
  }

  isEntityEffectivelyVisible(id: string) {
    const record = this.getEntityById(id);
    if (!record) return false;

    if ("visible" in record.item && !record.item.visible) {
      return false;
    }

    let parentGroupId = this.getParentGroupId(id);
    while (parentGroupId) {
      const parentGroup = this.groups.get(parentGroupId);
      if (!parentGroup?.visible) {
        return false;
      }
      parentGroupId = this.getParentGroupId(parentGroupId);
    }

    return true;
  }

  getCsgOwnerForMesh(meshId: string) {
    for (const csgMesh of this.csgMeshes.values()) {
      if (csgMesh.operandIds.includes(meshId)) {
        return csgMesh;
      }
    }
    return null;
  }

  isMeshConsumedByCsg(meshId: string) {
    return Boolean(this.getCsgOwnerForMesh(meshId));
  }

  addModel(source: ConstructorParameters<typeof ModelEntityModel>[1]) {
    const model = new ModelEntityModel(this.models.size, source);
    this.models.set(model.id, model);
    return model;
  }

  addMesh(source: ConstructorParameters<typeof MeshEntityModel>[1]) {
    const mesh = new MeshEntityModel(this.meshes.size, source);
    this.meshes.set(mesh.id, mesh);
    return mesh;
  }

  addCsgMesh(source: ConstructorParameters<typeof CsgMeshEntityModel>[1]) {
    const csgMesh = new CsgMeshEntityModel(this.csgMeshes.size, source);
    this.csgMeshes.set(csgMesh.id, csgMesh);
    return csgMesh;
  }

  addLight(source: ConstructorParameters<typeof LightEntityModel>[1]) {
    const light = new LightEntityModel(this.lights.size, source);
    this.lights.set(light.id, light);
    return light;
  }

  addGroup(source: ConstructorParameters<typeof GroupEntityModel>[1]) {
    const group = new GroupEntityModel(this.groups.size, source);
    this.groups.set(group.id, group);
    return group;
  }

  removeEntity(id: string) {
    const group = this.groups.get(id);
    if (group) {
      const parentGroupId = this.getParentGroupId(id);
      this.groups.delete(id);
      this.groups.forEach((item) => {
        if (item.id === parentGroupId) {
          const nextChildren: string[] = [];
          item.children.forEach((childId) => {
            if (childId === id) {
              nextChildren.push(...group.children);
              return;
            }
            nextChildren.push(childId);
          });
          item.children = nextChildren;
          return;
        }
        item.children = item.children.filter((childId) => childId !== id);
      });
      return "group";
    }
    this.groups.forEach((group) => {
      group.children = group.children.filter((childId) => childId !== id);
    });
    if (this.models.delete(id)) return "model";
    if (this.meshes.delete(id)) return "mesh";
    if (this.csgMeshes.delete(id)) return "csgMesh";
    if (this.lights.delete(id)) return "light";
    return null;
  }
}
