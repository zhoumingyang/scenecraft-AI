import { NextResponse } from "next/server";
import type { ListExternalAssetCategoriesResponse } from "@/lib/externalAssets/contracts";
import { isPolyhavenProviderEnabled } from "@/lib/externalAssets/config";
import { polyhavenProvider } from "@/lib/externalAssets/polyhaven";
import type { ExternalAssetType } from "@/lib/externalAssets/types";
import { getSession } from "@/lib/server/auth/getSession";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";

function parseAssetType(value: string): ExternalAssetType {
  if (value === "hdri" || value === "texture" || value === "model") {
    return value;
  }

  throw new Error("Unsupported asset type.");
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ type: string }>;
  }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isPolyhavenProviderEnabled()) {
    return NextResponse.json({ message: "Poly Haven provider is disabled." }, { status: 404 });
  }

  try {
    const { type } = await context.params;
    const assetType = parseAssetType(type);
    const categories = await polyhavenProvider.listCategories(assetType);
    const response: ListExternalAssetCategoriesResponse = {
      assetType,
      categories
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = getErrorMessage(error, "Failed to load Poly Haven categories.");
    const status = message.includes("Unsupported asset type") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
