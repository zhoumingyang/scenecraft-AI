import { NextResponse } from "next/server";
import { getImageGenerationModelConfig } from "@/lib/ai/image-generation/models";
import { createImageGenerationProvider } from "@/lib/ai/image-generation/providerRegistry";
import {
  generateAiImagesRequestSchema,
  getAiApiErrorMessage
} from "@/lib/api/contracts/ai";
import { withAuth } from "@/lib/server/auth/withAuth";

export const maxDuration = 180;

function getImageGenerationErrorStatus(message: string) {
  return message.includes("_API_KEY is not configured") ? 500 : 400;
}

export const POST = withAuth(async (request) => {
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
    return NextResponse.json({ message }, { status: getImageGenerationErrorStatus(message) });
  }
});
