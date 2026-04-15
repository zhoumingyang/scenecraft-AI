import type { Ai3DOperation, Ai3DPlan } from "@/render/editor/ai3d/plan";
import type { Ai3DIntent, Ai3DPlanDiagnostics } from "./schema";

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

function isCreateOperation(operation: Ai3DOperation) {
  return (
    operation.type === "create_primitive" ||
    operation.type === "create_shape" ||
    operation.type === "create_extrude" ||
    operation.type === "create_tube"
  );
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

function getSymmetryWarning(plan: Ai3DPlan) {
  const leftCount = plan.operations.reduce((count, operation) => {
    if (!isCreateOperation(operation)) {
      return count;
    }

    return operation.nodeId.startsWith("left_") ? count + 1 : count;
  }, 0);
  const rightCount = plan.operations.reduce((count, operation) => {
    if (!isCreateOperation(operation)) {
      return count;
    }

    return operation.nodeId.startsWith("right_") ? count + 1 : count;
  }, 0);

  if (Math.abs(leftCount - rightCount) > 1) {
    return "The plan reads as imbalanced for a symmetric subject.";
  }

  return null;
}

export function getAi3DPlanDiagnostics({
  plan,
  intent
}: {
  plan: Ai3DPlan;
  intent?: Ai3DIntent;
}): Ai3DPlanDiagnostics {
  const createOperations = plan.operations.filter(isCreateOperation);
  const createPrimitive = createOperations.filter((operation) => operation.type === "create_primitive").length;
  const createShape = createOperations.filter((operation) => operation.type === "create_shape").length;
  const createExtrude = createOperations.filter((operation) => operation.type === "create_extrude").length;
  const createTube = createOperations.filter((operation) => operation.type === "create_tube").length;
  const missingKeyParts = intent
    ? compactUnique(intent.keyParts.filter((part) => !planContainsPart(plan, part)))
    : [];
  const warnings = compactUnique(
    [
      missingKeyParts.length > 0 ? "The plan is missing one or more required key parts." : "",
      intent?.symmetry === "symmetric" ? getSymmetryWarning(plan) ?? "" : "",
      intent?.subjectType === "abstract" && createTube === 0
        ? "A curved or abstract subject should usually include a tube-based primary form."
        : "",
      intent?.subjectType === "icon" && createExtrude + createShape === 0
        ? "An icon-like subject should usually rely on shape or extrude operations."
        : "",
      (intent?.subjectType === "character" || intent?.subjectType === "animal") &&
      createOperations.length <= 3
        ? "The subject is likely too primitive to read clearly."
        : "",
      (intent?.subjectType === "character" || intent?.subjectType === "animal") &&
      createPrimitive >= Math.max(6, Math.ceil(createOperations.length * 0.85)) &&
      createExtrude === 0 &&
      createTube === 0
        ? "The plan relies too heavily on generic primitive stacking."
        : "",
      createOperations.length >= 24 && missingKeyParts.length > 0
        ? "The plan spends too much budget before covering the highest-value readable parts."
        : ""
    ].filter(Boolean)
  );

  return {
    createCount: createOperations.length,
    primitiveBreakdown: {
      createPrimitive,
      createShape,
      createExtrude,
      createTube
    },
    hasTube: createTube > 0,
    hasExtrude: createExtrude > 0,
    missingKeyParts,
    warnings
  };
}

function diagnosticsSeverity(diagnostics: Ai3DPlanDiagnostics) {
  return diagnostics.missingKeyParts.length * 4 + diagnostics.warnings.length * 2;
}

export function shouldAcceptAi3DPlanCandidate({
  baseline,
  candidate
}: {
  baseline?: Ai3DPlanDiagnostics;
  candidate: Ai3DPlanDiagnostics;
}) {
  if (!baseline) {
    return candidate.missingKeyParts.length === 0;
  }

  if (candidate.missingKeyParts.length > baseline.missingKeyParts.length) {
    return false;
  }

  return diagnosticsSeverity(candidate) <= diagnosticsSeverity(baseline);
}
