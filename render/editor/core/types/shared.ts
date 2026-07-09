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

export type EntityKind = "model" | "mesh" | "csgMesh" | "light" | "group";
export type SyncSource = "load" | "ui" | "render";

export type LightingConflictState = {
  hasConflict: boolean;
  hasAmbientLight: boolean;
  hasHemisphereLight: boolean;
};
