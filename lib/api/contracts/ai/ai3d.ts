import { z } from "zod";
import type {
  Ai3DIntent,
  Ai3DPlanDiagnostics
} from "@/lib/ai/ai3d/intent";
import {
  validateAi3DIntentInput,
  validateAi3DPlanDiagnostics
} from "@/lib/ai/ai3d/intent";
import { AI3D_TOOL_NAME } from "@/render/editor/ai3d/constants/plan";
import type { Ai3DPlan } from "@/render/editor";
import { validateAi3DPlan } from "@/render/editor/ai3d/plan";
import {
  mapValidationError,
  optionalStringListSchema,
  promptSchema,
  requiredStringListSchema
} from "./shared";

const optionalAi3DIntentInputSchema = z.unknown().optional().transform((value, ctx) => {
  try {
    return validateAi3DIntentInput(value);
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      message: mapValidationError(error, "Invalid AI 3D intent input.")
    });
    return z.NEVER;
  }
});

const ai3dPlanRequestSchema = z.unknown().transform((value, ctx) => {
  try {
    return validateAi3DPlan(value);
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      message: mapValidationError(error, "Invalid AI 3D plan.")
    });
    return z.NEVER;
  }
});

const optionalAi3DPlanDiagnosticsSchema = z.unknown().optional().transform((value, ctx) => {
  if (value === undefined) {
    return undefined;
  }

  try {
    return validateAi3DPlanDiagnostics(value);
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      message: mapValidationError(error, "Invalid AI 3D diagnostics.")
    });
    return z.NEVER;
  }
});

export const generateAi3DRequestSchema = z
  .object({
    prompt: promptSchema,
    intent: optionalAi3DIntentInputSchema,
    referenceImages: optionalStringListSchema
  })
  .strict();

export type GenerateAi3DRequest = z.infer<typeof generateAi3DRequestSchema>;

export type GenerateAi3DResponse = {
  toolName: typeof AI3D_TOOL_NAME;
  plan: Ai3DPlan;
  intent: Ai3DIntent;
  diagnostics: Ai3DPlanDiagnostics;
  traceId: string | null;
};

export const optimizeAi3DRequestSchema = z
  .object({
    prompt: promptSchema,
    plan: ai3dPlanRequestSchema,
    images: requiredStringListSchema,
    intent: optionalAi3DIntentInputSchema,
    diagnostics: optionalAi3DPlanDiagnosticsSchema
  })
  .strict();

export type OptimizeAi3DRequest = z.infer<typeof optimizeAi3DRequestSchema>;

export type OptimizeAi3DResponse = GenerateAi3DResponse;
