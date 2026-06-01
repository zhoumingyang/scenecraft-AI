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
import { getSession } from "@/lib/server/auth/getSession";

function getPromptTransformErrorStatus(message: string) {
  return isOpenRouterApiKeyConfigurationErrorMessage(message) ? 500 : 400;
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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
}
