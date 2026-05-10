import * as THREE from "three";

import type {
  EditorMeshJSON,
  EditorMeshMaterialJSON,
  ResolvedMeshMaterialJSON,
  ResolvedTextureSchema,
  TextureSchema
} from "../core/types";
import {
  applyTextureColorSpace,
  normalizeMaterialColorSpaces
} from "../runtime/colorManagement";
import {
  clampUnitInterval,
  normalizeColor,
  normalizeNumber,
  normalizeString
} from "../utils/normalize";

function normalizeVec2(value: unknown, fallback: [number, number]): [number, number] {
  if (!Array.isArray(value)) return [...fallback];
  return [normalizeNumber(value[0], fallback[0]), normalizeNumber(value[1], fallback[1])];
}

function normalizeTexture(source?: TextureSchema | null): ResolvedTextureSchema {
  return {
    assetId: normalizeString(source?.assetId),
    url: normalizeString(source?.url),
    externalSource: source?.externalSource ?? null,
    offset: normalizeVec2(source?.offset, [0, 0]),
    repeat: normalizeVec2(source?.repeat, [1, 1]),
    rotation: normalizeNumber(source?.rotation, 0)
  };
}

export function createDefaultMeshMaterialJSON(
  overrides: Partial<EditorMeshMaterialJSON> = {}
): EditorMeshMaterialJSON {
  return {
    color: "#ffffff",
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
    },
    ...overrides
  };
}

export function normalizeMeshMaterial(
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

function configureTexture(texture: THREE.Texture, schema: ResolvedTextureSchema) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.offset.set(schema.offset[0], schema.offset[1]);
  texture.repeat.set(schema.repeat[0], schema.repeat[1]);
  texture.rotation = schema.rotation;
  texture.needsUpdate = true;
}

function applyTexture(
  loader: THREE.TextureLoader,
  schema: ResolvedTextureSchema,
  assign: (texture: THREE.Texture | null) => void,
  role: "color" | "emissive" | "normal" | "roughness" | "metalness" | "ao"
) {
  if (!schema.url) {
    assign(null);
    return;
  }

  loader.load(schema.url, (texture) => {
    configureTexture(texture, schema);
    applyTextureColorSpace(texture, role);
    assign(texture);
  });
}

function disposeTexture(texture: THREE.Texture | null) {
  texture?.dispose();
}

export function disposeMeshStandardMaterialTextures(material: THREE.MeshStandardMaterial) {
  disposeTexture(material.map);
  disposeTexture(material.metalnessMap);
  disposeTexture(material.roughnessMap);
  disposeTexture(material.normalMap);
  disposeTexture(material.aoMap);
  disposeTexture(material.emissiveMap);
}

export function applyMeshStandardMaterial(
  material: THREE.MeshStandardMaterial,
  source: ResolvedMeshMaterialJSON,
  loader: THREE.TextureLoader
) {
  material.color.set(source.color);
  material.opacity = source.opacity;
  material.transparent = source.opacity < 1;
  material.metalness = source.metalness;
  material.roughness = source.roughness;
  material.normalScale.set(source.normalScale[0], source.normalScale[1]);
  material.aoMapIntensity = source.aoMapIntensity;
  material.emissive.set(source.emissive);
  material.emissiveIntensity = source.emissiveIntensity;

  applyTexture(loader, source.diffuseMap, (texture) => {
    material.map = texture;
    material.needsUpdate = true;
  }, "color");
  applyTexture(loader, source.metalnessMap, (texture) => {
    material.metalnessMap = texture;
    material.needsUpdate = true;
  }, "metalness");
  applyTexture(loader, source.roughnessMap, (texture) => {
    material.roughnessMap = texture;
    material.needsUpdate = true;
  }, "roughness");
  applyTexture(loader, source.normalMap, (texture) => {
    material.normalMap = texture;
    material.needsUpdate = true;
  }, "normal");
  applyTexture(loader, source.aoMap, (texture) => {
    material.aoMap = texture;
    material.needsUpdate = true;
  }, "ao");
  applyTexture(loader, source.emissiveMap, (texture) => {
    material.emissiveMap = texture;
    material.needsUpdate = true;
  }, "emissive");

  normalizeMaterialColorSpaces(material);
}
