import type { MeshMaterialPatch } from "../core/commands";
import type { TextureSchema } from "../core/types";

export const PBR_ATLAS_LAYOUT_VERSION = 1;

export const PBR_ATLAS_FIELDS = [
  "diffuseMap",
  "metalnessMap",
  "roughnessMap",
  "normalMap",
  "aoMap",
  "emissiveMap"
] as const;

export type PbrAtlasTextureField = (typeof PBR_ATLAS_FIELDS)[number];

const PBR_ATLAS_REPEAT = [1 / 3, 1 / 2] as const;

const PBR_ATLAS_OFFSETS: Record<PbrAtlasTextureField, readonly [number, number]> = {
  diffuseMap: [0 / 3, 1 / 2],
  metalnessMap: [1 / 3, 1 / 2],
  roughnessMap: [2 / 3, 1 / 2],
  normalMap: [0 / 3, 0 / 2],
  aoMap: [1 / 3, 0 / 2],
  emissiveMap: [2 / 3, 0 / 2]
};

type PbrAtlasMaterialPatchInput = {
  url: string;
  assetId?: string;
};

function createAtlasTexture(
  field: PbrAtlasTextureField,
  { url, assetId = "" }: PbrAtlasMaterialPatchInput
): TextureSchema {
  const offset = PBR_ATLAS_OFFSETS[field];

  return {
    assetId,
    url,
    externalSource: null,
    offset: [offset[0], offset[1]],
    repeat: [PBR_ATLAS_REPEAT[0], PBR_ATLAS_REPEAT[1]],
    rotation: 0
  };
}

export function createPbrAtlasMaterialPatch(input: PbrAtlasMaterialPatchInput): MeshMaterialPatch {
  return PBR_ATLAS_FIELDS.reduce<MeshMaterialPatch>(
    (patch, field) => ({
      ...patch,
      [field]: createAtlasTexture(field, input)
    }),
    {}
  );
}
