import type { ModelFileFormat } from "../core/types";

export function inferModelFileFormat(fileName: string): ModelFileFormat | null {
  const normalized = fileName.trim().toLowerCase();
  if (normalized.endsWith(".gltf")) return "gltf";
  if (normalized.endsWith(".glb")) return "glb";
  if (normalized.endsWith(".fbx")) return "fbx";
  if (normalized.endsWith(".obj")) return "obj";
  if (normalized.endsWith(".vrm")) return "vrm";
  return null;
}
