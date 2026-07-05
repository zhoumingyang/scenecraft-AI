import { NextResponse } from "next/server";
import { optimizeRenderExportImage } from "@/lib/ai/render-export/optimizer";
import { isOpenRouterApiKeyConfigurationErrorMessage } from "@/lib/ai/openrouter/config";
import {
  getAiApiErrorMessage,
  optimizeRenderExportRequestSchema
} from "@/lib/api/contracts/ai";
import { withAuth } from "@/lib/server/auth/withAuth";

export const maxDuration = 180;

function getRenderExportOptimizationErrorStatus(message: string) {
  return message.includes("_API_KEY is not configured") ||
    isOpenRouterApiKeyConfigurationErrorMessage(message)
    ? 500
    : 400;
}

export const POST = withAuth(async (request) => {
  try {
    const body = optimizeRenderExportRequestSchema.parse(await request.json());
    const result = await optimizeRenderExportImage({
      imageDataUrl: body.imageDataUrl,
      width: body.width,
      height: body.height
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = getAiApiErrorMessage(error, "Render export optimization failed.");
    return NextResponse.json(
      { message },
      { status: getRenderExportOptimizationErrorStatus(message) }
    );
  }
});
