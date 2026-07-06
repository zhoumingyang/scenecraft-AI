import { NextResponse } from "next/server";
import { z } from "zod";
import { getPolyhavenAssetDetailQuerySchema } from "@/lib/api/contracts/polyhaven";
import type { GetExternalAssetDetailResponse } from "@/lib/externalAssets/contracts";
import { isPolyhavenProviderEnabled } from "@/lib/externalAssets/config";
import { polyhavenProvider } from "@/lib/externalAssets/polyhaven";
import { withAuth } from "@/lib/server/auth/withAuth";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const GET = withAuth<RouteContext>(async (request, context) => {
  if (!isPolyhavenProviderEnabled()) {
    return NextResponse.json({ message: "Poly Haven provider is disabled." }, { status: 404 });
  }

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const { assetType } = getPolyhavenAssetDetailQuerySchema.parse({
      type: searchParams.get("type")
    });
    const asset = await polyhavenProvider.getAssetDetail({
      assetId: id,
      assetType
    });
    const response: GetExternalAssetDetailResponse = {
      asset
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "Failed to load Poly Haven asset details.")
        : getErrorMessage(error, "Failed to load Poly Haven asset details.");
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
});
