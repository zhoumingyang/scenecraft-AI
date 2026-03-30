import * as THREE from "three";

import {
  DEFAULT_POSITION,
  DEFAULT_QUATERNION,
  DEFAULT_SCALE,
  normalizeColor,
  normalizeId,
  normalizeLightType,
  normalizeNumber,
  normalizeQuat,
  normalizeString,
  normalizeVec3
} from "./util";
import type {
  EditorCameraJSON,
  EditorLightJSON,
  EditorMeshJSON,
  EditorMeshUvJSON,
  EditorMeshVertexJSON,
  EditorModelJSON,
  EditorProjectJSON,
  QuatTuple,
  TransformLike,
  TransformPatch,
  Vec3Tuple
} from "./typings";

export class BaseEntityModel {
  readonly id: string;
  position: Vec3Tuple;
  quaternion: QuatTuple;
  scale: Vec3Tuple;

  constructor(id: string, transform?: TransformLike) {
    this.id = id;
    this.position = normalizeVec3(transform?.position, DEFAULT_POSITION);
    this.quaternion = normalizeQuat(transform?.quaternion, DEFAULT_QUATERNION);
    this.scale = normalizeVec3(transform?.scale, DEFAULT_SCALE);
  }

  patchTransform(patch: TransformPatch) {
    if (patch.position) {
      this.position = normalizeVec3(patch.position, this.position);
    }
    if (patch.quaternion) {
      this.quaternion = normalizeQuat(patch.quaternion, this.quaternion);
    }
    if (patch.scale) {
      this.scale = normalizeVec3(patch.scale, this.scale);
    }
  }

  copyTransformFromObject(object: THREE.Object3D) {
    this.position = [object.position.x, object.position.y, object.position.z];
    this.quaternion = [
      object.quaternion.x,
      object.quaternion.y,
      object.quaternion.z,
      object.quaternion.w
    ];
    this.scale = [object.scale.x, object.scale.y, object.scale.z];
  }

  applyTransformToObject(object: THREE.Object3D) {
    object.position.set(this.position[0], this.position[1], this.position[2]);
    object.quaternion.set(
      this.quaternion[0],
      this.quaternion[1],
      this.quaternion[2],
      this.quaternion[3]
    );
    object.scale.set(this.scale[0], this.scale[1], this.scale[2]);
  }
}

export class ModelEntityModel extends BaseEntityModel {
  source: string;

  constructor(index: number, source: EditorModelJSON) {
    super(normalizeId("model", source.id, index), source);
    this.source = normalizeString(source.source);
  }
}

export class MeshEntityModel extends BaseEntityModel {
  meshType: number;
  geometryName: string;
  vertices: EditorMeshVertexJSON[];
  uvs: EditorMeshUvJSON[];
  normals: EditorMeshVertexJSON[];
  indices: number[];
  color: string;
  textureUrl: string;

  constructor(index: number, source: EditorMeshJSON) {
    super(normalizeId("mesh", source.id, index), source);
    this.meshType = normalizeNumber(source.type, 1);
    this.geometryName = normalizeString(source.geometryName, "Box");
    this.vertices = Array.isArray(source.vertices)
      ? source.vertices.map((v) => ({
          x: normalizeNumber(v?.x, 0),
          y: normalizeNumber(v?.y, 0),
          z: normalizeNumber(v?.z, 0)
        }))
      : [];
    this.uvs = Array.isArray(source.uvs)
      ? source.uvs.map((uv) => ({
          x: normalizeNumber(uv?.x, 0),
          y: normalizeNumber(uv?.y, 0)
        }))
      : [];
    this.normals = Array.isArray(source.normals)
      ? source.normals.map((n) => ({
          x: normalizeNumber(n?.x, 0),
          y: normalizeNumber(n?.y, 0),
          z: normalizeNumber(n?.z, 1)
        }))
      : [];
    this.indices = Array.isArray(source.indices)
      ? source.indices.filter((item) => typeof item === "number" && Number.isFinite(item))
      : [];
    this.color = normalizeColor(source.color, "#ffffff");
    this.textureUrl = normalizeString(source.textureUrl);
  }
}

export class LightEntityModel extends BaseEntityModel {
  lightType: number;
  color: string;
  intensity: number;
  distance: number;
  decay: number;
  angle: number;
  penumbra: number;
  width: number;
  height: number;

  constructor(index: number, source: EditorLightJSON) {
    super(normalizeId("light", source.id, index), source);
    this.lightType = normalizeLightType(source.type);
    this.color = normalizeColor(source.color, "#ffffff");
    this.intensity = normalizeNumber(source.intensity, 1);
    this.distance = normalizeNumber(source.distance, 0);
    this.decay = normalizeNumber(source.decay, 2);
    this.angle = normalizeNumber(source.angle, Math.PI / 3);
    this.penumbra = THREE.MathUtils.clamp(normalizeNumber(source.penumbra, 0), 0, 1);
    this.width = normalizeNumber(source.width, 1);
    this.height = normalizeNumber(source.height, 1);
  }
}

export class CameraModel extends BaseEntityModel {
  cameraType: number;
  fov: number;

  constructor(source?: EditorCameraJSON) {
    super("camera", source);
    this.cameraType = normalizeNumber(source?.type, 1);
    this.fov = normalizeNumber(source?.fov, 60);
  }

  patch(source: Partial<EditorCameraJSON>) {
    if (source.type !== undefined) {
      this.cameraType = normalizeNumber(source.type, this.cameraType);
    }
    if (source.fov !== undefined) {
      this.fov = normalizeNumber(source.fov, this.fov);
    }
    this.patchTransform(source);
  }
}

export class EditorProjectModel {
  id: string;
  models: Map<string, ModelEntityModel>;
  meshes: Map<string, MeshEntityModel>;
  lights: Map<string, LightEntityModel>;
  camera: CameraModel;

  private constructor(id: string, camera: CameraModel) {
    this.id = id;
    this.camera = camera;
    this.models = new Map();
    this.meshes = new Map();
    this.lights = new Map();
  }

  static fromJSON(source: EditorProjectJSON): EditorProjectModel {
    const id = normalizeString(source.id, `project-${Date.now().toString(36)}`);
    const project = new EditorProjectModel(id, new CameraModel(source.camera));

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
      model: Array.from(this.models.values()).map((item) => ({
        id: item.id,
        source: item.source,
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
        position: [...item.position],
        quaternion: [...item.quaternion],
        scale: [...item.scale]
      })),
      light: Array.from(this.lights.values()).map((item) => ({
        id: item.id,
        type: item.lightType,
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
}

export type EntityModel = ModelEntityModel | MeshEntityModel | LightEntityModel;
