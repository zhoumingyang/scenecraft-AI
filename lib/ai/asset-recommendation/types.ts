import type {
  AiExternalAssetRecommendationBundle,
  AiExternalAssetRecommendationFile,
  AiExternalAssetRecommendationSceneContext,
  AiExternalAssetRecommendationScope,
  AiExternalAssetRecommendationSelectedTarget
} from "@/lib/api/contracts/ai";
import type {
  ExternalAssetDetail,
  ExternalAssetFileOption,
  ExternalAssetListItem,
  ExternalAssetType,
  ExternalModelFileOption
} from "@/lib/externalAssets/types";

export type AssetRecommendationInput = {
  apiKey: string;
  prompt: string;
  scope: AiExternalAssetRecommendationScope;
  selectedTarget?: AiExternalAssetRecommendationSelectedTarget | null;
  sceneContext?: AiExternalAssetRecommendationSceneContext;
};

export type AssetRecommendationIntent = {
  title: string;
  description: string;
  environmentQueries: string[];
  groundTextureQueries: string[];
  selectedTextureQueries: string[];
  modelQueries: string[];
  moodKeywords: string[];
  colorTone: "cold" | "warm" | "neutral";
  lightingHint: string;
};

export type AssetSearchInput = {
  assetType: ExternalAssetType;
  query: string;
  limit: number;
};

export type AssetSearchCandidate = {
  item: ExternalAssetListItem;
  query: string;
  score: number;
};

export type ExternalAssetRecommendationSearchProvider = {
  searchCandidates(input: AssetSearchInput): Promise<AssetSearchCandidate[]>;
};

export type DetailCandidate<TDetail extends ExternalAssetDetail = ExternalAssetDetail> = {
  detail: TDetail;
  query: string;
  score: number;
};

export type SelectableFile = ExternalAssetFileOption | ExternalModelFileOption;

export type BundleAssemblyResult = {
  bundles: AiExternalAssetRecommendationBundle[];
  cacheHit: boolean;
  traceId: string | null;
};

export function toRecommendationFile(file: SelectableFile): AiExternalAssetRecommendationFile {
  return {
    url: file.url,
    fileName: file.fileName,
    resolution: file.resolution,
    format: file.format,
    sizeBytes: file.sizeBytes,
    md5: file.md5,
    ...("includes" in file
      ? {
          includes: file.includes
        }
      : {})
  };
}
