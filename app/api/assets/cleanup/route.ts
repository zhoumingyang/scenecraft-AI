import { NextResponse } from "next/server";
import { z } from "zod";
import type {
  CleanupUploadedAssetsRequest,
  CleanupUploadedAssetsResponse
} from "@/lib/api/contracts/assets";
import {
  assertBlobConfigured,
  deleteBlobAssets
} from "@/lib/server/assets/config";
import { getSession } from "@/lib/server/auth/getSession";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";

const cleanupUploadedAssetsRequestSchema = z
  .object({
    objectKeys: z.array(z.string().trim().min(1).max(2048)).max(100)
  })
  .strict();

function assertObjectKeysBelongToUser(objectKeys: string[], userId: string) {
  const userAssetPrefix = `users/${userId}/projects/`;
  if (objectKeys.some((objectKey) => !objectKey.startsWith(userAssetPrefix))) {
    throw new Error("Uploaded asset object key is invalid for this user.");
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    assertBlobConfigured();
    const payload = cleanupUploadedAssetsRequestSchema.parse(
      (await request.json()) as CleanupUploadedAssetsRequest
    );
    const objectKeys = Array.from(new Set(payload.objectKeys));
    assertObjectKeysBelongToUser(objectKeys, session.user.id);
    await deleteBlobAssets(objectKeys);

    const response: CleanupUploadedAssetsResponse = {
      deletedCount: objectKeys.length
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = getErrorMessage(error, "Failed to clean up uploaded assets.");
    const status = message.includes("BLOB_READ_WRITE_TOKEN") ? 500 : 400;
    return NextResponse.json({ message }, { status });
  }
}
