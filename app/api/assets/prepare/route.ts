import { NextResponse } from "next/server";
import type { PrepareAssetUploadResponse } from "@/lib/api/contracts/assets";
import { prepareAssetUploadRequestSchema } from "@/lib/project/schema";
import {
  assertBlobConfigured,
  buildProjectAssetObjectKey,
  createAssetUploadClientToken
} from "@/lib/server/assets/config";
import { getSession } from "@/lib/server/auth/getSession";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    assertBlobConfigured();
    const payload = prepareAssetUploadRequestSchema.parse(await request.json());
    const pathname = buildProjectAssetObjectKey(session.user.id, payload);
    const { clientToken, maximumSizeInBytes } = await createAssetUploadClientToken(pathname, payload.kind);

    const response: PrepareAssetUploadResponse = {
      pathname,
      clientToken,
      access: "public",
      maximumSizeInBytes
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to prepare asset upload.";
    const status = message.includes("BLOB_READ_WRITE_TOKEN") ? 500 : 400;
    return NextResponse.json({ message }, { status });
  }
}
