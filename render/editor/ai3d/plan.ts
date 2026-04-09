import type { EditorMeshJSON, EditorMeshMaterialJSON, TransformPatch } from "../core/types";
import {
  createExtrudedShapePresetGeometry,
  createShapePresetGeometry,
  createTubePresetGeometry,
  geometryToCustomMesh,
  type ShapePreset,
  type TubePreset
} from "../utils/geometry";

const MAX_AI_3D_PRIMITIVES = 16;
const MIN_BOX_HEAVY_RATIO = 0.5;

export type Ai3DPrimitiveType =
  | "box"
  | "sphere"
  | "cylinder"
  | "capsule"
  | "cone"
  | "torus"
  | "plane";

export type Ai3DCreatePrimitiveOperation = {
  type: "create_primitive";
  nodeId: string;
  primitive: Ai3DPrimitiveType;
  label?: string;
  transform?: TransformPatch;
  material?: Partial<EditorMeshMaterialJSON>;
};

export type Ai3DCreateShapeOperation = {
  type: "create_shape";
  nodeId: string;
  preset: ShapePreset;
  label?: string;
  transform?: TransformPatch;
  material?: Partial<EditorMeshMaterialJSON>;
};

export type Ai3DCreateExtrudeOperation = {
  type: "create_extrude";
  nodeId: string;
  preset: ShapePreset;
  depth?: number;
  label?: string;
  transform?: TransformPatch;
  material?: Partial<EditorMeshMaterialJSON>;
};

export type Ai3DCreateTubeOperation = {
  type: "create_tube";
  nodeId: string;
  preset: TubePreset;
  radius?: number;
  tubularSegments?: number;
  radialSegments?: number;
  closed?: boolean;
  label?: string;
  transform?: TransformPatch;
  material?: Partial<EditorMeshMaterialJSON>;
};

export type Ai3DSetTransformOperation = {
  type: "set_transform";
  nodeId: string;
  transform: TransformPatch;
};

export type Ai3DSetMaterialOperation = {
  type: "set_material";
  nodeId: string;
  material: Partial<EditorMeshMaterialJSON>;
};

export type Ai3DOperation =
  | Ai3DCreatePrimitiveOperation
  | Ai3DCreateShapeOperation
  | Ai3DCreateExtrudeOperation
  | Ai3DCreateTubeOperation
  | Ai3DSetTransformOperation
  | Ai3DSetMaterialOperation;

export type Ai3DPlan = {
  summary: string;
  operations: Ai3DOperation[];
};

export type Ai3DMeshDraft = {
  nodeId: string;
  label: string;
  mesh: EditorMeshJSON;
};

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
  if (!plan.summary.trim()) {
    throw new Error("AI 3D plan summary is required.");
  }

  if (plan.operations.length === 0) {
    throw new Error("AI 3D plan must include at least one operation.");
  }

  const drafts = new Map<string, Ai3DMeshDraft>();
  let primitiveCount = 0;
  let boxCount = 0;

  plan.operations.forEach((operation) => {
    if (
      operation.type === "create_primitive" ||
      operation.type === "create_shape" ||
      operation.type === "create_extrude" ||
      operation.type === "create_tube"
    ) {
      if (drafts.size >= MAX_AI_3D_PRIMITIVES) {
        throw new Error(`AI 3D plan exceeded the limit of ${MAX_AI_3D_PRIMITIVES} primitives.`);
      }
      if (drafts.has(operation.nodeId)) {
        throw new Error(`AI 3D plan contains a duplicate node id: ${operation.nodeId}.`);
      }
      if (operation.type === "create_primitive") {
        primitiveCount += 1;
        if (operation.primitive === "box") {
          boxCount += 1;
        }
      }
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

  if (primitiveCount > 0 && boxCount / primitiveCount < MIN_BOX_HEAVY_RATIO) {
    throw new Error("AI 3D plan must follow the minecraft/blockout style and stay box-heavy.");
  }

  return Array.from(drafts.values());
}
