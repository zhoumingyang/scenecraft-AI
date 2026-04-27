import type { EditorMeshJSON, EditorMeshMaterialJSON } from "../core/types";
import {
  createExtrudedShapePresetGeometry,
  createShapePresetGeometry,
  createTubePresetGeometry,
  geometryToCustomMesh
} from "../utils/geometry";
import {
  AI3D_PRIMITIVE_TYPES,
  AI3D_SHAPE_PRESETS,
  AI3D_TOOL_NAME,
  AI3D_TUBE_PRESETS,
  MAX_AI_3D_PRIMITIVES
} from "./constants/plan";
import { z } from "zod";

const ai3dNodeIdSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z][a-z0-9_]*$/, "nodeId must use lowercase snake_case.");

const ai3dLabelSchema = z.string().trim().min(1).max(80);
const ai3dVec3Schema = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const ai3dQuatSchema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite()
]);
const ai3dColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a 6-digit hex string.");

const ai3dTransformPatchSchema = z
  .object({
    position: ai3dVec3Schema.optional(),
    quaternion: ai3dQuatSchema.optional(),
    scale: ai3dVec3Schema.optional()
  })
  .strict()
  .refine((value) => value.position || value.quaternion || value.scale, {
    message: "Transform patch must include at least one field."
  });

const ai3dMaterialPatchSchema = z
  .object({
    color: ai3dColorSchema.optional(),
    opacity: z.number().finite().min(0).max(1).optional(),
    metalness: z.number().finite().min(0).max(1).optional(),
    roughness: z.number().finite().min(0).max(1).optional(),
    emissive: ai3dColorSchema.optional(),
    emissiveIntensity: z.number().finite().min(0).max(10).optional()
  })
  .strict()
  .refine(
    (value) =>
      value.color !== undefined ||
      value.opacity !== undefined ||
      value.metalness !== undefined ||
      value.roughness !== undefined ||
      value.emissive !== undefined ||
      value.emissiveIntensity !== undefined,
    {
      message: "Material patch must include at least one supported field."
    }
  );

const ai3dCreateBaseOperationSchema = {
  nodeId: ai3dNodeIdSchema,
  label: ai3dLabelSchema.optional(),
  transform: ai3dTransformPatchSchema
    .refine((value) => value.position !== undefined && value.scale !== undefined, {
      message: "Create operations require transform.position and transform.scale."
    }),
  material: ai3dMaterialPatchSchema.optional()
};

export const ai3dCreatePrimitiveOperationSchema = z
  .object({
    type: z.literal("create_primitive"),
    primitive: z.enum(AI3D_PRIMITIVE_TYPES),
    ...ai3dCreateBaseOperationSchema
  })
  .strict();

export const ai3dCreateShapeOperationSchema = z
  .object({
    type: z.literal("create_shape"),
    preset: z.enum(AI3D_SHAPE_PRESETS),
    ...ai3dCreateBaseOperationSchema
  })
  .strict();

export const ai3dCreateExtrudeOperationSchema = z
  .object({
    type: z.literal("create_extrude"),
    preset: z.enum(AI3D_SHAPE_PRESETS),
    depth: z.number().finite().positive().max(4).optional(),
    ...ai3dCreateBaseOperationSchema
  })
  .strict();

export const ai3dCreateTubeOperationSchema = z
  .object({
    type: z.literal("create_tube"),
    preset: z.enum(AI3D_TUBE_PRESETS),
    radius: z.number().finite().positive().max(2).optional(),
    tubularSegments: z.number().int().min(3).max(128).optional(),
    radialSegments: z.number().int().min(3).max(32).optional(),
    closed: z.boolean().optional(),
    ...ai3dCreateBaseOperationSchema
  })
  .strict();

export const ai3dSetTransformOperationSchema = z
  .object({
    type: z.literal("set_transform"),
    nodeId: ai3dNodeIdSchema,
    transform: ai3dTransformPatchSchema
  })
  .strict();

export const ai3dSetMaterialOperationSchema = z
  .object({
    type: z.literal("set_material"),
    nodeId: ai3dNodeIdSchema,
    material: ai3dMaterialPatchSchema
  })
  .strict();

export const ai3dOperationSchema = z.discriminatedUnion("type", [
  ai3dCreatePrimitiveOperationSchema,
  ai3dCreateShapeOperationSchema,
  ai3dCreateExtrudeOperationSchema,
  ai3dCreateTubeOperationSchema,
  ai3dSetTransformOperationSchema,
  ai3dSetMaterialOperationSchema
]);

export const ai3dPlanSchema = z
  .object({
    summary: z.string().trim().min(1).max(240),
    operations: z.array(ai3dOperationSchema).min(1)
  })
  .strict();

export const ai3dToolCallSchema = z
  .object({
    toolName: z.literal(AI3D_TOOL_NAME),
    plan: ai3dPlanSchema
  })
  .strict();

export type Ai3DPrimitiveType = z.infer<typeof ai3dCreatePrimitiveOperationSchema>["primitive"];
export type Ai3DCreatePrimitiveOperation = z.infer<typeof ai3dCreatePrimitiveOperationSchema>;
export type Ai3DCreateShapeOperation = z.infer<typeof ai3dCreateShapeOperationSchema>;
export type Ai3DCreateExtrudeOperation = z.infer<typeof ai3dCreateExtrudeOperationSchema>;
export type Ai3DCreateTubeOperation = z.infer<typeof ai3dCreateTubeOperationSchema>;
export type Ai3DSetTransformOperation = z.infer<typeof ai3dSetTransformOperationSchema>;
export type Ai3DSetMaterialOperation = z.infer<typeof ai3dSetMaterialOperationSchema>;
export type Ai3DOperation = z.infer<typeof ai3dOperationSchema>;
export type Ai3DPlan = z.infer<typeof ai3dPlanSchema>;
export type Ai3DToolCall = z.infer<typeof ai3dToolCallSchema>;

export type Ai3DMeshDraft = {
  nodeId: string;
  label: string;
  mesh: EditorMeshJSON;
};

export {
  AI3D_PRIMITIVE_TYPES,
  AI3D_SHAPE_PRESETS,
  AI3D_TOOL_NAME,
  AI3D_TUBE_PRESETS
} from "./constants/plan";

function toAi3DPlanErrorMessage(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) {
    return "AI 3D plan validation failed.";
  }

  const path = issue.path.length > 0 ? issue.path.join(".") : "root";
  return `${path}: ${issue.message}`;
}

export function validateAi3DPlan(plan: unknown): Ai3DPlan {
  const parsed = ai3dPlanSchema.safeParse(plan);

  if (!parsed.success) {
    throw new Error(toAi3DPlanErrorMessage(parsed.error));
  }

  assertAi3DPlanSemantics(parsed.data);

  return parsed.data;
}

export function validateAi3DToolCall(toolCall: unknown): Ai3DToolCall {
  const parsed = ai3dToolCallSchema.safeParse(toolCall);

  if (!parsed.success) {
    throw new Error(toAi3DPlanErrorMessage(parsed.error));
  }

  assertAi3DPlanSemantics(parsed.data.plan);

  return parsed.data;
}

function isCreateOperation(
  operation: Ai3DOperation
): operation is
  | Ai3DCreatePrimitiveOperation
  | Ai3DCreateShapeOperation
  | Ai3DCreateExtrudeOperation
  | Ai3DCreateTubeOperation {
  return (
    operation.type === "create_primitive" ||
    operation.type === "create_shape" ||
    operation.type === "create_extrude" ||
    operation.type === "create_tube"
  );
}

export function assertAi3DPlanSemantics(plan: Ai3DPlan) {
  const createdNodeIds = new Set<string>();
  let createOperationCount = 0;

  plan.operations.forEach((operation) => {
    if (isCreateOperation(operation)) {
      createOperationCount += 1;

      if (createOperationCount > MAX_AI_3D_PRIMITIVES) {
        throw new Error(`AI 3D plan exceeded the limit of ${MAX_AI_3D_PRIMITIVES} create operations.`);
      }

      if (createdNodeIds.has(operation.nodeId)) {
        throw new Error(`AI 3D plan contains a duplicate node id: ${operation.nodeId}.`);
      }

      createdNodeIds.add(operation.nodeId);
      return;
    }

    if (!createdNodeIds.has(operation.nodeId)) {
      throw new Error(`AI 3D plan references an unknown node id: ${operation.nodeId}.`);
    }
  });
}

function toGeometryName(primitive: Ai3DPrimitiveType) {
  switch (primitive) {
    case "box":
      return "Box";
    case "sphere":
      return "Sphere";
    case "cylinder":
      return "Cylinder";
    case "capsule":
      return "Capsule";
    case "cone":
      return "Cone";
    case "torus":
      return "Torus";
    case "plane":
      return "Plane";
  }
}

function mergeMaterial(
  base: EditorMeshJSON["material"],
  patch: Partial<EditorMeshMaterialJSON> | undefined
): EditorMeshJSON["material"] {
  if (!patch) return base;

  return {
    ...base,
    ...patch,
    diffuseMap: patch.diffuseMap ? { ...base?.diffuseMap, ...patch.diffuseMap } : base?.diffuseMap,
    metalnessMap: patch.metalnessMap
      ? { ...base?.metalnessMap, ...patch.metalnessMap }
      : base?.metalnessMap,
    roughnessMap: patch.roughnessMap
      ? { ...base?.roughnessMap, ...patch.roughnessMap }
      : base?.roughnessMap,
    normalMap: patch.normalMap ? { ...base?.normalMap, ...patch.normalMap } : base?.normalMap,
    aoMap: patch.aoMap ? { ...base?.aoMap, ...patch.aoMap } : base?.aoMap,
    emissiveMap: patch.emissiveMap
      ? { ...base?.emissiveMap, ...patch.emissiveMap }
      : base?.emissiveMap
  };
}

function createDraftMesh(operation: Ai3DCreatePrimitiveOperation): EditorMeshJSON {
  return {
    id: operation.nodeId,
    type: 1,
    geometryName: toGeometryName(operation.primitive),
    material: mergeMaterial(
      {
        color: "#d9e8ff",
        opacity: 1,
        metalness: 0,
        roughness: 1,
        emissive: "#000000",
        emissiveIntensity: 1
      },
      operation.material
    ),
    position: operation.transform?.position ?? [0, 0.8, 0],
    quaternion: operation.transform?.quaternion ?? [0, 0, 0, 1],
    scale: operation.transform?.scale ?? [1, 1, 1]
  };
}

function createCustomDraftMesh(
  operation:
    | Ai3DCreateShapeOperation
    | Ai3DCreateExtrudeOperation
    | Ai3DCreateTubeOperation
): EditorMeshJSON {
  const geometry =
    operation.type === "create_shape"
      ? createShapePresetGeometry(operation.preset)
      : operation.type === "create_extrude"
        ? createExtrudedShapePresetGeometry(operation.preset, operation.depth ?? 0.35)
        : createTubePresetGeometry(
            operation.preset,
            operation.radius ?? 0.14,
            operation.tubularSegments ?? 64,
            operation.radialSegments ?? 10,
            operation.closed ?? false
          );

  const customMesh = geometryToCustomMesh(geometry);
  geometry.dispose();

  return {
    id: operation.nodeId,
    ...customMesh,
    material: mergeMaterial(
      {
        color: "#d9e8ff",
        opacity: 1,
        metalness: 0,
        roughness: 1,
        emissive: "#000000",
        emissiveIntensity: 1
      },
      operation.material
    ),
    position: operation.transform?.position ?? [0, 0.8, 0],
    quaternion: operation.transform?.quaternion ?? [0, 0, 0, 1],
    scale: operation.transform?.scale ?? [1, 1, 1]
  };
}

export function buildAi3DMeshDrafts(plan: Ai3DPlan): Ai3DMeshDraft[] {
  validateAi3DPlan(plan);

  const drafts = new Map<string, Ai3DMeshDraft>();

  plan.operations.forEach((operation) => {
    if (isCreateOperation(operation)) {
      drafts.set(operation.nodeId, {
        nodeId: operation.nodeId,
        label:
          operation.label?.trim() ||
          (operation.type === "create_primitive"
            ? operation.primitive
            : operation.type === "create_tube"
              ? operation.preset
              : operation.preset),
        mesh:
          operation.type === "create_primitive"
            ? createDraftMesh(operation)
            : createCustomDraftMesh(operation)
      });
      return;
    }

    const draft = drafts.get(operation.nodeId);
    if (!draft) {
      throw new Error(`AI 3D plan references an unknown node id: ${operation.nodeId}.`);
    }

    if (operation.type === "set_transform") {
      draft.mesh = {
        ...draft.mesh,
        position: operation.transform.position ?? draft.mesh.position,
        quaternion: operation.transform.quaternion ?? draft.mesh.quaternion,
        scale: operation.transform.scale ?? draft.mesh.scale
      };
      return;
    }

    draft.mesh = {
      ...draft.mesh,
      material: mergeMaterial(draft.mesh.material, operation.material)
    };
  });

  return Array.from(drafts.values());
}
