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

const TEXTURE_FIELDS = [
  "diffuseMap",
  "metalnessMap",
  "roughnessMap",
  "normalMap",
  "aoMap",
  "emissiveMap"
] as const;

type TextureRole = "color" | "emissive" | "normal" | "roughness" | "metalness" | "ao";

const TEXTURE_ROLES: TextureRole[] = ["color", "metalness", "roughness", "normal", "ao", "emissive"];
const TEXTURE_LOAD_TOKENS_KEY = "__editorTextureLoadTokens";

type TextureLoadTokens = Partial<Record<TextureRole, number>>;

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

function getTextureLoadTokens(material: THREE.MeshStandardMaterial): TextureLoadTokens {
  const userData = material.userData as Record<string, unknown>;
  const existing = userData[TEXTURE_LOAD_TOKENS_KEY];
  if (existing && typeof existing === "object") {
    return existing as TextureLoadTokens;
  }

  const tokens: TextureLoadTokens = {};
  userData[TEXTURE_LOAD_TOKENS_KEY] = tokens;
  return tokens;
}

function nextTextureLoadToken(material: THREE.MeshStandardMaterial, role: TextureRole) {
  const tokens = getTextureLoadTokens(material);
  const nextToken = (tokens[role] ?? 0) + 1;
  tokens[role] = nextToken;
  return nextToken;
}

function isTextureLoadCurrent(
  material: THREE.MeshStandardMaterial,
  role: TextureRole,
  token: number
) {
  return getTextureLoadTokens(material)[role] === token;
}

function invalidateTextureLoads(material: THREE.MeshStandardMaterial) {
  TEXTURE_ROLES.forEach((role) => {
    nextTextureLoadToken(material, role);
  });
}

function applyTexture(
  loader: THREE.TextureLoader,
  material: THREE.MeshStandardMaterial,
  schema: ResolvedTextureSchema,
  assign: (texture: THREE.Texture | null) => void,
  role: TextureRole,
  onTextureUpdate?: () => void
) {
  const loadToken = nextTextureLoadToken(material, role);

  if (!schema.url) {
    assign(null);
    onTextureUpdate?.();
    return;
  }

  loader.load(schema.url, (texture) => {
    if (!isTextureLoadCurrent(material, role, loadToken)) {
      texture.dispose();
      return;
    }

    configureTexture(texture, schema);
    applyTextureColorSpace(texture, role);
    assign(texture);
    onTextureUpdate?.();
  });
}

function disposeTexture(texture: THREE.Texture | null) {
  texture?.dispose();
}

export function disposeMeshStandardMaterialTextures(material: THREE.MeshStandardMaterial) {
  invalidateTextureLoads(material);
  disposeTexture(material.map);
  disposeTexture(material.metalnessMap);
  disposeTexture(material.roughnessMap);
  disposeTexture(material.normalMap);
  disposeTexture(material.aoMap);
  disposeTexture(material.emissiveMap);
}

export function hasTextureMaterialPatch(source: Partial<EditorMeshMaterialJSON>) {
  return TEXTURE_FIELDS.some((field) => source[field] !== undefined);
}

export function applyMeshStandardMaterialScalars(
  material: THREE.MeshStandardMaterial,
  source: ResolvedMeshMaterialJSON
) {
  const previousTransparent = material.transparent;
  material.color.set(source.color);
  material.opacity = source.opacity;
  material.transparent = source.opacity < 1;
  material.metalness = source.metalness;
  material.roughness = source.roughness;
  material.normalScale.set(source.normalScale[0], source.normalScale[1]);
  material.aoMapIntensity = source.aoMapIntensity;
  material.emissive.set(source.emissive);
  material.emissiveIntensity = source.emissiveIntensity;

  if (material.transparent !== previousTransparent) {
    material.needsUpdate = true;
  }
}

export function applyMeshStandardMaterial(
  material: THREE.MeshStandardMaterial,
  source: ResolvedMeshMaterialJSON,
  loader: THREE.TextureLoader,
  onTextureUpdate?: () => void
) {
  applyMeshStandardMaterialScalars(material, source);

  applyTexture(loader, material, source.diffuseMap, (texture) => {
    material.map = texture;
    material.needsUpdate = true;
  }, "color", onTextureUpdate);
  applyTexture(loader, material, source.metalnessMap, (texture) => {
    material.metalnessMap = texture;
    material.needsUpdate = true;
  }, "metalness", onTextureUpdate);
  applyTexture(loader, material, source.roughnessMap, (texture) => {
    material.roughnessMap = texture;
    material.needsUpdate = true;
  }, "roughness", onTextureUpdate);
  applyTexture(loader, material, source.normalMap, (texture) => {
    material.normalMap = texture;
    material.needsUpdate = true;
  }, "normal", onTextureUpdate);
  applyTexture(loader, material, source.aoMap, (texture) => {
    material.aoMap = texture;
    material.needsUpdate = true;
  }, "ao", onTextureUpdate);
  applyTexture(loader, material, source.emissiveMap, (texture) => {
    material.emissiveMap = texture;
    material.needsUpdate = true;
  }, "emissive", onTextureUpdate);

  normalizeMaterialColorSpaces(material);
  onTextureUpdate?.();
}
