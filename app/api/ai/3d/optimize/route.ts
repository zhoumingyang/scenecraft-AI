import { NextResponse } from "next/server";
import { optimizeAi3DPlan } from "@/lib/ai/ai3d/core/pipeline";
import {
  getAiApiErrorMessage,
  optimizeAi3DRequestSchema
} from "@/lib/api/contracts/ai";
import { getSession } from "@/lib/server/auth/getSession";

export const maxDuration = 240;

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
    return NextResponse.json({ message }, { status: 400 });
  }
}
