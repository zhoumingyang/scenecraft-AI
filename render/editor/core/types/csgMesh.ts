import type { EditorMeshMaterialJSON } from "./mesh";

export type EditorCsgMeshOperation = "SUBTRACTION" | "INTERSECTION" | "ADDITION";
export type EditorCsgMeshMaterialMode = "sourceParts" | "single";

export type EditorCsgMeshMaterialPartJSON = {
  id: string;
  sourceEntityId: string;
  label?: string;
  material?: EditorMeshMaterialJSON;
};

export type EditorCsgMeshJSON = {
  id: string;
  label?: string;
  operation?: EditorCsgMeshOperation;
  operandIds?: string[];
  materialMode?: EditorCsgMeshMaterialMode;
  material?: EditorMeshMaterialJSON;
  materialParts?: EditorCsgMeshMaterialPartJSON[];
  locked?: boolean;
  visible?: boolean;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};
