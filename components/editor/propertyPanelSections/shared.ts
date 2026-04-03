export type LightNumberField = "intensity" | "distance" | "decay" | "width" | "height";
export type LightNumberDraft = Record<LightNumberField, string>;
export type TextureFieldKey =
  | "diffuseMap"
  | "metalnessMap"
  | "roughnessMap"
  | "normalMap"
  | "aoMap"
  | "emissiveMap";
