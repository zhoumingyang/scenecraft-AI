import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { getSession } from "@/lib/server/auth/getSession";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";

const MAX_REMOTE_IMAGE_FETCH_BYTES = 25 * 1024 * 1024;
const MAX_REMOTE_IMAGE_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function normalizeHostname(hostname: string) {
  return hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

function parseIpv4Address(address: string) {
  const parts = address.split(".");
  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map((part) => Number(part));
  return octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
    ? octets
    : null;
}

function getIpv4MappedAddress(address: string) {
  const normalized = normalizeHostname(address);
  const mappedPrefix = "::ffff:";
  return normalized.startsWith(mappedPrefix) ? normalized.slice(mappedPrefix.length) : null;
}

function isBlockedIpv4Address(address: string) {
  const octets = parseIpv4Address(address);
  if (!octets) {
    return true;
  }

  const [first, second, third, fourth] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    (first === 255 && second === 255 && third === 255 && fourth === 255)
  );
}

function isBlockedIpv6Address(address: string) {
  const normalized = normalizeHostname(address);
  const mappedIpv4 = getIpv4MappedAddress(normalized);
  if (mappedIpv4) {
    return isBlockedIpv4Address(mappedIpv4);
  }

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

function isBlockedIpAddress(address: string) {
  const normalized = normalizeHostname(address);
  const version = isIP(normalized);

  if (version === 4) {
    return isBlockedIpv4Address(normalized);
  }

  if (version === 6) {
    return isBlockedIpv6Address(normalized);
  }

  return true;
}

function parseRemoteImageUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Image URL is required.");
  }

  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS image URLs can be fetched.");
  }

  return url;
}

async function assertPublicRemoteImageUrl(url: URL) {
  const hostname = normalizeHostname(url.hostname);

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Private network image URLs are not allowed.");
  }

  if (isIP(hostname)) {
    if (isBlockedIpAddress(hostname)) {
      throw new Error("Private network image URLs are not allowed.");
    }
    return;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some((address) => isBlockedIpAddress(address.address))
  ) {
    throw new Error("Private network image URLs are not allowed.");
  }
}

async function fetchPublicRemoteImage(url: URL) {
  let nextUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REMOTE_IMAGE_REDIRECTS; redirectCount += 1) {
    await assertPublicRemoteImageUrl(nextUrl);

    const response = await fetch(nextUrl, {
      headers: {
        Accept: "image/*"
      },
      cache: "no-store",
      redirect: "manual"
    });

    if (!REDIRECT_STATUSES.has(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`Remote image request failed with status ${response.status}.`);
    }

    nextUrl = parseRemoteImageUrl(new URL(location, nextUrl).toString());
  }

  throw new Error("Remote image request exceeded the redirect limit.");
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
    const response = await fetchPublicRemoteImage(url);

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
