import type {
  ImageGenerationProvider,
  ImageGenerationRequest,
  ImageGenerationResult
} from "@/lib/ai/image-generation/types";

const SILICONFLOW_IMAGE_ENDPOINT = "https://api.siliconflow.cn/v1/images/generations";
const QWEN_IMAGE_DEFAULT_SIZE = "1328x1328";

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
    const response = await fetch(SILICONFLOW_IMAGE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(this.buildRequestBody(request))
    });

    const traceId = response.headers.get("x-siliconcloud-trace-id");
    const payload = (await response.json().catch(() => null)) as SiliconFlowResponse | null;

    if (!response.ok) {
      const message =
        payload?.message || `SiliconFlow image request failed with status ${response.status}.`;
      throw new Error(traceId ? `${message} (trace: ${traceId})` : message);
    }

    return {
      images:
        payload?.images?.filter((item): item is { url: string } => typeof item.url === "string") ?? [],
      seed: typeof payload?.seed === "number" ? payload.seed : null,
      traceId
    };
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
