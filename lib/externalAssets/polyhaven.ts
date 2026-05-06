import type {
  ExternalAssetDetail,
  ExternalAssetFileOption,
  ExternalAssetListItem,
  ExternalAssetListResult,
  ExternalAssetProvider,
  ExternalAssetTextureMap,
  ExternalAssetType,
  SupportedMaterialTextureField
} from "./types";
import { getPolyhavenRequestIdentity } from "./config";

const POLYHAVEN_API_BASE_URL = "https://api.polyhaven.com";
const POLYHAVEN_SITE_BASE_URL = "https://polyhaven.com";
const POLYHAVEN_LICENSE_LABEL = "CC0";
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;
const REVALIDATE_SECONDS = 300;

type PolyhavenAssetSummary = {
  name?: string;
  type?: number;
  download_count?: number;
  authors?: Record<string, string>;
  categories?: string[];
  tags?: string[];
  max_resolution?: number[];
  thumbnail_url?: string;
};

type PolyhavenInfoResponse = PolyhavenAssetSummary & {
  whitebalance?: number | null;
};

type PolyhavenFileLeaf = {
  url?: string;
  size?: number;
  md5?: string;
};

type PolyhavenHdriFilesResponse = {
  tonemapped?: PolyhavenFileLeaf;
  hdri?: Record<string, Record<string, PolyhavenFileLeaf>>;
};

type PolyhavenTextureFilesResponse = Record<
  string,
  Record<string, Record<string, PolyhavenFileLeaf>> | PolyhavenFileLeaf | undefined
>;

type PolyhavenListAssetsResponse = Record<string, PolyhavenAssetSummary>;
type PolyhavenCategoriesResponse = Record<string, number>;

const TEXTURE_MAP_PRIORITY: Array<{
  materialField: SupportedMaterialTextureField;
  candidates: string[];
}> = [
  {
    materialField: "diffuseMap",
    candidates: ["basecolor", "albedo", "diffuse", "color", "col"]
  },
  {
    materialField: "roughnessMap",
    candidates: ["roughness", "rough"]
  },
  {
    materialField: "metalnessMap",
    candidates: ["metalness", "metallic", "metal"]
  },
  {
    materialField: "normalMap",
    candidates: ["nor_gl", "normal_gl", "normalgl", "normal", "nor_dx", "normal_dx"]
  },
  {
    materialField: "aoMap",
    candidates: ["ao", "ambientocclusion", "ambient_occlusion"]
  },
  {
    materialField: "emissiveMap",
    candidates: ["emissive", "emission", "emit"]
  }
];

function normalizeAssetTypeForApi(assetType: ExternalAssetType) {
  return assetType === "hdri" ? "hdris" : "textures";
}

function buildPolyhavenPageUrl(assetId: string) {
  return `${POLYHAVEN_SITE_BASE_URL}/a/${assetId}`;
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

function normalizeStringArray(value: unknown) {
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

function formatAuthorLabel(authors: unknown) {
  const names = normalizeAuthors(authors);
  return names.length > 0 ? names.join(", ") : "Poly Haven";
}

function formatMaxResolutionLabel(maxResolution: unknown) {
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

function normalizeResolutionRank(value: string) {
  const match = value.trim().toLowerCase().match(/^(\d+)(k)?/);
  if (!match) {
    return 0;
  }

  const numericValue = Number(match[1]);
  return match[2] ? numericValue * 1024 : numericValue;
}

function compareFileOptions(left: ExternalAssetFileOption, right: ExternalAssetFileOption) {
  const resolutionDelta = normalizeResolutionRank(left.resolution) - normalizeResolutionRank(right.resolution);
  if (resolutionDelta !== 0) {
    return resolutionDelta;
  }

  return left.format.localeCompare(right.format);
}

function humanizeIdentifier(value: string) {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function fetchPolyhavenJson<T>(path: string) {
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

function mapAssetSummaryToListItem(
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

function matchesQuery(item: ExternalAssetListItem, query: string | null | undefined) {
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

function toFileOption(url: string, resolution: string, format: string, value: PolyhavenFileLeaf): ExternalAssetFileOption {
  const fileName = decodeURIComponent(url.split("/").pop() ?? url);
  return {
    url,
    fileName,
    resolution,
    format,
    sizeBytes: typeof value.size === "number" ? value.size : null,
    md5: typeof value.md5 === "string" ? value.md5 : null,
    label: `${resolution.toUpperCase()} ${format.toUpperCase()}`
  };
}

function extractFileOptions(tree: Record<string, Record<string, PolyhavenFileLeaf>> | undefined) {
  const options: ExternalAssetFileOption[] = [];

  if (!tree || typeof tree !== "object") {
    return options;
  }

  Object.entries(tree).forEach(([resolution, formats]) => {
    if (!formats || typeof formats !== "object") {
      return;
    }

    Object.entries(formats).forEach(([format, file]) => {
      if (!file || typeof file.url !== "string" || !file.url.trim()) {
        return;
      }

      options.push(toFileOption(file.url, resolution, format, file));
    });
  });

  return options.sort(compareFileOptions);
}

function normalizeTextureMapKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function resolveTextureMaterialField(mapKey: string) {
  const normalizedMapKey = normalizeTextureMapKey(mapKey);

  for (const entry of TEXTURE_MAP_PRIORITY) {
    if (entry.candidates.includes(normalizedMapKey)) {
      return entry.materialField;
    }
  }

  return null;
}

function buildTextureMaps(files: PolyhavenTextureFilesResponse): ExternalAssetTextureMap[] {
  const winners = new Map<SupportedMaterialTextureField, ExternalAssetTextureMap>();

  Object.entries(files).forEach(([rawMapKey, value]) => {
    if (!value || typeof value !== "object") {
      return;
    }

    const materialField = resolveTextureMaterialField(rawMapKey);
    if (!materialField) {
      return;
    }

    const fileOptions = extractFileOptions(
      value as Record<string, Record<string, PolyhavenFileLeaf>>
    );

    if (fileOptions.length === 0) {
      return;
    }

    const nextMap: ExternalAssetTextureMap = {
      mapKey: normalizeTextureMapKey(rawMapKey),
      displayName: humanizeIdentifier(rawMapKey),
      materialField,
      fileOptions
    };

    const current = winners.get(materialField);
    if (!current) {
      winners.set(materialField, nextMap);
      return;
    }

    const currentPriority = TEXTURE_MAP_PRIORITY.find((entry) => entry.materialField === materialField);
    const currentIndex = currentPriority?.candidates.indexOf(current.mapKey) ?? Number.MAX_SAFE_INTEGER;
    const nextIndex = currentPriority?.candidates.indexOf(nextMap.mapKey) ?? Number.MAX_SAFE_INTEGER;

    if (nextIndex < currentIndex) {
      winners.set(materialField, nextMap);
    }
  });

  return Array.from(winners.values()).sort((left, right) => left.displayName.localeCompare(right.displayName));
}

function listTextureResolutions(textureMaps: ExternalAssetTextureMap[]) {
  const resolutions = new Set<string>();
  textureMaps.forEach((textureMap) => {
    textureMap.fileOptions.forEach((file) => {
      resolutions.add(file.resolution);
    });
  });

  return Array.from(resolutions).sort((left, right) => normalizeResolutionRank(left) - normalizeResolutionRank(right));
}

export const polyhavenProvider: ExternalAssetProvider = {
  async listAssets(input) {
    const assetType = input.assetType;
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const upstreamType = normalizeAssetTypeForApi(assetType);
    const categoryQuery = input.category?.trim();
    const path = categoryQuery
      ? `/assets?type=${encodePathSegment(upstreamType)}&categories=${encodePathSegment(categoryQuery)}`
      : `/assets?type=${encodePathSegment(upstreamType)}`;
    const response = await fetchPolyhavenJson<PolyhavenListAssetsResponse>(path);

    const items = Object.entries(response)
      .map(([assetId, asset]) => mapAssetSummaryToListItem(assetId, assetType, asset))
      .filter((item) => matchesQuery(item, input.query))
      .sort((left, right) => right.downloadCount - left.downloadCount || left.displayName.localeCompare(right.displayName));

    const startIndex = (page - 1) * pageSize;

    const result: ExternalAssetListResult = {
      provider: "polyhaven",
      assetType,
      page,
      pageSize,
      total: items.length,
      items: items.slice(startIndex, startIndex + pageSize)
    };

    return result;
  },

  async listCategories(assetType) {
    const response = await fetchPolyhavenJson<PolyhavenCategoriesResponse>(
      `/categories/${encodePathSegment(normalizeAssetTypeForApi(assetType))}`
    );

    return Object.entries(response)
      .filter(([value]) => value !== "all")
      .map(([value, assetCount]) => ({
        value,
        label: humanizeIdentifier(value),
        assetCount
      }))
      .sort((left, right) => right.assetCount - left.assetCount || left.label.localeCompare(right.label));
  },

  async getAssetDetail(input) {
    const [info, files] = await Promise.all([
      fetchPolyhavenJson<PolyhavenInfoResponse>(`/info/${encodePathSegment(input.assetId)}`),
      fetchPolyhavenJson<PolyhavenHdriFilesResponse | PolyhavenTextureFilesResponse>(
        `/files/${encodePathSegment(input.assetId)}`
      )
    ]);

    const baseItem = mapAssetSummaryToListItem(input.assetId, input.assetType, info);

    if (input.assetType === "hdri") {
      const hdriFiles = files as PolyhavenHdriFilesResponse;
      const fileOptions = extractFileOptions(hdriFiles.hdri);

      return {
        ...baseItem,
        assetType: "hdri",
        tonemappedUrl:
          hdriFiles.tonemapped && typeof hdriFiles.tonemapped.url === "string"
            ? hdriFiles.tonemapped.url
            : null,
        fileOptions
      } satisfies ExternalAssetDetail;
    }

    const textureFiles = files as PolyhavenTextureFilesResponse;
    const textureMaps = buildTextureMaps(textureFiles);

    return {
      ...baseItem,
      assetType: "texture",
      textureMaps,
      availableResolutions: listTextureResolutions(textureMaps)
    } satisfies ExternalAssetDetail;
  }
};
