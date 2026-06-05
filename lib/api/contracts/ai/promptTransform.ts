import { z } from "zod";
import type {
  PromptTransformMode,
  PromptTransformTarget
} from "@/lib/ai/prompt-transform/constants";
import {
  PROMPT_TRANSFORM_MODES,
  PROMPT_TRANSFORM_TARGETS
} from "@/lib/ai/prompt-transform/constants";
import { promptSchema } from "./shared";

const promptTransformModeSchema = z
  .string()
  .refine(
    (value): value is PromptTransformMode =>
      PROMPT_TRANSFORM_MODES.includes(value as PromptTransformMode),
    { message: "Unsupported prompt transform mode." }
  );

export const promptTransformTargetSchema = z
  .string()
  .refine(
    (value): value is PromptTransformTarget =>
      PROMPT_TRANSFORM_TARGETS.includes(value as PromptTransformTarget),
    { message: "Unsupported prompt transform target." }
  );

export const transformPromptRequestSchema = z
  .object({
    mode: promptTransformModeSchema,
    prompt: promptSchema,
    target: promptTransformTargetSchema.optional().default("image")
  })
  .strict();

export type TransformPromptRequest = z.input<typeof transformPromptRequestSchema>;

export type TransformPromptResponse = {
  prompt: string;
  traceId: string | null;
};
