import { NextResponse } from "next/server";
import type { GetExternalAssetDetailResponse } from "@/lib/externalAssets/contracts";
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

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
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
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const assetType = parseAssetType(searchParams.get("type"));
    const asset = await polyhavenProvider.getAssetDetail({
      assetId: id,
      assetType
    });
    const response: GetExternalAssetDetailResponse = {
      asset
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = getErrorMessage(error, "Failed to load Poly Haven asset details.");
    const status = message.includes("Unsupported asset type") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
