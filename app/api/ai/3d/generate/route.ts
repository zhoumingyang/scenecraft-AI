import { NextResponse } from "next/server";
import { generateAi3DPlan } from "@/lib/ai/ai3d/core/pipeline";
import {
  generateAi3DRequestSchema,
  getAiApiErrorMessage
} from "@/lib/api/contracts/ai";
import {
  getOpenRouterApiKey
} from "@/lib/ai/openrouter/config";
import { AI_RATE_LIMIT_POLICIES } from "@/lib/server/aiRateLimit/policies";
import { withAiRateLimit } from "@/lib/server/aiRateLimit/withAiRateLimit";
import { withAuth } from "@/lib/server/auth/withAuth";
import { getServerErrorStatus } from "@/lib/server/http/errors";

export const maxDuration = 180;

export const POST = withAuth(
  withAiRateLimit(AI_RATE_LIMIT_POLICIES.ai3dGenerate, async (request) => {
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
      return NextResponse.json({ message }, { status: getServerErrorStatus(error, 400) });
    }
  })
);
