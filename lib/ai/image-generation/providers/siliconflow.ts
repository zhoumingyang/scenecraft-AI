import axios from "axios";
import { createHttpClient, getResponseHeader } from "@/lib/http/axios";
import type {
  ImageGenerationProvider,
  ImageGenerationRequest,
  ImageGenerationResult
} from "@/lib/ai/image-generation/types";

const SILICONFLOW_IMAGE_ENDPOINT = "https://api.siliconflow.cn/v1/images/generations";
const QWEN_IMAGE_DEFAULT_SIZE = "1328x1328";
const siliconFlowImageClient = createHttpClient();

type SiliconFlowResponse = {
  images?: Array<{
    url?: string;
  }>;
  seed?: number;
  message?: string;
};

export class SiliconFlowImageGenerationProvider implements ImageGenerationProvider {
  readonly id = "siliconflow" as const;

  constructor(private readonly apiKey: string) {}

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    try {
      const response = await siliconFlowImageClient.post<SiliconFlowResponse>(
        SILICONFLOW_IMAGE_ENDPOINT,
        this.buildRequestBody(request),
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`
          }
        }
      );

      const traceId = getResponseHeader(response.headers, "x-siliconcloud-trace-id");

      return {
        images:
          response.data?.images?.filter((item): item is { url: string } => typeof item.url === "string") ??
          [],
        seed: typeof response.data?.seed === "number" ? response.data.seed : null,
        traceId
      };
    } catch (error) {
      if (axios.isAxiosError<SiliconFlowResponse>(error)) {
        const traceId = getResponseHeader(error.response?.headers, "x-siliconcloud-trace-id");
        const status = error.response?.status ?? "unknown";
        const message =
          error.response?.data?.message || `SiliconFlow image request failed with status ${status}.`;
        throw new Error(traceId ? `${message} (trace: ${traceId})` : message);
      }

      throw error;
    }
  }

  private buildRequestBody(request: ImageGenerationRequest) {
    const baseBody = {
      model: request.model,
      prompt: request.prompt,
      seed: request.seed,
      cfg: request.cfg,
      num_inference_steps: request.inferenceSteps
    };

    if (request.model === "Qwen/Qwen-Image-Edit-2509") {
      const [image, image2, image3] = request.referenceImages ?? [];

      return {
        ...baseBody,
        image,
        image2,
        image3
      };
    }

    return {
      ...baseBody,
      image_size: request.imageSize ?? QWEN_IMAGE_DEFAULT_SIZE
    };
  }
}
