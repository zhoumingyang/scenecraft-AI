export { createEditorApp, EditorApp } from "./app";
export type { EditorMeshListItem } from "./app";
export type { Ai3DOperation, Ai3DPlan, Ai3DPrimitiveType, Ai3DToolCall } from "./ai3d/plan";
export {
  AI3D_PRIMITIVE_TYPES,
  AI3D_SHAPE_PRESETS,
  AI3D_TOOL_NAME,
  AI3D_TUBE_PRESETS,
  ai3dOperationSchema,
  ai3dPlanSchema,
  ai3dToolCallSchema,
  assertAi3DPlanSemantics,
  validateAi3DPlan,
  validateAi3DToolCall
} from "./ai3d/plan";
export { createEditorSdk } from "./sdk";
export type { EditorSdk } from "./sdk";
export type { EditorCommand, MeshMaterialPatch } from "./core/commands";
export {
  BaseEntityModel,
  CameraModel,
  EditorProjectModel,
  LightEntityModel,
  MeshEntityModel,
  ModelEntityModel
} from "./models";
export { createDefaultEditorProjectJSON, createEmptyEditorProjectJSON } from "./factories/projectFactory";
export { getLightPresetDefinition, LIGHT_PRESET_DEFINITIONS, LIGHT_PRESET_IDS } from "./lightPresets";
export type { LightPresetDefinition, LightPresetId, LightPresetLightDefinition } from "./lightPresets";
export * from "./core/types";
export * from "./core/events";
export * from "./utils/normalize";
export * from "./utils/geometry";
export * from "./utils/object3d";
export * from "./utils/math";
export * from "./utils/modelFile";
