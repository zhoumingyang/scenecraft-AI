import type { Ai3DIntent } from "@/lib/ai/ai3d/intent/schema";
import type { Ai3DOperation, Ai3DPlan } from "@/render/editor/ai3d/plan";
import type { Ai3DDiagnosticContext, Ai3DNodeState, Ai3DPartialDiagnostics } from "./types";
import { isCreateOperation } from "./types";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function compactUnique(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = value.trim().toLowerCase();

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function normalizeIdentifier(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function splitTerms(value: string) {
  return normalizeIdentifier(value)
    .split("_")
    .filter((token) => token.length > 1);
}

function planContainsPart(plan: Ai3DPlan, part: string) {
  const partTerms = splitTerms(part);

  if (partTerms.length === 0) {
    return false;
  }

  return plan.operations.some((operation) => {
    if (!isCreateOperation(operation)) {
      return false;
    }

    const haystack = [operation.nodeId, operation.label ?? ""].map(normalizeIdentifier).join("_");
    return partTerms.every((term) => haystack.includes(term));
  });
}

function applyTransformPatch(
  base: Ai3DNodeState,
  operation: Extract<Ai3DOperation, { type: "set_transform" }>
) {
  return {
    ...base,
    position: operation.transform.position ?? base.position,
    scale: operation.transform.scale ?? base.scale
  };
}

function getBounds(nodes: Ai3DNodeState[]) {
  if (nodes.length === 0) {
    return {
      min: [0, 0, 0] as [number, number, number],
      max: [0, 0, 0] as [number, number, number],
      size: [0, 0, 0] as [number, number, number]
    };
  }

  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  nodes.forEach((node) => {
    const nodeMin: [number, number, number] = [
      node.position[0] - node.scale[0] / 2,
      node.position[1] - node.scale[1] / 2,
      node.position[2] - node.scale[2] / 2
    ];
    const nodeMax: [number, number, number] = [
      node.position[0] + node.scale[0] / 2,
      node.position[1] + node.scale[1] / 2,
      node.position[2] + node.scale[2] / 2
    ];

    min[0] = Math.min(min[0], nodeMin[0]);
    min[1] = Math.min(min[1], nodeMin[1]);
    min[2] = Math.min(min[2], nodeMin[2]);
    max[0] = Math.max(max[0], nodeMax[0]);
    max[1] = Math.max(max[1], nodeMax[1]);
    max[2] = Math.max(max[2], nodeMax[2]);
  });

  return {
    min,
    max,
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] as [number, number, number]
  };
}

function getCentroid(nodes: Ai3DNodeState[]) {
  if (nodes.length === 0) {
    return [0, 0, 0] as [number, number, number];
  }

  const total = nodes.reduce(
    (acc, node) => {
      acc[0] += node.position[0];
      acc[1] += node.position[1];
      acc[2] += node.position[2];
      return acc;
    },
    [0, 0, 0]
  );

  return [total[0] / nodes.length, total[1] / nodes.length, total[2] / nodes.length] as [
    number,
    number,
    number
  ];
}

export function buildAi3DDiagnosticContext({
  plan,
  intent
}: {
  plan: Ai3DPlan;
  intent?: Ai3DIntent;
}): Ai3DDiagnosticContext {
  const nodes = new Map<string, Ai3DNodeState>();

  plan.operations.forEach((operation) => {
    if (isCreateOperation(operation)) {
      nodes.set(operation.nodeId, {
        nodeId: operation.nodeId,
        label: operation.label?.trim() || operation.nodeId,
        operation,
        position: operation.transform.position ?? [0, 0, 0],
        scale: operation.transform.scale ?? [1, 1, 1]
      });
      return;
    }

    if (operation.type !== "set_transform") {
      return;
    }

    const node = nodes.get(operation.nodeId);

    if (!node) {
      return;
    }

    nodes.set(operation.nodeId, applyTransformPatch(node, operation));
  });

  const nodeList = Array.from(nodes.values());
  const createOperations = nodeList.map((node) => node.operation);
  const primitiveBreakdown = {
    createPrimitive: createOperations.filter((operation) => operation.type === "create_primitive").length,
    createShape: createOperations.filter((operation) => operation.type === "create_shape").length,
    createExtrude: createOperations.filter((operation) => operation.type === "create_extrude").length,
    createTube: createOperations.filter((operation) => operation.type === "create_tube").length
  };
  const missingKeyParts = intent
    ? compactUnique(intent.keyParts.filter((part) => !planContainsPart(plan, part)))
    : [];

  return {
    plan,
    intent,
    assemblyStrategy: intent?.assemblyStrategy ?? "freeform_first",
    createOperations,
    nodes: nodeList,
    primitiveBreakdown,
    createCount: createOperations.length,
    bounds: getBounds(nodeList),
    centroid: getCentroid(nodeList),
    missingKeyParts
  };
}

export function evaluateCommonDiagnostics(context: Ai3DDiagnosticContext): Ai3DPartialDiagnostics {
  const warnings: string[] = [];
  const problemCodes: string[] = [];
  const { bounds, centroid, createCount, missingKeyParts, nodes, primitiveBreakdown } = context;

  const keyPartCoverage =
    context.intent && context.intent.keyParts.length > 0
      ? clampScore(((context.intent.keyParts.length - missingKeyParts.length) / context.intent.keyParts.length) * 100)
      : 100;

  if (missingKeyParts.length > 0) {
    warnings.push("The plan is missing one or more required key parts.");
    problemCodes.push("missing_key_parts");
  }

  const horizontalExtent = Math.max(bounds.size[0], bounds.size[2], 0.01);
  const cohesionPenalty = nodes.reduce((total, node) => {
    const dx = node.position[0] - centroid[0];
    const dy = node.position[1] - centroid[1];
    const dz = node.position[2] - centroid[2];
    const distance = Math.hypot(dx, dy, dz);
    const threshold = Math.max(horizontalExtent * 1.25, 1.25);
    return total + Math.max(0, distance - threshold);
  }, 0);
  const cohesion = clampScore(100 - cohesionPenalty * 18);

  if (cohesion < 55) {
    warnings.push("Some parts are spaced too far apart to read as one coherent subject.");
    problemCodes.push("weak_cohesion");
  }

  const minGroundY = nodes.reduce(
    (min, node) => Math.min(min, node.position[1] - node.scale[1] / 2),
    Infinity
  );
  const grounding =
    context.intent?.pose === "flying"
      ? 100
      : clampScore(100 - Math.max(0, Math.abs(minGroundY)) * 45);

  if (grounding < 50) {
    warnings.push("The model appears poorly grounded or noticeably floating.");
    problemCodes.push("weak_grounding");
  }

  const maxScale = nodes.reduce((max, node) => Math.max(max, ...node.scale), 0);
  const minScale = nodes.reduce((min, node) => Math.min(min, ...node.scale), Infinity);
  const proportionRatio = minScale > 0 ? maxScale / minScale : 100;
  const proportion = clampScore(100 - Math.max(0, proportionRatio - 8) * 6);

  if (proportion < 50) {
    warnings.push("The plan has extreme scale differences that weaken the overall read.");
    problemCodes.push("proportion_outlier");
  }

  const overBudgetPenalty = Math.max(0, createCount - 20) * 4;
  const tinyNodeCount = nodes.filter((node) => Math.max(...node.scale) < 0.12).length;
  const budget = clampScore(100 - overBudgetPenalty - tinyNodeCount * 4);

  if (budget < 55) {
    warnings.push("The plan spends too much budget on low-value detail.");
    problemCodes.push("budget_overuse");
  }

  const geometryFit = clampScore(
    100 -
      (context.intent?.subjectType === "icon" && primitiveBreakdown.createExtrude + primitiveBreakdown.createShape === 0
        ? 45
        : 0) -
      (context.intent?.subjectType === "abstract" && primitiveBreakdown.createTube === 0 ? 35 : 0) -
      ((context.intent?.subjectType === "character" || context.intent?.subjectType === "animal") &&
      primitiveBreakdown.createPrimitive >= Math.max(6, Math.ceil(createCount * 0.85)) &&
      primitiveBreakdown.createExtrude === 0 &&
      primitiveBreakdown.createTube === 0
        ? 35
        : 0)
  );

  if (geometryFit < 55) {
    warnings.push("The plan uses a weak geometry mix for the intended subject.");
    problemCodes.push("weak_geometry_fit");
  }

  const archetypeFit = 100;

  return {
    warnings: compactUnique(warnings),
    problemCodes: compactUnique(problemCodes),
    scoreBreakdown: {
      keyPartCoverage,
      cohesion,
      grounding,
      geometryFit,
      proportion,
      budget,
      archetypeFit
    }
  };
}

export { clampScore, compactUnique };
