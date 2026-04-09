export type Vec3Tuple = [number, number, number];
export type QuatTuple = [number, number, number, number];
export type Vector2Tuple = [number, number];

export type TransformLike = {
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};

export type TransformPatch = {
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};

export type ModelFileFormat = "gltf" | "glb" | "fbx" | "obj";
export type AssetUnit = "m" | "cm" | "mm" | "unknown";
export type ModelAnimationPlaybackState = "playing" | "paused" | "stopped";

export type ModelAnimationClipJSON = {
  id: string;
  name: string;
  duration: number;
};

export type EditorModelJSON = {
  id: string;
  source: string;
  format?: ModelFileFormat;
  assetUnit?: AssetUnit;
  assetImportScale?: number;
  animations?: ModelAnimationClipJSON[];
  activeAnimationId?: string | null;
  animationTimeScale?: number;
  animationPlaybackState?: ModelAnimationPlaybackState;
  locked?: boolean;
  visible?: boolean;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};

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
  url?: string;
  offset?: number[];
  repeat?: number[];
  rotation?: number;
};

export type ResolvedTextureSchema = {
  url: string;
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
};

export type EditorMeshJSON = {
  id: string;
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

export type EditorLightJSON = {
  id: string;
  type: number | string;
  locked?: boolean;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
  color?: string;
  intensity?: number;
  distance?: number;
  decay?: number;
  angle?: number;
  penumbra?: number;
  width?: number;
  height?: number;
};

export type EditorGroupJSON = {
  id: string;
  children: string[];
  locked?: boolean;
  visible?: boolean;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};

export type EditorCameraJSON = {
  type?: number;
  fov?: number;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};

export type EditorEnvConfigJSON = {
  panoUrl?: string;
  environment?: number;
  backgroundShow?: number;
  toneMapping?: number;
  toneMappingExposure?: number;
};

export type EditorProjectJSON = {
  id: string;
  envConfig?: EditorEnvConfigJSON;
  model?: EditorModelJSON[];
  mesh?: EditorMeshJSON[];
  light?: EditorLightJSON[];
  groups?: EditorGroupJSON[];
  camera?: EditorCameraJSON;
};

export type EntityKind = "model" | "mesh" | "light" | "group";
export type SyncSource = "load" | "ui" | "render";

export const SCENE_NODE_ID = "scene";
