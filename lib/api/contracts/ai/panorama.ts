import { z } from "zod";
import type { AI_PANORAMA_MODEL_ID } from "@/lib/ai/panorama/constants";
import { promptSchema } from "./shared";

export const generateAiPanoramaRequestSchema = z
  .object({
    prompt: promptSchema
  })
  .strict();

export type GenerateAiPanoramaRequest = z.infer<typeof generateAiPanoramaRequestSchema>;

export const aiPanoramaEnvironmentPatchSchema = z
  .object({
    environment: z.literal(1),
    backgroundShow: z.literal(1),
    environmentIntensity: z.number().min(0.45).max(1.35),
    backgroundIntensity: z.number().min(0.7).max(1.15),
    backgroundBlurriness: z.number().min(0.05).max(0.45),
    environmentRotationY: z.number().min(-0.8).max(0.8),
    toneMappingExposure: z.number().min(0.8).max(1.15)
  })
  .strict();

export type AiPanoramaEnvironmentPatch = z.infer<typeof aiPanoramaEnvironmentPatchSchema>;

export type GenerateAiPanoramaResponse = {
  panoramaImageUrl: string;
  model: typeof AI_PANORAMA_MODEL_ID;
  prompt: string;
  enhancedPrompt?: string;
  environmentPatch?: AiPanoramaEnvironmentPatch;
  width: number;
  height: number;
  mimeType: string;
  traceId: string | null;
};
