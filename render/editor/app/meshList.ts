import type { EditorProjectModel } from "../models";

export type EditorMeshListItem = {
  id: string;
  label: string;
};

function formatTitleCase(value: string) {
  if (!value) return "Mesh";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getEditorMeshList(
  projectModel: EditorProjectModel | null
): EditorMeshListItem[] {
  const meshes = projectModel?.meshes;
  if (!meshes) return [];
  return Array.from(meshes.values())
    .filter((mesh) => !projectModel?.isMeshConsumedByCsg(mesh.id))
    .map((mesh, index) => ({
      id: mesh.id,
      label: mesh.label || `${formatTitleCase(mesh.geometryName)} ${index + 1}`
    }));
}
