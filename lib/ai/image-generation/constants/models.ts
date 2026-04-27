import type { ImageGenerationProviderId } from "@/lib/ai/image-generation/types";

export const IMAGE_SIZE_OPTIONS = [
  { value: "1328x1328", label: "1328x1328 (1:1)", aspectRatio: "1:1" },
  { value: "1664x928", label: "1664x928 (16:9)", aspectRatio: "16:9" },
  { value: "928x1664", label: "928x1664 (9:16)", aspectRatio: "9:16" },
  { value: "1472x1140", label: "1472x1140 (4:3)", aspectRatio: "4:3" },
  { value: "1140x1472", label: "1140x1472 (3:4)", aspectRatio: "3:4" },
  { value: "1584x1056", label: "1584x1056 (3:2)", aspectRatio: "3:2" },
  { value: "1056x1584", label: "1056x1584 (2:3)", aspectRatio: "2:3" }
] as const;

export type ImageGenerationModelId =
  | "Qwen/Qwen-Image"
  | "Qwen/Qwen-Image-Edit-2509"
  | "google/gemini-3.1-flash-image-preview"
  | "sourceful/riverflow-v2-pro"
  | "sourceful/riverflow-v2-fast"
  | "black-forest-labs/flux.2-flex"
  | "black-forest-labs/flux.2-pro";

export type ImageGenerationImageSize = (typeof IMAGE_SIZE_OPTIONS)[number]["value"];
export type ImageGenerationAspectRatio = (typeof IMAGE_SIZE_OPTIONS)[number]["aspectRatio"];

export type ImageGenerationModelConfig = {
  id: ImageGenerationModelId;
  label: string;
  providerId: ImageGenerationProviderId;
  supportsImageSize: boolean;
  minReferenceImages: number;
  maxReferenceImages: number;
  outputModalities: Array<"image" | "text">;
};

export const IMAGE_GENERATION_MODELS: ImageGenerationModelConfig[] = [
  {
    id: "Qwen/Qwen-Image",
    label: "Qwen/Qwen-Image",
    providerId: "siliconflow",
    supportsImageSize: true,
    minReferenceImages: 0,
    maxReferenceImages: 0,
    outputModalities: ["image"]
  },
  {
    id: "Qwen/Qwen-Image-Edit-2509",
    label: "Qwen/Qwen-Image-Edit-2509",
    providerId: "siliconflow",
    supportsImageSize: false,
    minReferenceImages: 1,
    maxReferenceImages: 3,
    outputModalities: ["image"]
  },
  {
    id: "google/gemini-3.1-flash-image-preview",
    label: "Google Gemini 3.1 Flash Image Preview",
    providerId: "openrouter",
    supportsImageSize: true,
    minReferenceImages: 0,
    maxReferenceImages: 4,
    outputModalities: ["image", "text"]
  },
  {
    id: "sourceful/riverflow-v2-pro",
    label: "Sourceful Riverflow V2 Pro",
    providerId: "openrouter",
    supportsImageSize: true,
    minReferenceImages: 0,
    maxReferenceImages: 4,
    outputModalities: ["image"]
  },
  {
    id: "sourceful/riverflow-v2-fast",
    label: "Sourceful Riverflow V2 Fast",
    providerId: "openrouter",
    supportsImageSize: true,
    minReferenceImages: 0,
    maxReferenceImages: 4,
    outputModalities: ["image"]
  },
  {
    id: "black-forest-labs/flux.2-flex",
    label: "Black Forest Labs FLUX.2 Flex",
    providerId: "openrouter",
    supportsImageSize: true,
    minReferenceImages: 0,
    maxReferenceImages: 4,
    outputModalities: ["image"]
  },
  {
    id: "black-forest-labs/flux.2-pro",
    label: "Black Forest Labs FLUX.2 Pro",
    providerId: "openrouter",
    supportsImageSize: true,
    minReferenceImages: 0,
    maxReferenceImages: 4,
    outputModalities: ["image"]
  }
];

export const DEFAULT_IMAGE_GENERATION_MODEL_ID: ImageGenerationModelId = "Qwen/Qwen-Image";
export const MAX_REFERENCE_IMAGE_SLOTS = 4;

export function getImageGenerationModelConfig(modelId: ImageGenerationModelId) {
  const config = IMAGE_GENERATION_MODELS.find((item) => item.id === modelId);
  if (!config) {
    throw new Error(`Unsupported image generation model "${modelId}".`);
  }

  return config;
}

export function imageSizeToAspectRatio(
  imageSize: ImageGenerationImageSize
): ImageGenerationAspectRatio {
  const option = IMAGE_SIZE_OPTIONS.find((item) => item.value === imageSize);
  if (!option) {
    throw new Error(`Unsupported image size "${imageSize}".`);
  }

  return option.aspectRatio;
}
