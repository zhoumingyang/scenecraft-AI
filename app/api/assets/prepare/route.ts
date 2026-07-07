import { NextResponse } from "next/server";
import type { PrepareAssetUploadResponse } from "@/lib/api/contracts/assets";
import { prepareAssetUploadRequestSchema } from "@/lib/project/schema";
import {
  assertBlobConfigured,
  buildProjectAssetObjectKey,
  createAssetUploadClientToken
} from "@/lib/server/assets/config";
import { withAuth } from "@/lib/server/auth/withAuth";
import { getServerErrorStatus } from "@/lib/server/http/errors";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";

export const POST = withAuth(async (request, _context, session) => {
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
    const message = getErrorMessage(error, "Failed to prepare asset upload.");
    return NextResponse.json({ message }, { status: getServerErrorStatus(error, 400) });
  }
});
