import { z } from "zod";
import type { ImageGenerationModelId } from "@/lib/ai/image-generation/models";
import {
  IMAGE_GENERATION_MODEL_IDS,
  getImageGenerationModelConfig
} from "@/lib/ai/image-generation/models";
import type { ImageGenerationResult } from "@/lib/ai/image-generation/types";
import {
  imageGenerationSizeSchema,
  optionalStringListSchema,
  promptSchema
} from "./shared";

const imageGenerationModelIdSchema = z
  .string()
  .refine(
    (value): value is ImageGenerationModelId =>
      IMAGE_GENERATION_MODEL_IDS.includes(value as ImageGenerationModelId),
    { message: "Unsupported image generation model." }
  );

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
