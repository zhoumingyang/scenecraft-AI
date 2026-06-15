import type { MaterialTextureField } from "@/render/editor/materials/materialFields";

export type LightNumberField = "intensity" | "distance" | "decay" | "width" | "height";
export type LightNumberDraft = Record<LightNumberField, string>;
export type TextureFieldKey = MaterialTextureField;
