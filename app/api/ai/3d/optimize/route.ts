import { NextResponse } from "next/server";
import { optimizeAi3DPlanWithOpenRouter } from "@/lib/ai/ai3d/openrouter";
import type { OptimizeAi3DRequest } from "@/lib/api/contracts/ai";
import { validateAi3DPlan } from "@/render/editor/ai3d/plan";
import { getSession } from "@/lib/server/auth/getSession";

export const maxDuration = 240;

function validateRequestBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Partial<OptimizeAi3DRequest>;
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  const images = Array.isArray(payload.images)
    ? payload.images.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  if (!prompt) {
    throw new Error("Prompt is required.");
  }

  if (images.length < 3) {
    throw new Error("At least 3 isolated preview images are required.");
  }

  return {
    prompt,
    images,
    plan: validateAi3DPlan(payload.plan)
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
    const result = await optimizeAi3DPlanWithOpenRouter({
      apiKey,
      prompt: body.prompt,
      plan: body.plan,
      images: body.images
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 3D optimization failed.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
