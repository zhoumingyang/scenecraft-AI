import { NextResponse } from "next/server";
import { withAuth } from "@/lib/server/auth/withAuth";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";
import {
  fetchRemoteImageResponse,
  parseRemoteImageUrl
} from "./remoteImageFetch";

export const POST = withAuth(async (request) => {
  try {
    const body = (await request.json()) as { url?: unknown };
    const url = parseRemoteImageUrl(body.url);
    return await fetchRemoteImageResponse(url);
  } catch (error) {
    const message = getErrorMessage(error, "Failed to fetch remote image.");
    return NextResponse.json({ message }, { status: 400 });
  }
});
