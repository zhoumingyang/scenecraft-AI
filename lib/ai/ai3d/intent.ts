import { z } from "zod";
import type { Ai3DOperation, Ai3DPlan } from "@/render/editor/ai3d/plan";

export const AI3D_INTENT_SUBJECT_TYPES = [
  "auto",
  "character",
  "animal",
  "prop",
  "icon",
  "abstract"
] as const;
export const AI3D_INTENT_DETAIL_LEVELS = ["low", "medium", "high"] as const;
export const AI3D_INTENT_POSES = ["auto", "standing", "sitting", "flying", "coiled", "static"] as const;
export const AI3D_INTENT_SYMMETRIES = ["auto", "symmetric", "asymmetric"] as const;
export const AI3D_INTENT_STYLE_BIASES = ["stylized", "cute", "clean", "chunky"] as const;
export const AI3D_GEOMETRY_BIASES = ["primitive", "tube", "extrude", "shape"] as const;

const AI3D_RESOLVED_SUBJECT_TYPES = AI3D_INTENT_SUBJECT_TYPES.filter(
  (value): value is Exclude<(typeof AI3D_INTENT_SUBJECT_TYPES)[number], "auto"> => value !== "auto"
);
const AI3D_RESOLVED_POSES = AI3D_INTENT_POSES.filter(
  (value): value is Exclude<(typeof AI3D_INTENT_POSES)[number], "auto"> => value !== "auto"
);
const AI3D_RESOLVED_SYMMETRIES = AI3D_INTENT_SYMMETRIES.filter(
  (value): value is Exclude<(typeof AI3D_INTENT_SYMMETRIES)[number], "auto"> => value !== "auto"
);

const shortTextSchema = z.string().trim().min(1).max(120);
const stringListSchema = z.array(shortTextSchema).max(8);

export const ai3dIntentInputSchema = z
  .object({
    subjectType: z.enum(AI3D_INTENT_SUBJECT_TYPES).optional(),
    detailLevel: z.enum(AI3D_INTENT_DETAIL_LEVELS).optional(),
    pose: z.enum(AI3D_INTENT_POSES).optional(),
    symmetry: z.enum(AI3D_INTENT_SYMMETRIES).optional(),
    styleBias: z.enum(AI3D_INTENT_STYLE_BIASES).optional(),
    mustHaveParts: stringListSchema.optional(),
    avoidParts: stringListSchema.optional()
  })
  .strict();

export const ai3dIntentSchema = z
  .object({
    subjectType: z.enum(AI3D_RESOLVED_SUBJECT_TYPES),
    subjectLabel: shortTextSchema,
    primarySilhouette: shortTextSchema,
    keyParts: z.array(shortTextSchema).min(1).max(8),
    secondaryParts: stringListSchema,
    geometryBias: z.array(z.enum(AI3D_GEOMETRY_BIASES)).min(1).max(4),
    detailBudget: z.enum(AI3D_INTENT_DETAIL_LEVELS),
    pose: z.enum(AI3D_RESOLVED_POSES),
    symmetry: z.enum(AI3D_RESOLVED_SYMMETRIES),
    styleBias: z.enum(AI3D_INTENT_STYLE_BIASES),
    negativeConstraints: stringListSchema
  })
  .strict();

const primitiveBreakdownSchema = z
  .object({
    createPrimitive: z.number().int().min(0),
    createShape: z.number().int().min(0),
    createExtrude: z.number().int().min(0),
    createTube: z.number().int().min(0)
  })
  .strict();

export const ai3dPlanDiagnosticsSchema = z
  .object({
    createCount: z.number().int().min(0),
    primitiveBreakdown: primitiveBreakdownSchema,
    hasTube: z.boolean(),
    hasExtrude: z.boolean(),
    missingKeyParts: stringListSchema,
    warnings: z.array(shortTextSchema).max(12)
  })
  .strict();

export type Ai3DIntentSubjectType = z.infer<typeof ai3dIntentSchema>["subjectType"];
export type Ai3DIntentInput = z.infer<typeof ai3dIntentInputSchema>;
export type Ai3DIntent = z.infer<typeof ai3dIntentSchema>;
export type Ai3DPlanDiagnostics = z.infer<typeof ai3dPlanDiagnosticsSchema>;

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

function normalizeList(values: unknown) {
  if (!Array.isArray(values)) {
    return undefined;
  }

  const normalized = compactUnique(
    values
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
  );

  return normalized.length > 0 ? normalized : undefined;
}

export function validateAi3DIntentInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const payload = input as Record<string, unknown>;
  const parsed = ai3dIntentInputSchema.safeParse({
    subjectType: payload.subjectType,
    detailLevel: payload.detailLevel,
    pose: payload.pose,
    symmetry: payload.symmetry,
    styleBias: payload.styleBias,
    mustHaveParts: normalizeList(payload.mustHaveParts),
    avoidParts: normalizeList(payload.avoidParts)
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid AI 3D intent input.");
  }

  const hasValue = Object.values(parsed.data).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined
  );

  return hasValue ? parsed.data : undefined;
}

export function validateAi3DIntent(intent: unknown) {
  const parsed = ai3dIntentSchema.safeParse(intent);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid AI 3D intent.");
  }

  return parsed.data;
}

export function validateAi3DPlanDiagnostics(diagnostics: unknown) {
  const parsed = ai3dPlanDiagnosticsSchema.safeParse(diagnostics);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid AI 3D diagnostics.");
  }

  return parsed.data;
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
  return operation.type === "create_primitive" || operation.type === "create_shape" || operation.type === "create_extrude" || operation.type === "create_tube";
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
      intent?.subjectType === "abstract" && createTube === 0 ? "A curved or abstract subject should usually include a tube-based primary form." : "",
      intent?.subjectType === "icon" && createExtrude + createShape === 0 ? "An icon-like subject should usually rely on shape or extrude operations." : "",
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
