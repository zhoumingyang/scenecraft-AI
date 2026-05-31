import { getPolyhavenRequestIdentity } from "./config";
import type { ExternalAssetListItem, ExternalAssetType, ExternalAssetFileOption } from "./types";

const POLYHAVEN_API_BASE_URL = "https://api.polyhaven.com";
const POLYHAVEN_SITE_BASE_URL = "https://polyhaven.com";
const POLYHAVEN_LICENSE_LABEL = "CC0";
const REVALIDATE_SECONDS = 300;

export type PolyhavenAssetSummary = {
  name?: string;
  type?: number;
  download_count?: number;
  authors?: Record<string, string>;
  categories?: string[];
  tags?: string[];
  max_resolution?: number[];
  thumbnail_url?: string;
};

export type PolyhavenInfoResponse = PolyhavenAssetSummary & {
  whitebalance?: number | null;
  lods?: number[];
};

export type PolyhavenFileLeaf = {
  url?: string;
  size?: number;
  md5?: string;
};

export type PolyhavenFileWithIncludesLeaf = PolyhavenFileLeaf & {
  include?: Record<string, PolyhavenFileLeaf>;
};

export type PolyhavenHdriFilesResponse = {
  tonemapped?: PolyhavenFileLeaf;
  hdri?: Record<string, Record<string, PolyhavenFileLeaf>>;
};

export type PolyhavenTextureFilesResponse = Record<
  string,
  Record<string, Record<string, PolyhavenFileLeaf>> | PolyhavenFileLeaf | undefined
>;

export type PolyhavenModelFilesResponse = {
  blend?: Record<string, Record<string, PolyhavenFileWithIncludesLeaf>>;
  gltf?: Record<string, Record<string, PolyhavenFileWithIncludesLeaf>>;
  fbx?: Record<string, Record<string, PolyhavenFileWithIncludesLeaf>>;
  usd?: Record<string, Record<string, PolyhavenFileWithIncludesLeaf>>;
};

export type PolyhavenListAssetsResponse = Record<string, PolyhavenAssetSummary>;
export type PolyhavenCategoriesResponse = Record<string, number>;

export function normalizeAssetTypeForApi(assetType: ExternalAssetType) {
  if (assetType === "hdri") {
    return "hdris";
  }

  if (assetType === "texture") {
    return "textures";
  }

  return "models";
}

export function buildPolyhavenPageUrl(assetId: string) {
  return `${POLYHAVEN_SITE_BASE_URL}/a/${assetId}`;
}

export function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

export function buildResponseCacheKey(
  scope: string,
  parts: Array<string | number | null | undefined>
) {
  return JSON.stringify([scope, ...parts.map((part) => part ?? "")]);
}

export function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizeAuthors(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.keys(value as Record<string, unknown>).filter((key) => key.trim().length > 0);
}

export function formatAuthorLabel(authors: unknown) {
  const names = normalizeAuthors(authors);
  return names.length > 0 ? names.join(", ") : "Poly Haven";
}

export function formatMaxResolutionLabel(maxResolution: unknown) {
  if (!Array.isArray(maxResolution) || typeof maxResolution[0] !== "number") {
    return "Unknown";
  }

  const width = maxResolution[0];
  if (!Number.isFinite(width) || width <= 0) {
    return "Unknown";
  }

  if (width >= 16384) {
    return "16k";
  }

  if (width >= 8192) {
    return "8k";
  }

  if (width >= 4096) {
    return "4k";
  }

  if (width >= 2048) {
    return "2k";
  }

  return "1k";
}

export function normalizeResolutionRank(value: string) {
  const match = value.trim().toLowerCase().match(/^(\d+)(k)?/);
  if (!match) {
    return 0;
  }

  const numericValue = Number(match[1]);
  return match[2] ? numericValue * 1024 : numericValue;
}

export function compareFileOptions(left: ExternalAssetFileOption, right: ExternalAssetFileOption) {
  const resolutionDelta = normalizeResolutionRank(left.resolution) - normalizeResolutionRank(right.resolution);
  if (resolutionDelta !== 0) {
    return resolutionDelta;
  }

  return left.format.localeCompare(right.format);
}

export function humanizeIdentifier(value: string) {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function fetchPolyhavenJson<T>(path: string) {
  const response = await fetch(`${POLYHAVEN_API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": getPolyhavenRequestIdentity(),
      Referer: POLYHAVEN_SITE_BASE_URL
    },
    next: {
      revalidate: REVALIDATE_SECONDS
    }
  });

  if (!response.ok) {
    throw new Error(`Poly Haven request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function mapAssetSummaryToListItem(
  assetId: string,
  assetType: ExternalAssetType,
  source: PolyhavenAssetSummary
): ExternalAssetListItem {
  return {
    provider: "polyhaven",
    assetId,
    assetType,
    displayName: typeof source.name === "string" && source.name.trim() ? source.name.trim() : assetId,
    thumbnailUrl: typeof source.thumbnail_url === "string" ? source.thumbnail_url : "",
    categories: normalizeStringArray(source.categories),
    tags: normalizeStringArray(source.tags),
    authorLabel: formatAuthorLabel(source.authors),
    licenseLabel: POLYHAVEN_LICENSE_LABEL,
    pageUrl: buildPolyhavenPageUrl(assetId),
    downloadCount: typeof source.download_count === "number" ? source.download_count : 0,
    maxResolutionLabel: formatMaxResolutionLabel(source.max_resolution)
  };
}

export function matchesQuery(item: ExternalAssetListItem, query: string | null | undefined) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystacks = [item.displayName, ...item.tags, ...item.categories, item.authorLabel];
  return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
}
