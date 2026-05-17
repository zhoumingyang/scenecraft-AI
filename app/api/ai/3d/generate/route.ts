import { NextResponse } from "next/server";
import { generateAi3DPlan } from "@/lib/ai/ai3d/core/pipeline";
import {
  generateAi3DRequestSchema,
  getAiApiErrorMessage
} from "@/lib/api/contracts/ai";
import { getSession } from "@/lib/server/auth/getSession";

export const maxDuration = 180;

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
    return NextResponse.json({ message }, { status: 400 });
  }
}
