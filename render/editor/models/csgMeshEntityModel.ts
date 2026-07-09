import type {
  EditorCsgMeshJSON,
  EditorCsgMeshMaterialMode,
  EditorCsgMeshMaterialPartJSON,
  EditorCsgMeshOperation,
  EditorMeshMaterialJSON,
  ResolvedMeshMaterialJSON
} from "../core/types";
import { normalizeBoolean, normalizeId, normalizeString } from "../utils/normalize";
import {
  createDefaultMeshMaterialJSON,
  mergeMeshMaterialPatch,
  serializeMeshMaterial,
  normalizeMeshMaterial
} from "../materials/meshMaterial";
import { BaseEntityModel } from "./baseEntity";

const CSG_OPERATIONS: EditorCsgMeshOperation[] = ["SUBTRACTION", "INTERSECTION", "ADDITION"];

function normalizeOperation(value: unknown): EditorCsgMeshOperation {
  return typeof value === "string" && CSG_OPERATIONS.includes(value as EditorCsgMeshOperation)
    ? (value as EditorCsgMeshOperation)
    : "SUBTRACTION";
}

function normalizeMaterialMode(value: unknown): EditorCsgMeshMaterialMode {
  return value === "single" ? "single" : "sourceParts";
}

function normalizeOperandIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((item) => normalizeString(item)).filter(Boolean))
  );
}

function normalizeMaterialParts(value: unknown): EditorCsgMeshMaterialPartJSON[] {
  if (!Array.isArray(value)) return [];
  const output: EditorCsgMeshMaterialPartJSON[] = [];
  value.forEach((item, index) => {
      const source = item as Partial<EditorCsgMeshMaterialPartJSON> | null;
      const sourceEntityId = normalizeString(source?.sourceEntityId);
      if (!sourceEntityId) return;
      const id = normalizeString(source?.id, `operand:${sourceEntityId}:${index}`);
      const label = normalizeString(source?.label);
      output.push({
        id,
        sourceEntityId,
        ...(label ? { label } : {}),
        ...(source?.material ? { material: source.material } : {})
      });
    });
  return output;
}

export class CsgMeshEntityModel extends BaseEntityModel {
  operation: EditorCsgMeshOperation;
  operandIds: string[];
  materialMode: EditorCsgMeshMaterialMode;
  material: ResolvedMeshMaterialJSON;
  materialParts: EditorCsgMeshMaterialPartJSON[];
  visible: boolean;

  constructor(index: number, source: EditorCsgMeshJSON) {
    super(normalizeId("mesh", source.id, index), source);
    this.operation = normalizeOperation(source.operation);
    this.operandIds = normalizeOperandIds(source.operandIds);
    this.materialMode = normalizeMaterialMode(source.materialMode);
    this.material = normalizeMeshMaterial(source.material ?? createDefaultMeshMaterialJSON());
    this.materialParts = normalizeMaterialParts(source.materialParts);
    this.visible = normalizeBoolean(source.visible, true);
  }

  patchMaterial(source: Partial<EditorMeshMaterialJSON>) {
    this.material = mergeMeshMaterialPatch(this.material, source);
  }

  setOperation(operation: EditorCsgMeshOperation) {
    this.operation = normalizeOperation(operation);
  }

  setMaterialMode(materialMode: EditorCsgMeshMaterialMode) {
    this.materialMode = normalizeMaterialMode(materialMode);
  }

  getMaterialPart(sourceEntityId: string) {
    return this.materialParts.find((part) => part.sourceEntityId === sourceEntityId) ?? null;
  }

  patchMaterialPart(sourceEntityId: string, patch: Partial<EditorMeshMaterialJSON> | null) {
    const existingIndex = this.materialParts.findIndex((part) => part.sourceEntityId === sourceEntityId);
    if (!patch) {
      if (existingIndex >= 0) {
        const existing = this.materialParts[existingIndex];
        this.materialParts[existingIndex] = {
          id: existing.id,
          sourceEntityId: existing.sourceEntityId,
          ...(existing.label ? { label: existing.label } : {})
        };
      }
      return;
    }

    if (existingIndex >= 0) {
      const existing = this.materialParts[existingIndex];
      const base = existing.material
        ? normalizeMeshMaterial(existing.material)
        : normalizeMeshMaterial(createDefaultMeshMaterialJSON());
      this.materialParts[existingIndex] = {
        ...existing,
        material: serializeMeshMaterial(mergeMeshMaterialPatch(base, patch))
      };
      return;
    }

    this.materialParts.push({
      id: `operand:${sourceEntityId}`,
      sourceEntityId,
      material: serializeMeshMaterial(normalizeMeshMaterial(patch))
    });
  }
}
