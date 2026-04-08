import type {
  ImageGenerationImageSize,
  ImageGenerationModelId
} from "@/lib/ai/image-generation/models";

export type ImageGenerationProviderId = "siliconflow" | "openrouter";

export type ImageGenerationRequest = {
  providerId: ImageGenerationProviderId;
  model: ImageGenerationModelId;
  prompt: string;
  seed?: number;
  imageSize?: ImageGenerationImageSize;
  cfg: number;
  inferenceSteps: number;
  referenceImages?: string[];
};

export type ImageGenerationResult = {
  images: {
    url: string;
  }[];
  seed: number | null;
  traceId: string | null;
};

export interface ImageGenerationProvider {
  readonly id: ImageGenerationProviderId;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}
