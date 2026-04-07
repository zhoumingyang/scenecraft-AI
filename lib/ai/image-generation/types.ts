export type ImageGenerationProviderId = "siliconflow" | "openrouter" | "aliyun" | "google";

export type ImageGenerationModelId = "Qwen/Qwen-Image" | "Qwen/Qwen-Image-Edit-2509";
export type ImageGenerationImageSize =
  | "1328x1328"
  | "1664x928"
  | "928x1664"
  | "1472x1140"
  | "1140x1472"
  | "1584x1056"
  | "1056x1584";

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
