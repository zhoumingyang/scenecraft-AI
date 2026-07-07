import { z } from "zod";
import type { ImageGenerationImageSize } from "@/lib/ai/image-generation/models";
import { IMAGE_SIZE_OPTIONS } from "@/lib/ai/image-generation/models";

export const AI_PROMPT_MAX_LENGTH = 4000;

export const promptSchema = z
  .string()
  .trim()
  .min(1, "Prompt is required.")
  .max(AI_PROMPT_MAX_LENGTH, `Prompt must be ${AI_PROMPT_MAX_LENGTH} characters or fewer.`);

export const imageGenerationSizeSchema = z
  .string()
  .refine(
    (value): value is ImageGenerationImageSize =>
      IMAGE_SIZE_OPTIONS.some((option) => option.value === value),
    { message: "Unsupported image size." }
  );

export const optionalStringListSchema = z.preprocess(
  (value) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : undefined,
  z.array(z.string()).optional()
);

export const requiredStringListSchema = z.preprocess(
  (value) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
  z.array(z.string()).min(1, "At least 1 preview image is required.")
);

export function mapValidationError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}
