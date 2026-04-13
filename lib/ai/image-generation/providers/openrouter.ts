import axios from "axios";
import { getOpenRouterChatCompletionsEndpoint } from "@/lib/ai/openrouter/config";
import {
  getImageGenerationModelConfig,
  imageSizeToAspectRatio
} from "@/lib/ai/image-generation/models";
import { createHttpClient, getResponseHeader } from "@/lib/http/axios";
import type {
  ImageGenerationProvider,
  ImageGenerationRequest,
  ImageGenerationResult
} from "@/lib/ai/image-generation/types";

const openRouterImageClient = createHttpClient();

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
      const response = await openRouterImageClient.post<OpenRouterResponse>(
        getOpenRouterChatCompletionsEndpoint(),
        this.buildRequestBody(request),
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`
          }
        }
      );

      const traceId = getResponseHeader(response.headers, "x-request-id") ?? response.data?.id ?? null;
      const message = response.data?.choices?.[0]?.message;
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
      if (axios.isAxiosError<OpenRouterResponse>(error)) {
        const traceId =
          getResponseHeader(error.response?.headers, "x-request-id") ?? error.response?.data?.id ?? null;
        const status = error.response?.status ?? "unknown";
        const message =
          error.response?.data?.error?.message ||
          `OpenRouter image request failed with status ${status}.`;
        throw new Error(traceId ? `${message} (trace: ${traceId})` : message);
      }

      throw error;
    }
  }

  private buildRequestBody(request: ImageGenerationRequest) {
    const modelConfig = getImageGenerationModelConfig(request.model);
    const content = [
      { type: "text", text: request.prompt },
      ...(request.referenceImages ?? []).map((imageUrl) => ({
        type: "image_url" as const,
        image_url: { url: imageUrl }
      }))
    ];

    return {
      model: request.model,
      messages: [
        {
          role: "user",
          content
        }
      ],
      modalities: modelConfig.outputModalities,
      stream: false,
      ...(typeof request.seed === "number" ? { seed: request.seed } : {}),
      ...(request.imageSize && modelConfig.supportsImageSize
        ? {
            image_config: {
              aspect_ratio: imageSizeToAspectRatio(request.imageSize)
            }
          }
        : {})
    };
  }
}
