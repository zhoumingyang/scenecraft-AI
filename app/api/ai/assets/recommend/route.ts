import { NextResponse } from "next/server";
import { recommendExternalAssets } from "@/lib/ai/asset-recommendation";
import {
  getAiApiErrorMessage,
  recommendAiExternalAssetsRequestSchema
} from "@/lib/api/contracts/ai";
import { isPolyhavenProviderEnabled } from "@/lib/externalAssets/config";
import { getSession } from "@/lib/server/auth/getSession";

export const maxDuration = 180;

function getRecommendationErrorStatus(message: string) {
  if (message.includes("OPENROUTER_API_KEY is not configured")) {
    return 500;
  }

  if (message.includes("Poly Haven provider is disabled")) {
    return 404;
  }

  return 400;
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isPolyhavenProviderEnabled()) {
    return NextResponse.json({ message: "Poly Haven provider is disabled." }, { status: 404 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({ message: "OPENROUTER_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const body = recommendAiExternalAssetsRequestSchema.parse(await request.json());
    const result = await recommendExternalAssets({
      apiKey,
      prompt: body.prompt,
      scope: body.scope,
      selectedTarget: body.selectedTarget,
      sceneContext: body.sceneContext
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = getAiApiErrorMessage(error, "AI asset recommendations failed.");
    return NextResponse.json({ message }, { status: getRecommendationErrorStatus(message) });
  }
}
