import { NextResponse } from "next/server";
import {
  AI_PANORAMA_CFG,
  AI_PANORAMA_HEIGHT,
  AI_PANORAMA_INFERENCE_STEPS,
  AI_PANORAMA_MODEL_ID,
  AI_PANORAMA_OUTPUT_MIME_TYPE,
  AI_PANORAMA_PROVIDER_ASPECT_RATIO,
  AI_PANORAMA_WIDTH
} from "@/lib/ai/panorama/constants";
import { getImageGenerationModelConfig } from "@/lib/ai/image-generation/models";
import { createImageGenerationProvider } from "@/lib/ai/image-generation/providerRegistry";
import {
  generateAiPanoramaRequestSchema,
  getAiApiErrorMessage
} from "@/lib/api/contracts/ai";
import { resolvePanoramaEnvironmentIntent } from "@/lib/ai/panorama/environmentIntent";
import {
  getOpenRouterApiKey,
  isOpenRouterApiKeyConfigurationErrorMessage
} from "@/lib/ai/openrouter/config";
import { AI_RATE_LIMIT_POLICIES } from "@/lib/server/aiRateLimit/policies";
import { withAiRateLimit } from "@/lib/server/aiRateLimit/withAiRateLimit";
import { withAuth } from "@/lib/server/auth/withAuth";

export const maxDuration = 180;

function getAiPanoramaErrorStatus(message: string) {
  return message.includes("_API_KEY is not configured") ||
    isOpenRouterApiKeyConfigurationErrorMessage(message)
    ? 500
    : 400;
}

function buildPanoramaPrompt(prompt: string) {
  return [
    "Create a seamless equirectangular 360-degree panorama environment map for a 3D scene.",
    "The image must read as a complete horizon-wrapped scene with no borders, text, UI, watermark, or visible frame.",
    "Use an ultra-wide panorama composition suitable for a scene background and environment lighting.",
    "Keep the full 360-degree horizon and important scene content inside a centered 2:1 safe area because the final applied environment will be center-cropped to 2048x1024.",
    `User prompt: ${prompt}`
  ].join("\n");
}

export const POST = withAuth(
  withAiRateLimit(AI_RATE_LIMIT_POLICIES.panoramaGenerate, async (request) => {
    try {
      const body = generateAiPanoramaRequestSchema.parse(await request.json());
      const openRouterApiKey = getOpenRouterApiKey();
      const modelConfig = getImageGenerationModelConfig(AI_PANORAMA_MODEL_ID);
      const provider = createImageGenerationProvider(modelConfig.providerId);
      const environmentIntent = await resolvePanoramaEnvironmentIntent({
        apiKey: openRouterApiKey,
        prompt: body.prompt
      }).catch((error) => {
        console.warn("[ai-panorama] Failed to resolve environment intent.", error);
        return null;
      });
      const generationPrompt = environmentIntent?.enhancedPrompt ?? body.prompt;
      const result = await provider.generateImage({
        providerId: modelConfig.providerId,
        model: AI_PANORAMA_MODEL_ID,
        prompt: buildPanoramaPrompt(generationPrompt),
        imageAspectRatio: AI_PANORAMA_PROVIDER_ASPECT_RATIO,
        cfg: AI_PANORAMA_CFG,
        inferenceSteps: AI_PANORAMA_INFERENCE_STEPS,
        referenceImages: []
      });
      const panoramaImageUrl = result.images[0]?.url;

      if (!panoramaImageUrl) {
        throw new Error("The provider returned no generated panorama.");
      }

      return NextResponse.json({
        panoramaImageUrl,
        model: AI_PANORAMA_MODEL_ID,
        prompt: body.prompt,
        enhancedPrompt: environmentIntent?.enhancedPrompt,
        environmentPatch: environmentIntent?.environmentPatch,
        width: AI_PANORAMA_WIDTH,
        height: AI_PANORAMA_HEIGHT,
        mimeType: AI_PANORAMA_OUTPUT_MIME_TYPE,
        traceId: result.traceId
      });
    } catch (error) {
      const message = getAiApiErrorMessage(error, "AI panorama generation failed.");
      return NextResponse.json({ message }, { status: getAiPanoramaErrorStatus(message) });
    }
  })
);
