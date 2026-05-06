import { NextResponse } from "next/server";
import type { ListExternalAssetsResponse } from "@/lib/externalAssets/contracts";
import { isPolyhavenProviderEnabled } from "@/lib/externalAssets/config";
import { polyhavenProvider } from "@/lib/externalAssets/polyhaven";
import type { ExternalAssetType } from "@/lib/externalAssets/types";
import { getSession } from "@/lib/server/auth/getSession";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";

function parseAssetType(value: string | null): ExternalAssetType {
  if (value === "hdri" || value === "texture") {
    return value;
  }

  throw new Error("Unsupported asset type.");
}

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isPolyhavenProviderEnabled()) {
    return NextResponse.json({ message: "Poly Haven provider is disabled." }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const assetType = parseAssetType(searchParams.get("type"));
    const page = parsePositiveInteger(searchParams.get("page"), 1);
    const pageSize = parsePositiveInteger(searchParams.get("pageSize"), 24);
    const response: ListExternalAssetsResponse = await polyhavenProvider.listAssets({
      assetType,
      page,
      pageSize,
      query: searchParams.get("q"),
      category: searchParams.get("category")
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = getErrorMessage(error, "Failed to load Poly Haven assets.");
    const status = message.includes("Unsupported asset type") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
