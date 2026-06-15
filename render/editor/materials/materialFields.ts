export const BASE_MATERIAL_TEXTURE_FIELDS = [
  "diffuseMap",
  "metalnessMap",
  "roughnessMap",
  "normalMap",
  "aoMap",
  "emissiveMap"
] as const;

export const PHYSICAL_MATERIAL_TEXTURE_FIELDS = [
  "specularIntensityMap",
  "specularColorMap",
  "clearcoatMap",
  "clearcoatRoughnessMap",
  "clearcoatNormalMap",
  "transmissionMap",
  "thicknessMap",
  "sheenColorMap",
  "sheenRoughnessMap",
  "iridescenceMap",
  "iridescenceThicknessMap",
  "anisotropyMap"
] as const;

export const MATERIAL_TEXTURE_FIELDS = [
  ...BASE_MATERIAL_TEXTURE_FIELDS,
  ...PHYSICAL_MATERIAL_TEXTURE_FIELDS
] as const;

export type BaseMaterialTextureField = (typeof BASE_MATERIAL_TEXTURE_FIELDS)[number];
export type PhysicalMaterialTextureField = (typeof PHYSICAL_MATERIAL_TEXTURE_FIELDS)[number];
export type MaterialTextureField = (typeof MATERIAL_TEXTURE_FIELDS)[number];
