import type {
  ImageGenerationImageSize,
  ImageGenerationModelId
} from "@/lib/ai/image-generation/models";
import type { ImageGenerationResult } from "@/lib/ai/image-generation/types";
import type { Ai3DPlan } from "@/render/editor";
import type { PromptTransformMode } from "@/lib/ai/prompt-transform/openrouter";

export type GenerateAiImagesRequest = {
  model: ImageGenerationModelId;
  prompt: string;
  seed?: number;
  imageSize?: ImageGenerationImageSize;
  cfg: number;
  inferenceSteps: number;
  referenceImages?: string[];
};

export type GenerateAiImagesResponse = ImageGenerationResult;

export type TransformPromptRequest = {
  mode: PromptTransformMode;
  prompt: string;
};

export type TransformPromptResponse = {
  prompt: string;
  traceId: string | null;
};

export type GenerateAi3DRequest = {
  prompt: string;
};

export type GenerateAi3DResponse = {
  toolName: "generate_stylized_ai3d_model";
  plan: Ai3DPlan;
  traceId: string | null;
};

export type OptimizeAi3DRequest = {
  prompt: string;
  plan: Ai3DPlan;
  images: string[];
};

export type OptimizeAi3DResponse = GenerateAi3DResponse;

export type ApiErrorResponse = {
  message: string;
};
