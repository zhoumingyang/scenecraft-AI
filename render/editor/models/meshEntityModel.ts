import type {
  EditorMeshJSON,
  EditorMeshMaterialJSON,
  ResolvedMeshMaterialJSON,
  ResolvedTextureSchema,
  TextureSchema
} from "../core/types";
import {
  clampUnitInterval,
  normalizeBoolean,
  normalizeColor,
  normalizeId,
  normalizeNumber,
  normalizeString
} from "../utils/normalize";
import { BaseEntityModel } from "./baseEntity";

function normalizeVec2(value: unknown, fallback: [number, number]): [number, number] {
  if (!Array.isArray(value)) return [...fallback];
  return [normalizeNumber(value[0], fallback[0]), normalizeNumber(value[1], fallback[1])];
}

function normalizeTexture(source?: TextureSchema | null): ResolvedTextureSchema {
  return {
    assetId: normalizeString(source?.assetId),
    url: normalizeString(source?.url),
    offset: normalizeVec2(source?.offset, [0, 0]),
    repeat: normalizeVec2(source?.repeat, [1, 1]),
    rotation: normalizeNumber(source?.rotation, 0)
  };
}

function normalizeMaterial(
  source?: EditorMeshMaterialJSON,
  legacy?: Pick<EditorMeshJSON, "color" | "textureUrl">
): ResolvedMeshMaterialJSON {
  return {
    color: normalizeColor(source?.color ?? legacy?.color, "#ffffff"),
    opacity: clampUnitInterval(source?.opacity, 1),
    diffuseMap: normalizeTexture(
      source?.diffuseMap ?? (legacy?.textureUrl ? { url: legacy.textureUrl } : undefined)
    ),
    metalness: clampUnitInterval(source?.metalness, 0),
    metalnessMap: normalizeTexture(source?.metalnessMap),
    roughness: clampUnitInterval(source?.roughness, 1),
    roughnessMap: normalizeTexture(source?.roughnessMap),
    normalMap: normalizeTexture(source?.normalMap),
    normalScale: normalizeVec2(source?.normalScale, [1, 1]),
    aoMap: normalizeTexture(source?.aoMap),
    aoMapIntensity: clampUnitInterval(source?.aoMapIntensity, 1),
    emissive: normalizeColor(source?.emissive, "#000000"),
    emissiveIntensity: normalizeNumber(source?.emissiveIntensity, 1),
    emissiveMap: normalizeTexture(source?.emissiveMap)
  };
}

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
    this.material = normalizeMaterial(source.material, source);
    this.visible = normalizeBoolean(source.visible, true);
  }

  patchMaterial(source: Partial<EditorMeshMaterialJSON>) {
    this.material = normalizeMaterial({
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
