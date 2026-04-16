import { z } from "zod";

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
export const AI3D_ARCHETYPES = [
  "humanoid",
  "quadruped",
  "fish",
  "bird",
  "tree",
  "plant",
  "rock",
  "abstract_curve",
  "freeform_object"
] as const;
export const AI3D_ASSEMBLY_STRATEGIES = [
  "template_first",
  "rule_first",
  "freeform_first"
] as const;

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
const diagnosticCodeSchema = z.string().trim().regex(/^[a-z0-9_]+$/).max(64);

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
    archetype: z.enum(AI3D_ARCHETYPES),
    assemblyStrategy: z.enum(AI3D_ASSEMBLY_STRATEGIES),
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
    warnings: z.array(shortTextSchema).max(12),
    evaluator: z.enum(["template", "rule", "freeform"]),
    structuralScore: z.number().finite().min(0).max(100),
    scoreBreakdown: z
      .object({
        keyPartCoverage: z.number().finite().min(0).max(100),
        cohesion: z.number().finite().min(0).max(100),
        grounding: z.number().finite().min(0).max(100),
        geometryFit: z.number().finite().min(0).max(100),
        proportion: z.number().finite().min(0).max(100),
        budget: z.number().finite().min(0).max(100),
        archetypeFit: z.number().finite().min(0).max(100)
      })
      .strict(),
    problemCodes: z.array(diagnosticCodeSchema).max(16)
  })
  .strict();

export type Ai3DIntentSubjectType = z.infer<typeof ai3dIntentSchema>["subjectType"];
export type Ai3DArchetype = z.infer<typeof ai3dIntentSchema>["archetype"];
export type Ai3DAssemblyStrategy = z.infer<typeof ai3dIntentSchema>["assemblyStrategy"];
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
