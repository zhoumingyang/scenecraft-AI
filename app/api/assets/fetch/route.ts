import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchRemoteImageRequestSchema } from "@/lib/api/contracts/assets";
import { withAuth } from "@/lib/server/auth/withAuth";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";
import { fetchRemoteImageResponse } from "./remoteImageFetch";

export const POST = withAuth(async (request) => {
  try {
    const { url } = fetchRemoteImageRequestSchema.parse(await request.json());
    return await fetchRemoteImageResponse(url);
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "Failed to fetch remote image.")
        : getErrorMessage(error, "Failed to fetch remote image.");
    return NextResponse.json({ message }, { status: 400 });
  }
});
