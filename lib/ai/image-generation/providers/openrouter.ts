import {
  formatOpenRouterErrorMessage,
  postOpenRouterChatCompletion,
  type OpenRouterChatCompletionRequest
} from "@/lib/ai/openrouter/client";
import {
  getImageGenerationModelConfig,
  imageSizeToAspectRatio
} from "@/lib/ai/image-generation/models";
import type {
  ImageGenerationProvider,
  ImageGenerationRequest,
  ImageGenerationResult
} from "@/lib/ai/image-generation/types";

type OpenRouterResponse = {
  id?: string;
  error?: {
    message?: string;
  };
  choices?: Array<{
    message?: {
      images?: Array<{
        type?: string;
        image_url?: {
          url?: string;
        };
        imageUrl?: {
          url?: string;
        };
      }>;
    };
  }>;
};

export class OpenRouterImageGenerationProvider implements ImageGenerationProvider {
  readonly id = "openrouter" as const;

  constructor(private readonly apiKey: string) {}

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    try {
      const { data, traceId } = await postOpenRouterChatCompletion<OpenRouterResponse>({
        apiKey: this.apiKey,
        body: this.buildRequestBody(request),
        timeout: 240_000
      });

      const message = data?.choices?.[0]?.message;
      const images =
        message?.images
          ?.map((item) => item.image_url?.url ?? item.imageUrl?.url)
          .filter((url): url is string => typeof url === "string" && url.length > 0)
          .map((url) => ({ url })) ?? [];

      return {
        images,
        seed: typeof request.seed === "number" ? request.seed : null,
        traceId
      };
    } catch (error) {
      throw new Error(formatOpenRouterErrorMessage(error, "OpenRouter image request"));
    }
  }

  private buildRequestBody(request: ImageGenerationRequest): OpenRouterChatCompletionRequest {
    const modelConfig = getImageGenerationModelConfig(request.model);
    const content = [
      { type: "text" as const, text: request.prompt },
      ...(request.referenceImages ?? []).map((imageUrl) => ({
        type: "image_url" as const,
        image_url: { url: imageUrl }
      }))
    ];

    return {
      model: request.model,
      messages: [
        {
          role: "user" as const,
          content
        }
      ],
      modalities: modelConfig.outputModalities,
      stream: false,
      ...(typeof request.seed === "number" ? { seed: request.seed } : {}),
      ...((request.imageSize || request.imageAspectRatio || request.imageResolution) &&
      modelConfig.supportsImageSize
        ? {
            image_config: {
              ...(request.imageSize
                ? { aspect_ratio: imageSizeToAspectRatio(request.imageSize) }
                : {}),
              ...(request.imageAspectRatio ? { aspect_ratio: request.imageAspectRatio } : {}),
              ...(request.imageResolution ? { image_size: request.imageResolution } : {})
            }
          }
        : {})
    };
  }
}
