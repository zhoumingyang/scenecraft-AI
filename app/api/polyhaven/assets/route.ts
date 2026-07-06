import { NextResponse } from "next/server";
import { z } from "zod";
import { listPolyhavenAssetsQuerySchema } from "@/lib/api/contracts/polyhaven";
import type { ListExternalAssetsResponse } from "@/lib/externalAssets/contracts";
import { isPolyhavenProviderEnabled } from "@/lib/externalAssets/config";
import { polyhavenProvider } from "@/lib/externalAssets/polyhaven";
import { withAuth } from "@/lib/server/auth/withAuth";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";

export const GET = withAuth(async (request) => {
  if (!isPolyhavenProviderEnabled()) {
    return NextResponse.json({ message: "Poly Haven provider is disabled." }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = listPolyhavenAssetsQuerySchema.parse({
      type: searchParams.get("type"),
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
      q: searchParams.get("q"),
      category: searchParams.get("category")
    });
    const response: ListExternalAssetsResponse = await polyhavenProvider.listAssets({
      assetType: query.assetType,
      page: query.page,
      pageSize: query.pageSize,
      query: query.query,
      category: query.category
    });

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "Failed to load Poly Haven assets.")
        : getErrorMessage(error, "Failed to load Poly Haven assets.");
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
});
