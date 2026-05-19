import { z } from "zod";
import type {
  ImageGenerationImageSize,
  ImageGenerationModelId
} from "@/lib/ai/image-generation/models";
import {
  IMAGE_GENERATION_MODEL_IDS,
  IMAGE_SIZE_OPTIONS,
  getImageGenerationModelConfig
} from "@/lib/ai/image-generation/models";
import type {
  Ai3DIntent,
  Ai3DPlanDiagnostics
} from "@/lib/ai/ai3d/intent";
import {
  validateAi3DIntentInput,
  validateAi3DPlanDiagnostics
} from "@/lib/ai/ai3d/intent";
import type { ImageGenerationResult } from "@/lib/ai/image-generation/types";
import type { AI_PANORAMA_MODEL_ID } from "@/lib/ai/panorama/constants";
import { AI3D_TOOL_NAME } from "@/render/editor/ai3d/constants/plan";
import type { Ai3DPlan } from "@/render/editor";
import { validateAi3DPlan } from "@/render/editor/ai3d/plan";
import type { PromptTransformMode } from "@/lib/ai/prompt-transform/openrouter";
import { PROMPT_TRANSFORM_MODES } from "@/lib/ai/prompt-transform/openrouter";

const imageGenerationModelIdSchema = z
  .string()
  .refine(
    (value): value is ImageGenerationModelId =>
      IMAGE_GENERATION_MODEL_IDS.includes(value as ImageGenerationModelId),
    { message: "Unsupported image generation model." }
  );

const imageGenerationSizeSchema = z
  .string()
  .refine(
    (value): value is ImageGenerationImageSize =>
      IMAGE_SIZE_OPTIONS.some((option) => option.value === value),
    { message: "Unsupported image size." }
  );

const promptSchema = z.string().trim().min(1, "Prompt is required.");

const optionalStringListSchema = z.preprocess(
  (value) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : undefined,
  z.array(z.string()).optional()
);

const requiredStringListSchema = z.preprocess(
  (value) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
  z.array(z.string()).min(1, "At least 1 preview image is required.")
);

function mapValidationError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

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

export const generateAiImagesRequestSchema = z
  .object({
    model: imageGenerationModelIdSchema,
    prompt: promptSchema,
    seed: z
      .number()
      .int("Seed must be an integer between 0 and 9999999999.")
      .min(0, "Seed must be an integer between 0 and 9999999999.")
      .max(9_999_999_999, "Seed must be an integer between 0 and 9999999999.")
      .optional(),
    imageSize: imageGenerationSizeSchema.optional(),
    cfg: z
      .number()
      .min(0.1, "CFG must be a number between 0.1 and 20.")
      .max(20, "CFG must be a number between 0.1 and 20."),
    inferenceSteps: z
      .number()
      .int("Inference Steps must be a number between 1 and 50.")
      .min(1, "Inference Steps must be a number between 1 and 50.")
      .max(50, "Inference Steps must be a number between 1 and 50."),
    referenceImages: optionalStringListSchema
  })
  .strict()
  .superRefine((payload, ctx) => {
    const modelConfig = getImageGenerationModelConfig(payload.model);
    const referenceImageCount = payload.referenceImages?.length ?? 0;

    if (
      referenceImageCount < modelConfig.minReferenceImages ||
      referenceImageCount > modelConfig.maxReferenceImages
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["referenceImages"],
        message:
          modelConfig.maxReferenceImages === 0
            ? `${payload.model} does not support reference images.`
            : `${payload.model} requires between ${modelConfig.minReferenceImages} and ${modelConfig.maxReferenceImages} reference images.`
      });
    }

    if (payload.imageSize !== undefined && !modelConfig.supportsImageSize) {
      ctx.addIssue({
        code: "custom",
        path: ["imageSize"],
        message: `${payload.model} does not support image_size.`
      });
    }
  });

export type GenerateAiImagesRequest = z.infer<typeof generateAiImagesRequestSchema>;

export type GenerateAiImagesResponse = ImageGenerationResult;

const aiPbrTextureTargetKindSchema = z.enum(["mesh", "ground"]);

export const generateAiPbrTextureRequestSchema = z
  .object({
    prompt: promptSchema,
    seed: z
      .number()
      .int("Seed must be an integer between 0 and 9999999999.")
      .min(0, "Seed must be an integer between 0 and 9999999999.")
      .max(9_999_999_999, "Seed must be an integer between 0 and 9999999999.")
      .optional(),
    imageSize: imageGenerationSizeSchema.optional(),
    targetKind: aiPbrTextureTargetKindSchema.optional(),
    targetId: z.string().trim().max(120).optional()
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (payload.targetKind === "ground" && payload.targetId !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["targetId"],
        message: "Ground texture generation should not include targetId."
      });
    }

    if (payload.targetKind === "mesh" && !payload.targetId) {
      ctx.addIssue({
        code: "custom",
        path: ["targetId"],
        message: "Mesh texture generation requires targetId."
      });
    }
  });

export type GenerateAiPbrTextureRequest = z.infer<typeof generateAiPbrTextureRequestSchema>;

export type GenerateAiPbrTextureResponse = {
  atlasImageUrl: string;
  model: ImageGenerationModelId;
  prompt: string;
  seed: number | null;
  traceId: string | null;
  layoutVersion: 1;
};

export const generateAiPanoramaRequestSchema = z
  .object({
    prompt: promptSchema
  })
  .strict();

export type GenerateAiPanoramaRequest = z.infer<typeof generateAiPanoramaRequestSchema>;

export type GenerateAiPanoramaResponse = {
  panoramaImageUrl: string;
  model: typeof AI_PANORAMA_MODEL_ID;
  prompt: string;
  width: number;
  height: number;
  mimeType: string;
  traceId: string | null;
};

const promptTransformModeSchema = z
  .string()
  .refine(
    (value): value is PromptTransformMode =>
      PROMPT_TRANSFORM_MODES.includes(value as PromptTransformMode),
    { message: "Unsupported prompt transform mode." }
  );

export const transformPromptRequestSchema = z
  .object({
    mode: promptTransformModeSchema,
    prompt: promptSchema
  })
  .strict();

export type TransformPromptRequest = z.infer<typeof transformPromptRequestSchema>;

export type TransformPromptResponse = {
  prompt: string;
  traceId: string | null;
};

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

export type ApiErrorResponse = {
  message: string;
};

export function getAiApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallbackMessage;
  }

  return mapValidationError(error, fallbackMessage);
}
