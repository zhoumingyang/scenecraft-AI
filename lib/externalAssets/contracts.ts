import type {
  ExternalAssetCategoryOption,
  ExternalAssetDetail,
  ExternalAssetListResult,
  ExternalAssetType
} from "./types";

export type ListExternalAssetsResponse = ExternalAssetListResult;

export type GetExternalAssetDetailResponse = {
  asset: ExternalAssetDetail;
};

export type ListExternalAssetCategoriesResponse = {
  assetType: ExternalAssetType;
  categories: ExternalAssetCategoryOption[];
};
