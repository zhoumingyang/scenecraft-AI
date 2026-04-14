import { NextResponse } from "next/server";
import { validateAi3DIntentInput } from "@/lib/ai/ai3d/intent";
import { generateAi3DPlanWithOpenRouter } from "@/lib/ai/ai3d/openrouter";
import type { GenerateAi3DRequest } from "@/lib/api/contracts/ai";
import { getSession } from "@/lib/server/auth/getSession";

export const maxDuration = 180;

function validateRequestBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Partial<GenerateAi3DRequest>;
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  const referenceImages = Array.isArray(payload.referenceImages)
    ? payload.referenceImages.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  if (!prompt) {
    throw new Error("Prompt is required.");
  }

  return {
    prompt,
    intent: validateAi3DIntentInput(payload.intent),
    referenceImages
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
    const result = await generateAi3DPlanWithOpenRouter({
      apiKey,
      prompt: body.prompt,
      intent: body.intent,
      referenceImages: body.referenceImages
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 3D generation failed.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
