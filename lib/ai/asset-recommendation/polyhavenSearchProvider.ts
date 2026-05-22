import { polyhavenProvider } from "@/lib/externalAssets/polyhaven";
import type { ExternalAssetType } from "@/lib/externalAssets/types";
import {
  buildAssetRecommendationCacheKey,
  getOrLoadAssetRecommendationCache
} from "./cache";
import { scoreExternalAssetCandidate, tokenizeSearchText } from "./ranker";
import type {
  AssetSearchCandidate,
  AssetSearchInput,
  ExternalAssetRecommendationSearchProvider
} from "./types";

const MAX_QUERY_TERMS = 5;

function buildSearchQueries(query: string) {
  const trimmed = query.trim();
  const terms = tokenizeSearchText(trimmed).slice(0, MAX_QUERY_TERMS);
  return Array.from(new Set([trimmed, ...terms].filter((value) => value.length > 0)));
}

async function searchPolyhavenAssets(assetType: ExternalAssetType, query: string, limit: number) {
  const cacheKey = buildAssetRecommendationCacheKey("polyhaven-search", [assetType, query, limit]);

  const { value } = await getOrLoadAssetRecommendationCache(cacheKey, async () => {
    const response = await polyhavenProvider.listAssets({
      assetType,
      query,
      page: 1,
      pageSize: Math.min(60, Math.max(12, limit * 3))
    });

    return response.items.map<AssetSearchCandidate>((item) => ({
      item,
      query,
      score: scoreExternalAssetCandidate(item, query, [])
    }));
  });

  return value;
}

export class PolyhavenKeywordSearchProvider implements ExternalAssetRecommendationSearchProvider {
  async searchCandidates(input: AssetSearchInput) {
    const queries = buildSearchQueries(input.query);
    const results = await Promise.all(
      queries.map((query) => searchPolyhavenAssets(input.assetType, query, input.limit))
    );

    return results.flat();
  }
}
