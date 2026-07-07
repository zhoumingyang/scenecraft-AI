import { NextResponse } from "next/server";
import {
  AI_PBR_TEXTURE_CFG,
  AI_PBR_TEXTURE_IMAGE_SIZE,
  AI_PBR_TEXTURE_INFERENCE_STEPS,
  AI_PBR_TEXTURE_MODEL_ID
} from "@/lib/ai/pbr-texture/constants";
import { buildAiPbrTexturePrompt } from "@/lib/ai/pbr-texture/prompt";
import { getImageGenerationModelConfig } from "@/lib/ai/image-generation/models";
import { createImageGenerationProvider } from "@/lib/ai/image-generation/providerRegistry";
import {
  generateAiPbrTextureRequestSchema,
  getAiApiErrorMessage
} from "@/lib/api/contracts/ai";
import { AI_RATE_LIMIT_POLICIES } from "@/lib/server/aiRateLimit/policies";
import { withAiRateLimit } from "@/lib/server/aiRateLimit/withAiRateLimit";
import { withAuth } from "@/lib/server/auth/withAuth";
import { getServerErrorStatus } from "@/lib/server/http/errors";
import { PBR_ATLAS_LAYOUT_VERSION } from "@/render/editor";

export const maxDuration = 180;

export const POST = withAuth(
  withAiRateLimit(AI_RATE_LIMIT_POLICIES.pbrTextureGenerate, async (request) => {
    try {
      const body = generateAiPbrTextureRequestSchema.parse(await request.json());
      const modelConfig = getImageGenerationModelConfig(AI_PBR_TEXTURE_MODEL_ID);
      const provider = createImageGenerationProvider(modelConfig.providerId);
      const prompt = buildAiPbrTexturePrompt(body.prompt);
      const result = await provider.generateImage({
        providerId: modelConfig.providerId,
        model: AI_PBR_TEXTURE_MODEL_ID,
        prompt,
        seed: body.seed,
        imageSize: body.imageSize ?? AI_PBR_TEXTURE_IMAGE_SIZE,
        cfg: AI_PBR_TEXTURE_CFG,
        inferenceSteps: AI_PBR_TEXTURE_INFERENCE_STEPS,
        referenceImages: []
      });
      const atlasImageUrl = result.images[0]?.url;

      if (!atlasImageUrl) {
        throw new Error("The provider returned no generated texture atlas.");
      }

      return NextResponse.json({
        atlasImageUrl,
        model: AI_PBR_TEXTURE_MODEL_ID,
        prompt: body.prompt,
        seed: typeof result.seed === "number" ? result.seed : body.seed ?? null,
        traceId: result.traceId,
        layoutVersion: PBR_ATLAS_LAYOUT_VERSION
      });
    } catch (error) {
      const message = getAiApiErrorMessage(error, "AI PBR texture generation failed.");
      return NextResponse.json({ message }, { status: getServerErrorStatus(error, 400) });
    }
  })
);
