import { NextResponse } from "next/server";
import { optimizeAi3DPlan } from "@/lib/ai/ai3d/core/pipeline";
import {
  getAiApiErrorMessage,
  optimizeAi3DRequestSchema
} from "@/lib/api/contracts/ai";
import {
  getOpenRouterApiKey,
  isOpenRouterApiKeyConfigurationErrorMessage
} from "@/lib/ai/openrouter/config";
import { withAuth } from "@/lib/server/auth/withAuth";

export const maxDuration = 240;

function getAi3DOptimizationErrorStatus(message: string) {
  return isOpenRouterApiKeyConfigurationErrorMessage(message) ? 500 : 400;
}

export const POST = withAuth(async (request) => {
  try {
    const apiKey = getOpenRouterApiKey();
    const body = optimizeAi3DRequestSchema.parse(await request.json());
    const result = await optimizeAi3DPlan({
      apiKey,
      prompt: body.prompt,
      plan: body.plan,
      images: body.images,
      intent: body.intent,
      diagnostics: body.diagnostics
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = getAiApiErrorMessage(error, "AI 3D optimization failed.");
    return NextResponse.json({ message }, { status: getAi3DOptimizationErrorStatus(message) });
  }
});
