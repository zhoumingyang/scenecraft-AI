import { NextResponse } from "next/server";
import { z } from "zod";
import { listPolyhavenCategoriesParamsSchema } from "@/lib/api/contracts/polyhaven";
import type { ListExternalAssetCategoriesResponse } from "@/lib/externalAssets/contracts";
import { isPolyhavenProviderEnabled } from "@/lib/externalAssets/config";
import { polyhavenProvider } from "@/lib/externalAssets/polyhaven";
import { withAuth } from "@/lib/server/auth/withAuth";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";

type RouteContext = {
  params: Promise<{ type: string }>;
};

export const GET = withAuth<RouteContext>(async (_request, context) => {
  if (!isPolyhavenProviderEnabled()) {
    return NextResponse.json({ message: "Poly Haven provider is disabled." }, { status: 404 });
  }

  try {
    const { type } = await context.params;
    const { assetType } = listPolyhavenCategoriesParamsSchema.parse({ type });
    const categories = await polyhavenProvider.listCategories(assetType);
    const response: ListExternalAssetCategoriesResponse = {
      assetType,
      categories
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "Failed to load Poly Haven categories.")
        : getErrorMessage(error, "Failed to load Poly Haven categories.");
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
});
