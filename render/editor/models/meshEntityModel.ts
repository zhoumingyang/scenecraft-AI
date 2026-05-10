import type {
  EditorMeshJSON,
  EditorMeshMaterialJSON,
  ResolvedMeshMaterialJSON
} from "../core/types";
import {
  normalizeBoolean,
  normalizeId,
  normalizeNumber,
  normalizeString
} from "../utils/normalize";
import { normalizeMeshMaterial } from "../materials/meshMaterial";
import { BaseEntityModel } from "./baseEntity";

export class MeshEntityModel extends BaseEntityModel {
  meshType: number;
  geometryName: string;
  vertices: EditorMeshJSON["vertices"] extends infer T ? NonNullable<T> : never;
  uvs: EditorMeshJSON["uvs"] extends infer T ? NonNullable<T> : never;
  normals: EditorMeshJSON["normals"] extends infer T ? NonNullable<T> : never;
  indices: number[];
  material: ResolvedMeshMaterialJSON;
  visible: boolean;

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
    this.material = normalizeMeshMaterial(source.material, source);
    this.visible = normalizeBoolean(source.visible, true);
  }

  patchMaterial(source: Partial<EditorMeshMaterialJSON>) {
    this.material = normalizeMeshMaterial({
      ...this.material,
      ...source,
      diffuseMap: source.diffuseMap
        ? { ...this.material.diffuseMap, ...source.diffuseMap }
        : this.material.diffuseMap,
      metalnessMap: source.metalnessMap
        ? { ...this.material.metalnessMap, ...source.metalnessMap }
        : this.material.metalnessMap,
      roughnessMap: source.roughnessMap
        ? { ...this.material.roughnessMap, ...source.roughnessMap }
        : this.material.roughnessMap,
      normalMap: source.normalMap
        ? { ...this.material.normalMap, ...source.normalMap }
        : this.material.normalMap,
      aoMap: source.aoMap ? { ...this.material.aoMap, ...source.aoMap } : this.material.aoMap,
      emissiveMap: source.emissiveMap
        ? { ...this.material.emissiveMap, ...source.emissiveMap }
        : this.material.emissiveMap
    });
  }
}
