import {
  getImageGenerationModelConfig,
  imageSizeToAspectRatio
} from "@/lib/ai/image-generation/models";
import type {
  ImageGenerationProvider,
  ImageGenerationRequest,
  ImageGenerationResult
} from "@/lib/ai/image-generation/types";

const OPENROUTER_IMAGE_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

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
    const response = await fetch(OPENROUTER_IMAGE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(this.buildRequestBody(request))
    });

    const payload = (await response.json().catch(() => null)) as OpenRouterResponse | null;
    const traceId = response.headers.get("x-request-id") ?? payload?.id ?? null;

    if (!response.ok) {
      const message =
        payload?.error?.message || `OpenRouter image request failed with status ${response.status}.`;
      throw new Error(traceId ? `${message} (trace: ${traceId})` : message);
    }

    const message = payload?.choices?.[0]?.message;
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
