import * as THREE from "three";

import type {
  EditorMeshJSON,
  EditorMeshMaterialJSON,
  ResolvedMeshMaterialJSON,
  ResolvedTextureSchema,
  TextureSchema
} from "../core/types";
import { MATERIAL_TEXTURE_FIELDS, type MaterialTextureField } from "./materialFields";
import {
  applyTextureColorSpace,
  type EditorTextureRole,
  normalizeMaterialColorSpaces
} from "../runtime/colorManagement";
import {
  clampUnitInterval,
  normalizeColor,
  normalizeNumber,
  normalizeString
} from "../utils/normalize";

const TEXTURE_LOAD_TOKENS_KEY = "__editorTextureLoadTokens";

type TextureLoadTokens = Partial<Record<MaterialTextureField, number>>;

const TEXTURE_COLOR_SPACE_ROLES: Record<MaterialTextureField, EditorTextureRole> = {
  diffuseMap: "color",
  metalnessMap: "metalness",
  roughnessMap: "roughness",
  normalMap: "normal",
  aoMap: "ao",
  emissiveMap: "emissive",
  specularIntensityMap: "physicalData",
  specularColorMap: "color",
  clearcoatMap: "physicalData",
  clearcoatRoughnessMap: "physicalData",
  clearcoatNormalMap: "normal",
  transmissionMap: "physicalData",
  thicknessMap: "physicalData",
  sheenColorMap: "color",
  sheenRoughnessMap: "physicalData",
  iridescenceMap: "physicalData",
  iridescenceThicknessMap: "physicalData",
  anisotropyMap: "physicalData"
};

function normalizeVec2(value: unknown, fallback: [number, number]): [number, number] {
  if (!Array.isArray(value)) return [...fallback];
  return [normalizeNumber(value[0], fallback[0]), normalizeNumber(value[1], fallback[1])];
}

function normalizeRange(value: unknown, fallback: [number, number]): [number, number] {
  const normalized = normalizeVec2(value, fallback);
  return normalized[0] <= normalized[1] ? normalized : [normalized[1], normalized[0]];
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

function createDefaultTexture(): TextureSchema {
  return {
    url: "",
    offset: [0, 0],
    repeat: [1, 1],
    rotation: 0
  };
}

export function createDefaultMeshMaterialJSON(
  overrides: Partial<EditorMeshMaterialJSON> = {}
): EditorMeshMaterialJSON {
  return {
    color: "#ffffff",
    opacity: 1,
    diffuseMap: createDefaultTexture(),
    metalness: 0,
    metalnessMap: createDefaultTexture(),
    roughness: 1,
    roughnessMap: createDefaultTexture(),
    normalMap: createDefaultTexture(),
    normalScale: [1, 1],
    aoMap: createDefaultTexture(),
    aoMapIntensity: 1,
    emissive: "#000000",
    emissiveIntensity: 1,
    emissiveMap: createDefaultTexture(),
    ior: 1.5,
    specularIntensity: 1,
    specularColor: "#ffffff",
    specularIntensityMap: createDefaultTexture(),
    specularColorMap: createDefaultTexture(),
    clearcoat: 0,
    clearcoatMap: createDefaultTexture(),
    clearcoatRoughness: 0,
    clearcoatRoughnessMap: createDefaultTexture(),
    clearcoatNormalMap: createDefaultTexture(),
    clearcoatNormalScale: [1, 1],
    transmission: 0,
    transmissionMap: createDefaultTexture(),
    thickness: 0,
    thicknessMap: createDefaultTexture(),
    attenuationDistance: 1000,
    attenuationColor: "#ffffff",
    dispersion: 0,
    sheen: 0,
    sheenColor: "#000000",
    sheenColorMap: createDefaultTexture(),
    sheenRoughness: 1,
    sheenRoughnessMap: createDefaultTexture(),
    iridescence: 0,
    iridescenceMap: createDefaultTexture(),
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 400],
    iridescenceThicknessMap: createDefaultTexture(),
    anisotropy: 0,
    anisotropyMap: createDefaultTexture(),
    anisotropyRotation: 0,
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
    emissiveMap: normalizeTexture(source?.emissiveMap),
    ior: THREE.MathUtils.clamp(normalizeNumber(source?.ior, 1.5), 1, 2.333),
    specularIntensity: clampUnitInterval(source?.specularIntensity, 1),
    specularColor: normalizeColor(source?.specularColor, "#ffffff"),
    specularIntensityMap: normalizeTexture(source?.specularIntensityMap),
    specularColorMap: normalizeTexture(source?.specularColorMap),
    clearcoat: clampUnitInterval(source?.clearcoat, 0),
    clearcoatMap: normalizeTexture(source?.clearcoatMap),
    clearcoatRoughness: clampUnitInterval(source?.clearcoatRoughness, 0),
    clearcoatRoughnessMap: normalizeTexture(source?.clearcoatRoughnessMap),
    clearcoatNormalMap: normalizeTexture(source?.clearcoatNormalMap),
    clearcoatNormalScale: normalizeVec2(source?.clearcoatNormalScale, [1, 1]),
    transmission: clampUnitInterval(source?.transmission, 0),
    transmissionMap: normalizeTexture(source?.transmissionMap),
    thickness: Math.max(0, normalizeNumber(source?.thickness, 0)),
    thicknessMap: normalizeTexture(source?.thicknessMap),
    attenuationDistance: Math.max(0, normalizeNumber(source?.attenuationDistance, 1000)),
    attenuationColor: normalizeColor(source?.attenuationColor, "#ffffff"),
    dispersion: Math.max(0, normalizeNumber(source?.dispersion, 0)),
    sheen: clampUnitInterval(source?.sheen, 0),
    sheenColor: normalizeColor(source?.sheenColor, "#000000"),
    sheenColorMap: normalizeTexture(source?.sheenColorMap),
    sheenRoughness: clampUnitInterval(source?.sheenRoughness, 1),
    sheenRoughnessMap: normalizeTexture(source?.sheenRoughnessMap),
    iridescence: clampUnitInterval(source?.iridescence, 0),
    iridescenceMap: normalizeTexture(source?.iridescenceMap),
    iridescenceIOR: THREE.MathUtils.clamp(normalizeNumber(source?.iridescenceIOR, 1.3), 1, 2.333),
    iridescenceThicknessRange: normalizeRange(source?.iridescenceThicknessRange, [100, 400]),
    iridescenceThicknessMap: normalizeTexture(source?.iridescenceThicknessMap),
    anisotropy: clampUnitInterval(source?.anisotropy, 0),
    anisotropyMap: normalizeTexture(source?.anisotropyMap),
    anisotropyRotation: normalizeNumber(source?.anisotropyRotation, 0)
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

function getTextureLoadTokens(material: THREE.MeshPhysicalMaterial): TextureLoadTokens {
  const userData = material.userData as Record<string, unknown>;
  const existing = userData[TEXTURE_LOAD_TOKENS_KEY];
  if (existing && typeof existing === "object") {
    return existing as TextureLoadTokens;
  }

  const tokens: TextureLoadTokens = {};
  userData[TEXTURE_LOAD_TOKENS_KEY] = tokens;
  return tokens;
}

function nextTextureLoadToken(material: THREE.MeshPhysicalMaterial, role: MaterialTextureField) {
  const tokens = getTextureLoadTokens(material);
  const nextToken = (tokens[role] ?? 0) + 1;
  tokens[role] = nextToken;
  return nextToken;
}

function isTextureLoadCurrent(
  material: THREE.MeshPhysicalMaterial,
  role: MaterialTextureField,
  token: number
) {
  return getTextureLoadTokens(material)[role] === token;
}

function invalidateTextureLoads(material: THREE.MeshPhysicalMaterial) {
  MATERIAL_TEXTURE_FIELDS.forEach((field) => {
    nextTextureLoadToken(material, field);
  });
}

function applyTexture(
  loader: THREE.TextureLoader,
  material: THREE.MeshPhysicalMaterial,
  schema: ResolvedTextureSchema,
  assign: (texture: THREE.Texture | null) => void,
  field: MaterialTextureField,
  onTextureUpdate?: () => void
) {
  const loadToken = nextTextureLoadToken(material, field);

  if (!schema.url) {
    assign(null);
    onTextureUpdate?.();
    return;
  }

  loader.load(schema.url, (texture) => {
    if (!isTextureLoadCurrent(material, field, loadToken)) {
      texture.dispose();
      return;
    }

    configureTexture(texture, schema);
    applyTextureColorSpace(texture, TEXTURE_COLOR_SPACE_ROLES[field]);
    assign(texture);
    onTextureUpdate?.();
  });
}

function disposeTexture(texture: THREE.Texture | null) {
  texture?.dispose();
}

export function disposeMeshPhysicalMaterialTextures(material: THREE.MeshPhysicalMaterial) {
  invalidateTextureLoads(material);
  disposeTexture(material.map);
  disposeTexture(material.metalnessMap);
  disposeTexture(material.roughnessMap);
  disposeTexture(material.normalMap);
  disposeTexture(material.aoMap);
  disposeTexture(material.emissiveMap);
  disposeTexture(material.specularIntensityMap);
  disposeTexture(material.specularColorMap);
  disposeTexture(material.clearcoatMap);
  disposeTexture(material.clearcoatRoughnessMap);
  disposeTexture(material.clearcoatNormalMap);
  disposeTexture(material.transmissionMap);
  disposeTexture(material.thicknessMap);
  disposeTexture(material.sheenColorMap);
  disposeTexture(material.sheenRoughnessMap);
  disposeTexture(material.iridescenceMap);
  disposeTexture(material.iridescenceThicknessMap);
  disposeTexture(material.anisotropyMap);
}

export function hasTextureMaterialPatch(source: Partial<EditorMeshMaterialJSON>) {
  return MATERIAL_TEXTURE_FIELDS.some((field) => source[field] !== undefined);
}

export function applyMeshPhysicalMaterialScalars(
  material: THREE.MeshPhysicalMaterial,
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
  material.ior = source.ior;
  material.specularIntensity = source.specularIntensity;
  material.specularColor.set(source.specularColor);
  material.clearcoat = source.clearcoat;
  material.clearcoatRoughness = source.clearcoatRoughness;
  material.clearcoatNormalScale.set(
    source.clearcoatNormalScale[0],
    source.clearcoatNormalScale[1]
  );
  material.transmission = source.transmission;
  material.thickness = source.thickness;
  material.attenuationDistance = source.attenuationDistance;
  material.attenuationColor.set(source.attenuationColor);
  material.dispersion = source.dispersion;
  material.sheen = source.sheen;
  material.sheenColor.set(source.sheenColor);
  material.sheenRoughness = source.sheenRoughness;
  material.iridescence = source.iridescence;
  material.iridescenceIOR = source.iridescenceIOR;
  material.iridescenceThicknessRange = [...source.iridescenceThicknessRange];
  material.anisotropy = source.anisotropy;
  material.anisotropyRotation = source.anisotropyRotation;

  if (material.transparent !== previousTransparent) {
    material.needsUpdate = true;
  }
}

export function applyMeshPhysicalMaterial(
  material: THREE.MeshPhysicalMaterial,
  source: ResolvedMeshMaterialJSON,
  loader: THREE.TextureLoader,
  onTextureUpdate?: () => void
) {
  applyMeshPhysicalMaterialScalars(material, source);

  applyTexture(loader, material, source.diffuseMap, (texture) => {
    material.map = texture;
    material.needsUpdate = true;
  }, "diffuseMap", onTextureUpdate);
  applyTexture(loader, material, source.metalnessMap, (texture) => {
    material.metalnessMap = texture;
    material.needsUpdate = true;
  }, "metalnessMap", onTextureUpdate);
  applyTexture(loader, material, source.roughnessMap, (texture) => {
    material.roughnessMap = texture;
    material.needsUpdate = true;
  }, "roughnessMap", onTextureUpdate);
  applyTexture(loader, material, source.normalMap, (texture) => {
    material.normalMap = texture;
    material.needsUpdate = true;
  }, "normalMap", onTextureUpdate);
  applyTexture(loader, material, source.aoMap, (texture) => {
    material.aoMap = texture;
    material.needsUpdate = true;
  }, "aoMap", onTextureUpdate);
  applyTexture(loader, material, source.emissiveMap, (texture) => {
    material.emissiveMap = texture;
    material.needsUpdate = true;
  }, "emissiveMap", onTextureUpdate);
  applyTexture(loader, material, source.specularIntensityMap, (texture) => {
    material.specularIntensityMap = texture;
    material.needsUpdate = true;
  }, "specularIntensityMap", onTextureUpdate);
  applyTexture(loader, material, source.specularColorMap, (texture) => {
    material.specularColorMap = texture;
    material.needsUpdate = true;
  }, "specularColorMap", onTextureUpdate);
  applyTexture(loader, material, source.clearcoatMap, (texture) => {
    material.clearcoatMap = texture;
    material.needsUpdate = true;
  }, "clearcoatMap", onTextureUpdate);
  applyTexture(loader, material, source.clearcoatRoughnessMap, (texture) => {
    material.clearcoatRoughnessMap = texture;
    material.needsUpdate = true;
  }, "clearcoatRoughnessMap", onTextureUpdate);
  applyTexture(loader, material, source.clearcoatNormalMap, (texture) => {
    material.clearcoatNormalMap = texture;
    material.needsUpdate = true;
  }, "clearcoatNormalMap", onTextureUpdate);
  applyTexture(loader, material, source.transmissionMap, (texture) => {
    material.transmissionMap = texture;
    material.needsUpdate = true;
  }, "transmissionMap", onTextureUpdate);
  applyTexture(loader, material, source.thicknessMap, (texture) => {
    material.thicknessMap = texture;
    material.needsUpdate = true;
  }, "thicknessMap", onTextureUpdate);
  applyTexture(loader, material, source.sheenColorMap, (texture) => {
    material.sheenColorMap = texture;
    material.needsUpdate = true;
  }, "sheenColorMap", onTextureUpdate);
  applyTexture(loader, material, source.sheenRoughnessMap, (texture) => {
    material.sheenRoughnessMap = texture;
    material.needsUpdate = true;
  }, "sheenRoughnessMap", onTextureUpdate);
  applyTexture(loader, material, source.iridescenceMap, (texture) => {
    material.iridescenceMap = texture;
    material.needsUpdate = true;
  }, "iridescenceMap", onTextureUpdate);
  applyTexture(loader, material, source.iridescenceThicknessMap, (texture) => {
    material.iridescenceThicknessMap = texture;
    material.needsUpdate = true;
  }, "iridescenceThicknessMap", onTextureUpdate);
  applyTexture(loader, material, source.anisotropyMap, (texture) => {
    material.anisotropyMap = texture;
    material.needsUpdate = true;
  }, "anisotropyMap", onTextureUpdate);

  normalizeMaterialColorSpaces(material);
  onTextureUpdate?.();
}

function cloneExternalSource(source: ResolvedTextureSchema["externalSource"]) {
  if (!source) return null;
  return {
    ...source,
    selectedFile: {
      ...source.selectedFile,
      ...(source.selectedFile.includes
        ? {
            includes: source.selectedFile.includes.map((include) => ({
              path: include.path,
              url: include.url,
              sizeBytes: include.sizeBytes,
              md5: include.md5
            }))
          }
        : {})
    }
  };
}

export function serializeTextureSchema(source: ResolvedTextureSchema): TextureSchema {
  return {
    assetId: source.assetId,
    url: source.url,
    externalSource: cloneExternalSource(source.externalSource) ?? undefined,
    offset: [...source.offset],
    repeat: [...source.repeat],
    rotation: source.rotation
  };
}

export function serializeMeshMaterial(source: ResolvedMeshMaterialJSON): EditorMeshMaterialJSON {
  const material: EditorMeshMaterialJSON = {
    color: source.color,
    opacity: source.opacity,
    metalness: source.metalness,
    roughness: source.roughness,
    normalScale: [...source.normalScale],
    aoMapIntensity: source.aoMapIntensity,
    emissive: source.emissive,
    emissiveIntensity: source.emissiveIntensity,
    ior: source.ior,
    specularIntensity: source.specularIntensity,
    specularColor: source.specularColor,
    clearcoat: source.clearcoat,
    clearcoatRoughness: source.clearcoatRoughness,
    clearcoatNormalScale: [...source.clearcoatNormalScale],
    transmission: source.transmission,
    thickness: source.thickness,
    attenuationDistance: source.attenuationDistance,
    attenuationColor: source.attenuationColor,
    dispersion: source.dispersion,
    sheen: source.sheen,
    sheenColor: source.sheenColor,
    sheenRoughness: source.sheenRoughness,
    iridescence: source.iridescence,
    iridescenceIOR: source.iridescenceIOR,
    iridescenceThicknessRange: [...source.iridescenceThicknessRange],
    anisotropy: source.anisotropy,
    anisotropyRotation: source.anisotropyRotation
  };

  MATERIAL_TEXTURE_FIELDS.forEach((field) => {
    material[field] = serializeTextureSchema(source[field]);
  });

  return material;
}

export function mergeMeshMaterialPatch(
  material: ResolvedMeshMaterialJSON,
  patch: Partial<EditorMeshMaterialJSON>
) {
  const merged: EditorMeshMaterialJSON = {
    ...material,
    ...patch
  };

  MATERIAL_TEXTURE_FIELDS.forEach((field) => {
    if (patch[field]) {
      merged[field] = {
        ...material[field],
        ...patch[field]
      };
    }
  });

  return normalizeMeshMaterial(merged);
}
