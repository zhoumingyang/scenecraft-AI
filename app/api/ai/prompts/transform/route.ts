import { NextResponse } from "next/server";
import { transformPromptWithOpenRouter } from "@/lib/ai/prompt-transform/openrouter";
import {
  getAiApiErrorMessage,
  transformPromptRequestSchema
} from "@/lib/api/contracts/ai";
import {
  getOpenRouterApiKey,
  isOpenRouterApiKeyConfigurationErrorMessage
} from "@/lib/ai/openrouter/config";
import { AI_RATE_LIMIT_POLICIES } from "@/lib/server/aiRateLimit/policies";
import { withAiRateLimit } from "@/lib/server/aiRateLimit/withAiRateLimit";
import { withAuth } from "@/lib/server/auth/withAuth";

function getPromptTransformErrorStatus(message: string) {
  return isOpenRouterApiKeyConfigurationErrorMessage(message) ? 500 : 400;
}

export const POST = withAuth(
  withAiRateLimit(AI_RATE_LIMIT_POLICIES.promptTransform, async (request) => {
    try {
      const apiKey = getOpenRouterApiKey();
      const body = transformPromptRequestSchema.parse(await request.json());
      const result = await transformPromptWithOpenRouter({
        apiKey,
        mode: body.mode,
        prompt: body.prompt,
        target: body.target
      });

      return NextResponse.json(result);
    } catch (error) {
      const message = getAiApiErrorMessage(error, "Prompt transform failed.");
      return NextResponse.json({ message }, { status: getPromptTransformErrorStatus(message) });
    }
  })
);
