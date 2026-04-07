import { SiliconFlowImageGenerationProvider } from "@/lib/ai/image-generation/providers/siliconflow";
import type {
  ImageGenerationProvider,
  ImageGenerationProviderId
} from "@/lib/ai/image-generation/types";

export function createImageGenerationProvider(
  providerId: ImageGenerationProviderId
): ImageGenerationProvider {
  switch (providerId) {
    case "siliconflow": {
      const apiKey = process.env.SILICONFLOW_API_KEY;
      if (!apiKey) {
        throw new Error("Missing SILICONFLOW_API_KEY env.");
      }

      return new SiliconFlowImageGenerationProvider(apiKey);
    }
    case "openrouter":
    case "aliyun":
    case "google":
      throw new Error(`Image generation provider "${providerId}" has not been implemented yet.`);
  }
}
