import { NextResponse } from "next/server";
import { transformPromptWithOpenRouter } from "@/lib/ai/prompt-transform/openrouter";
import type { TransformPromptRequest } from "@/lib/api/contracts/ai";
import { getSession } from "@/lib/server/auth/getSession";

function validateRequestBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Partial<TransformPromptRequest>;
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";

  if (!prompt) {
    throw new Error("Prompt is required.");
  }

  if (payload.mode !== "optimize" && payload.mode !== "translate-en") {
    throw new Error("Unsupported prompt transform mode.");
  }

  return {
    mode: payload.mode,
    prompt
  };
}

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
    const body = validateRequestBody(await request.json());
    const result = await transformPromptWithOpenRouter({
      apiKey,
      mode: body.mode,
      prompt: body.prompt
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prompt transform failed.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
