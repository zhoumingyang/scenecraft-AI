import { SiliconFlowImageGenerationProvider } from "@/lib/ai/image-generation/providers/siliconflow";
import { OpenRouterImageGenerationProvider } from "@/lib/ai/image-generation/providers/openrouter";
import { getOpenRouterApiKey } from "@/lib/ai/openrouter/config";
import { ServerConfigurationError } from "@/lib/server/http/errors";
import type {
  ImageGenerationProvider,
  ImageGenerationProviderId
} from "@/lib/ai/image-generation/types";

export function createImageGenerationProvider(
  providerId: ImageGenerationProviderId
): ImageGenerationProvider {
  switch (providerId) {
    case "siliconflow": {
      const apiKey = process.env.SILICONFLOW_API_KEY?.trim();
      if (!apiKey) {
        throw new ServerConfigurationError("SILICONFLOW_API_KEY is not configured.");
      }

      return new SiliconFlowImageGenerationProvider(apiKey);
    }
    case "openrouter": {
      return new OpenRouterImageGenerationProvider(getOpenRouterApiKey());
    }
  }
}
