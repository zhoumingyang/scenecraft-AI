import { NextResponse } from "next/server";
import { generateAi3DPlan } from "@/lib/ai/ai3d/core/pipeline";
import {
  generateAi3DRequestSchema,
  getAiApiErrorMessage
} from "@/lib/api/contracts/ai";
import {
  getOpenRouterApiKey,
  isOpenRouterApiKeyConfigurationErrorMessage
} from "@/lib/ai/openrouter/config";
import { withAuth } from "@/lib/server/auth/withAuth";

export const maxDuration = 180;

function getAi3DGenerationErrorStatus(message: string) {
  return isOpenRouterApiKeyConfigurationErrorMessage(message) ? 500 : 400;
}

export const POST = withAuth(async (request) => {
  try {
    const apiKey = getOpenRouterApiKey();
    const body = generateAi3DRequestSchema.parse(await request.json());
    const result = await generateAi3DPlan({
      apiKey,
      prompt: body.prompt,
      intent: body.intent,
      referenceImages: body.referenceImages ?? []
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = getAiApiErrorMessage(error, "AI 3D generation failed.");
    return NextResponse.json({ message }, { status: getAi3DGenerationErrorStatus(message) });
  }
});
