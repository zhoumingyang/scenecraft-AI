"use client";

import type {
  GetExternalAssetDetailResponse,
  ListExternalAssetCategoriesResponse,
  ListExternalAssetsResponse
} from "@/lib/externalAssets/contracts";
import type { ExternalAssetType } from "@/lib/externalAssets/types";
import { appApiClient } from "./client";

export async function listPolyhavenAssets(input: {
  assetType: ExternalAssetType;
  page?: number;
  pageSize?: number;
  query?: string;
  category?: string;
}) {
  const response = await appApiClient.get<ListExternalAssetsResponse>("/polyhaven/assets", {
    params: {
      type: input.assetType,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 24,
      q: input.query?.trim() || undefined,
      category: input.category?.trim() || undefined
    }
  });

  return response.data;
}

export async function getPolyhavenAssetDetail(assetId: string, assetType: ExternalAssetType) {
  const response = await appApiClient.get<GetExternalAssetDetailResponse>(`/polyhaven/assets/${assetId}`, {
    params: {
      type: assetType
    }
  });

  return response.data.asset;
}

export async function listPolyhavenCategories(assetType: ExternalAssetType) {
  const response = await appApiClient.get<ListExternalAssetCategoriesResponse>(
    `/polyhaven/categories/${assetType}`
  );

  return response.data.categories;
}
