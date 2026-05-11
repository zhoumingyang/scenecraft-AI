import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth/getSession";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";

const MAX_REMOTE_IMAGE_FETCH_BYTES = 25 * 1024 * 1024;
const PRIVATE_HOSTNAME_RE = /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[?::1\]?|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})$/i;

function parseRemoteImageUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Image URL is required.");
  }

  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS image URLs can be fetched.");
  }

  if (PRIVATE_HOSTNAME_RE.test(url.hostname)) {
    throw new Error("Private network image URLs are not allowed.");
  }

  return url;
}

async function readLimitedResponseBody(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_REMOTE_IMAGE_FETCH_BYTES) {
      throw new Error("Image exceeds the maximum supported size.");
    }
    return new Uint8Array(buffer);
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > MAX_REMOTE_IMAGE_FETCH_BYTES) {
      reader.cancel().catch(() => undefined);
      throw new Error("Image exceeds the maximum supported size.");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  chunks.forEach((chunk) => {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  });

  return body;
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { url?: unknown };
    const url = parseRemoteImageUrl(body.url);
    const response = await fetch(url, {
      headers: {
        Accept: "image/*"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Remote image request failed with status ${response.status}.`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REMOTE_IMAGE_FETCH_BYTES) {
      throw new Error("Image exceeds the maximum supported size.");
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    if (!contentType.startsWith("image/")) {
      throw new Error("Remote URL did not return an image.");
    }

    const imageBody = await readLimitedResponseBody(response);

    return new Response(imageBody, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = getErrorMessage(error, "Failed to fetch remote image.");
    return NextResponse.json({ message }, { status: 400 });
  }
}
