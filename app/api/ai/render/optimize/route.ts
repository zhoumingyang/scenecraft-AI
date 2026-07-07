import { NextResponse } from "next/server";
import { optimizeRenderExportImage } from "@/lib/ai/render-export/optimizer";
import {
  getAiApiErrorMessage,
  optimizeRenderExportRequestSchema
} from "@/lib/api/contracts/ai";
import { AI_RATE_LIMIT_POLICIES } from "@/lib/server/aiRateLimit/policies";
import { withAiRateLimit } from "@/lib/server/aiRateLimit/withAiRateLimit";
import { withAuth } from "@/lib/server/auth/withAuth";
import { getServerErrorStatus } from "@/lib/server/http/errors";

export const maxDuration = 180;

export const POST = withAuth(
  withAiRateLimit(AI_RATE_LIMIT_POLICIES.renderOptimize, async (request) => {
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
        { status: getServerErrorStatus(error, 400) }
      );
    }
  })
);
