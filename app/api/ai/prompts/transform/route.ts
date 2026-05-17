import { NextResponse } from "next/server";
import { transformPromptWithOpenRouter } from "@/lib/ai/prompt-transform/openrouter";
import {
  getAiApiErrorMessage,
  transformPromptRequestSchema
} from "@/lib/api/contracts/ai";
import { getSession } from "@/lib/server/auth/getSession";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({ message: "OPENROUTER_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const body = transformPromptRequestSchema.parse(await request.json());
    const result = await transformPromptWithOpenRouter({
      apiKey,
      mode: body.mode,
      prompt: body.prompt
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = getAiApiErrorMessage(error, "Prompt transform failed.");
    return NextResponse.json({ message }, { status: 400 });
  }
}
