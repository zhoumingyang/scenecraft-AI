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

export type EditorModelJSON = {
  id: string;
  source: string;
  format?: ModelFileFormat;
  assetUnit?: AssetUnit;
  assetImportScale?: number;
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
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};

export type EditorLightJSON = {
  id: string;
  type: number | string;
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

export type EditorCameraJSON = {
  type?: number;
  fov?: number;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};

export type EditorProjectJSON = {
  id: string;
  model?: EditorModelJSON[];
  mesh?: EditorMeshJSON[];
  light?: EditorLightJSON[];
  camera?: EditorCameraJSON;
};

export type EntityKind = "model" | "mesh" | "light";
export type SyncSource = "load" | "ui" | "render";
