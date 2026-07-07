import { NextResponse } from "next/server";
import { getImageGenerationModelConfig } from "@/lib/ai/image-generation/models";
import { createImageGenerationProvider } from "@/lib/ai/image-generation/providerRegistry";
import {
  generateAiImagesRequestSchema,
  getAiApiErrorMessage
} from "@/lib/api/contracts/ai";
import { AI_RATE_LIMIT_POLICIES } from "@/lib/server/aiRateLimit/policies";
import { withAiRateLimit } from "@/lib/server/aiRateLimit/withAiRateLimit";
import { withAuth } from "@/lib/server/auth/withAuth";
import { getServerErrorStatus } from "@/lib/server/http/errors";

export const maxDuration = 180;

export const POST = withAuth(
  withAiRateLimit(AI_RATE_LIMIT_POLICIES.imageGenerate, async (request) => {
    try {
      const body = generateAiImagesRequestSchema.parse(await request.json());
      const modelConfig = getImageGenerationModelConfig(body.model);
      const provider = createImageGenerationProvider(modelConfig.providerId);
      const result = await provider.generateImage({
        providerId: modelConfig.providerId,
        model: body.model,
        prompt: body.prompt,
        seed: body.seed,
        imageSize: body.imageSize,
        cfg: body.cfg,
        inferenceSteps: body.inferenceSteps,
        referenceImages: body.referenceImages ?? []
      });

      return NextResponse.json(result);
    } catch (error) {
      const message = getAiApiErrorMessage(error, "Image generation failed.");
      return NextResponse.json({ message }, { status: getServerErrorStatus(error, 400) });
    }
  })
);
