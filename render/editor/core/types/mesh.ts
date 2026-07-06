import type { ExternalAssetSourceJSON } from "@/lib/externalAssets/types";
import type { Vec3Tuple } from "./shared";

export type EditorMeshVertexJSON = {
  x: number;
  y: number;
  z: number;
};

export type EditorMeshUvJSON = {
  x: number;
  y: number;
};

export type TextureSchema = {
  assetId?: string;
  url?: string;
  externalSource?: ExternalAssetSourceJSON | null;
  offset?: number[];
  repeat?: number[];
  rotation?: number;
};

export type ResolvedTextureSchema = {
  assetId: string;
  url: string;
  externalSource: ExternalAssetSourceJSON | null;
  offset: [number, number];
  repeat: [number, number];
  rotation: number;
};

export type EditorMeshMaterialJSON = {
  color?: string;
  opacity?: number;
  diffuseMap?: TextureSchema;
  metalness?: number;
  metalnessMap?: TextureSchema;
  roughness?: number;
  roughnessMap?: TextureSchema;
  normalMap?: TextureSchema;
  normalScale?: number[];
  aoMap?: TextureSchema;
  aoMapIntensity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  emissiveMap?: TextureSchema;
  ior?: number;
  specularIntensity?: number;
  specularColor?: string;
  specularIntensityMap?: TextureSchema;
  specularColorMap?: TextureSchema;
  clearcoat?: number;
  clearcoatMap?: TextureSchema;
  clearcoatRoughness?: number;
  clearcoatRoughnessMap?: TextureSchema;
  clearcoatNormalMap?: TextureSchema;
  clearcoatNormalScale?: number[];
  transmission?: number;
  transmissionMap?: TextureSchema;
  thickness?: number;
  thicknessMap?: TextureSchema;
  attenuationDistance?: number;
  attenuationColor?: string;
  dispersion?: number;
  sheen?: number;
  sheenColor?: string;
  sheenColorMap?: TextureSchema;
  sheenRoughness?: number;
  sheenRoughnessMap?: TextureSchema;
  iridescence?: number;
  iridescenceMap?: TextureSchema;
  iridescenceIOR?: number;
  iridescenceThicknessRange?: number[];
  iridescenceThicknessMap?: TextureSchema;
  anisotropy?: number;
  anisotropyMap?: TextureSchema;
  anisotropyRotation?: number;
};

export type ResolvedMeshMaterialJSON = {
  color: string;
  opacity: number;
  diffuseMap: ResolvedTextureSchema;
  metalness: number;
  metalnessMap: ResolvedTextureSchema;
  roughness: number;
  roughnessMap: ResolvedTextureSchema;
  normalMap: ResolvedTextureSchema;
  normalScale: [number, number];
  aoMap: ResolvedTextureSchema;
  aoMapIntensity: number;
  emissive: string;
  emissiveIntensity: number;
  emissiveMap: ResolvedTextureSchema;
  ior: number;
  specularIntensity: number;
  specularColor: string;
  specularIntensityMap: ResolvedTextureSchema;
  specularColorMap: ResolvedTextureSchema;
  clearcoat: number;
  clearcoatMap: ResolvedTextureSchema;
  clearcoatRoughness: number;
  clearcoatRoughnessMap: ResolvedTextureSchema;
  clearcoatNormalMap: ResolvedTextureSchema;
  clearcoatNormalScale: [number, number];
  transmission: number;
  transmissionMap: ResolvedTextureSchema;
  thickness: number;
  thicknessMap: ResolvedTextureSchema;
  attenuationDistance: number;
  attenuationColor: string;
  dispersion: number;
  sheen: number;
  sheenColor: string;
  sheenColorMap: ResolvedTextureSchema;
  sheenRoughness: number;
  sheenRoughnessMap: ResolvedTextureSchema;
  iridescence: number;
  iridescenceMap: ResolvedTextureSchema;
  iridescenceIOR: number;
  iridescenceThicknessRange: [number, number];
  iridescenceThicknessMap: ResolvedTextureSchema;
  anisotropy: number;
  anisotropyMap: ResolvedTextureSchema;
  anisotropyRotation: number;
};

export type EditorGroundMode = "grid" | "plane";

export type EditorGroundConfigJSON = {
  mode?: EditorGroundMode;
  visible?: boolean;
  scale?: number[];
  material?: EditorMeshMaterialJSON;
};

export type ResolvedEditorGroundConfigJSON = {
  mode: EditorGroundMode;
  visible: boolean;
  scale: Vec3Tuple;
  material: ResolvedMeshMaterialJSON;
};

export type EditorMeshJSON = {
  id: string;
  label?: string;
  type: number;
  geometryName?: string;
  vertices?: EditorMeshVertexJSON[];
  uvs?: EditorMeshUvJSON[];
  normals?: EditorMeshVertexJSON[];
  indices?: number[];
  color?: string;
  textureUrl?: string;
  material?: EditorMeshMaterialJSON;
  locked?: boolean;
  visible?: boolean;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};
