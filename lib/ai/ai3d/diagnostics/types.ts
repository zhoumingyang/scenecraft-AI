import type { Ai3DCreateExtrudeOperation, Ai3DCreatePrimitiveOperation, Ai3DCreateShapeOperation, Ai3DCreateTubeOperation, Ai3DOperation, Ai3DPlan } from "@/render/editor/ai3d/plan";
import type { Ai3DAssemblyStrategy, Ai3DIntent } from "@/lib/ai/ai3d/intent";

export type Ai3DCreateOperation =
  | Ai3DCreatePrimitiveOperation
  | Ai3DCreateShapeOperation
  | Ai3DCreateExtrudeOperation
  | Ai3DCreateTubeOperation;

export type Ai3DNodeState = {
  nodeId: string;
  label: string;
  operation: Ai3DCreateOperation;
  position: [number, number, number];
  scale: [number, number, number];
};

export type Ai3DDiagnosticContext = {
  plan: Ai3DPlan;
  intent?: Ai3DIntent;
  assemblyStrategy: Ai3DAssemblyStrategy;
  createOperations: Ai3DCreateOperation[];
  nodes: Ai3DNodeState[];
  primitiveBreakdown: {
    createPrimitive: number;
    createShape: number;
    createExtrude: number;
    createTube: number;
  };
  createCount: number;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
  };
  centroid: [number, number, number];
  missingKeyParts: string[];
};

export type Ai3DPartialDiagnostics = {
  warnings: string[];
  problemCodes: string[];
  scoreBreakdown: {
    keyPartCoverage?: number;
    cohesion?: number;
    grounding?: number;
    geometryFit?: number;
    proportion?: number;
    budget?: number;
    archetypeFit?: number;
  };
};

export function isCreateOperation(operation: Ai3DOperation): operation is Ai3DCreateOperation {
  return (
    operation.type === "create_primitive" ||
    operation.type === "create_shape" ||
    operation.type === "create_extrude" ||
    operation.type === "create_tube"
  );
}
