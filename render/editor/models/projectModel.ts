import type { EditorProjectJSON } from "../core/types";
import { normalizeString } from "../utils/normalize";
import { CameraModel } from "./cameraModel";
import { LightEntityModel } from "./lightEntityModel";
import { MeshEntityModel } from "./meshEntityModel";
import { ModelEntityModel } from "./modelEntityModel";

export class EditorProjectModel {
  id: string;
  envPano: string;
  models: Map<string, ModelEntityModel>;
  meshes: Map<string, MeshEntityModel>;
  lights: Map<string, LightEntityModel>;
  camera: CameraModel;

  private constructor(id: string, camera: CameraModel, envPano: string) {
    this.id = id;
    this.envPano = envPano;
    this.camera = camera;
    this.models = new Map();
    this.meshes = new Map();
    this.lights = new Map();
  }

  static fromJSON(source: EditorProjectJSON): EditorProjectModel {
    const id = normalizeString(source.id, `project-${Date.now().toString(36)}`);
    const project = new EditorProjectModel(id, new CameraModel(source.camera), source.envPano ?? "");

    (source.model || []).forEach((item, index) => {
      const model = new ModelEntityModel(index, item);
      project.models.set(model.id, model);
    });

    (source.mesh || []).forEach((item, index) => {
      const mesh = new MeshEntityModel(index, item);
      project.meshes.set(mesh.id, mesh);
    });

    (source.light || []).forEach((item, index) => {
      const light = new LightEntityModel(index, item);
      project.lights.set(light.id, light);
    });

    return project;
  }

  toJSON(): EditorProjectJSON {
    return {
      id: this.id,
      envPano: this.envPano,
      model: Array.from(this.models.values()).map((item) => ({
        id: item.id,
        source: item.source,
        format: item.format,
        assetUnit: item.assetUnit,
        assetImportScale: item.assetImportScale,
        locked: item.locked,
        visible: item.visible,
        position: [...item.position],
        quaternion: [...item.quaternion],
        scale: [...item.scale]
      })),
      mesh: Array.from(this.meshes.values()).map((item) => ({
        id: item.id,
        type: item.meshType,
        geometryName: item.geometryName,
        vertices: item.vertices.map((vertex) => ({ ...vertex })),
        uvs: item.uvs.map((uv) => ({ ...uv })),
        normals: item.normals.map((normal) => ({ ...normal })),
        indices: [...item.indices],
        color: item.color,
        textureUrl: item.textureUrl,
        locked: item.locked,
        visible: item.visible,
        position: [...item.position],
        quaternion: [...item.quaternion],
        scale: [...item.scale]
      })),
      light: Array.from(this.lights.values()).map((item) => ({
        id: item.id,
        type: item.lightType,
        locked: item.locked,
        position: [...item.position],
        quaternion: [...item.quaternion],
        scale: [...item.scale],
        color: item.color,
        intensity: item.intensity,
        distance: item.distance,
        decay: item.decay,
        angle: item.angle,
        penumbra: item.penumbra,
        width: item.width,
        height: item.height
      })),
      camera: {
        type: this.camera.cameraType,
        fov: this.camera.fov,
        position: [...this.camera.position],
        quaternion: [...this.camera.quaternion],
        scale: [...this.camera.scale]
      }
    };
  }

  getEntityById(id: string):
    | { kind: "model"; item: ModelEntityModel }
    | { kind: "mesh"; item: MeshEntityModel }
    | { kind: "light"; item: LightEntityModel }
    | null {
    if (this.models.has(id)) return { kind: "model", item: this.models.get(id)! };
    if (this.meshes.has(id)) return { kind: "mesh", item: this.meshes.get(id)! };
    if (this.lights.has(id)) return { kind: "light", item: this.lights.get(id)! };
    return null;
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

  addLight(source: ConstructorParameters<typeof LightEntityModel>[1]) {
    const light = new LightEntityModel(this.lights.size, source);
    this.lights.set(light.id, light);
    return light;
  }

  removeEntity(id: string) {
    if (this.models.delete(id)) return "model";
    if (this.meshes.delete(id)) return "mesh";
    if (this.lights.delete(id)) return "light";
    return null;
  }
}
