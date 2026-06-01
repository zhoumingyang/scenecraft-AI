import { NextResponse } from "next/server";
import { recommendExternalAssets } from "@/lib/ai/asset-recommendation";
import {
  getAiApiErrorMessage,
  recommendAiExternalAssetsRequestSchema
} from "@/lib/api/contracts/ai";
import {
  getOpenRouterApiKey,
  isOpenRouterApiKeyConfigurationErrorMessage
} from "@/lib/ai/openrouter/config";
import { isPolyhavenProviderEnabled } from "@/lib/externalAssets/config";
import { withAuth } from "@/lib/server/auth/withAuth";

export const maxDuration = 180;

function getRecommendationErrorStatus(message: string) {
  if (isOpenRouterApiKeyConfigurationErrorMessage(message)) {
    return 500;
  }

  if (message.includes("Poly Haven provider is disabled")) {
    return 404;
  }

  return 400;
}

export const POST = withAuth(async (request) => {
  if (!isPolyhavenProviderEnabled()) {
    return NextResponse.json({ message: "Poly Haven provider is disabled." }, { status: 404 });
  }

  try {
    const apiKey = getOpenRouterApiKey();
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
});
