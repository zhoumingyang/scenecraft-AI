import type {
  ExternalAssetDetail,
  ExternalAssetListItem,
  ExternalAssetProvider
} from "./types";
import {
  getCachedResponse,
  getOrLoadCachedResponse,
  setCachedResponse
} from "./polyhavenCache";
import {
  buildTextureMaps,
  extractFileOptions,
  extractModelFileOptions,
  listModelFormats,
  listModelResolutions,
  listTextureFormats,
  listTextureResolutions
} from "./polyhavenFiles";
import {
  buildResponseCacheKey,
  encodePathSegment,
  fetchPolyhavenJson,
  humanizeIdentifier,
  mapAssetSummaryToListItem,
  matchesQuery,
  normalizeAssetTypeForApi,
  type PolyhavenCategoriesResponse,
  type PolyhavenHdriFilesResponse,
  type PolyhavenInfoResponse,
  type PolyhavenListAssetsResponse,
  type PolyhavenModelFilesResponse,
  type PolyhavenTextureFilesResponse
} from "./polyhavenShared";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;

export const polyhavenProvider: ExternalAssetProvider = {
  async listAssets(input) {
    const assetType = input.assetType;
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const upstreamType = normalizeAssetTypeForApi(assetType);
    const categoryQuery = input.category?.trim() ?? "";
    const normalizedQuery = input.query?.trim() ?? "";
    const listCacheKey = buildResponseCacheKey("asset-list", [assetType, categoryQuery]);
    const items = await getOrLoadCachedResponse<ExternalAssetListItem[]>(listCacheKey, async () => {
      const path = categoryQuery
        ? `/assets?type=${encodePathSegment(upstreamType)}&categories=${encodePathSegment(categoryQuery)}`
        : `/assets?type=${encodePathSegment(upstreamType)}`;
      const response = await fetchPolyhavenJson<PolyhavenListAssetsResponse>(path);

      return Object.entries(response)
        .map(([assetId, asset]) => mapAssetSummaryToListItem(assetId, assetType, asset))
        .sort((left, right) => right.downloadCount - left.downloadCount || left.displayName.localeCompare(right.displayName));
    });

    const filteredItems = items.filter((item) => matchesQuery(item, normalizedQuery));

    const startIndex = (page - 1) * pageSize;

    return {
      provider: "polyhaven",
      assetType,
      page,
      pageSize,
      total: filteredItems.length,
      items: filteredItems.slice(startIndex, startIndex + pageSize)
    };
  },

  async listCategories(assetType) {
    const cacheKey = buildResponseCacheKey("categories", [assetType]);
    const cached = getCachedResponse<Awaited<ReturnType<ExternalAssetProvider["listCategories"]>>>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await fetchPolyhavenJson<PolyhavenCategoriesResponse>(
      `/categories/${encodePathSegment(normalizeAssetTypeForApi(assetType))}`
    );

    const categories = Object.entries(response)
      .filter(([value]) => value !== "all")
      .map(([value, assetCount]) => ({
        value,
        label: humanizeIdentifier(value),
        assetCount
      }))
      .sort((left, right) => right.assetCount - left.assetCount || left.label.localeCompare(right.label));

    setCachedResponse(cacheKey, categories);
    return categories;
  },

  async getAssetDetail(input) {
    const cacheKey = buildResponseCacheKey("detail", [input.assetType, input.assetId]);
    const cached = getCachedResponse<ExternalAssetDetail>(cacheKey);
    if (cached) {
      return cached;
    }

    const [info, files] = await Promise.all([
      fetchPolyhavenJson<PolyhavenInfoResponse>(`/info/${encodePathSegment(input.assetId)}`),
      fetchPolyhavenJson<PolyhavenHdriFilesResponse | PolyhavenTextureFilesResponse | PolyhavenModelFilesResponse>(
        `/files/${encodePathSegment(input.assetId)}`
      )
    ]);

    const baseItem = mapAssetSummaryToListItem(input.assetId, input.assetType, info);

    if (input.assetType === "hdri") {
      const hdriFiles = files as PolyhavenHdriFilesResponse;
      const fileOptions = extractFileOptions(hdriFiles.hdri);

      const detail = {
        ...baseItem,
        assetType: "hdri",
        tonemappedUrl:
          hdriFiles.tonemapped && typeof hdriFiles.tonemapped.url === "string"
            ? hdriFiles.tonemapped.url
            : null,
        fileOptions
      } satisfies ExternalAssetDetail;

      setCachedResponse(cacheKey, detail);
      return detail;
    }

    if (input.assetType === "model") {
      const modelFiles = extractModelFileOptions(files as PolyhavenModelFilesResponse);

      const detail = {
        ...baseItem,
        assetType: "model",
        lods: Array.isArray(info.lods)
          ? info.lods.filter((lod): lod is number => typeof lod === "number" && Number.isFinite(lod))
          : undefined,
        modelFiles,
        availableResolutions: listModelResolutions(modelFiles),
        availableFormats: listModelFormats(modelFiles)
      } satisfies ExternalAssetDetail;

      setCachedResponse(cacheKey, detail);
      return detail;
    }

    const textureFiles = files as PolyhavenTextureFilesResponse;
    const textureMaps = buildTextureMaps(textureFiles);

    const detail = {
      ...baseItem,
      assetType: "texture",
      textureMaps,
      availableResolutions: listTextureResolutions(textureMaps),
      availableFormats: listTextureFormats(textureMaps)
    } satisfies ExternalAssetDetail;

    setCachedResponse(cacheKey, detail);
    return detail;
  }
};
