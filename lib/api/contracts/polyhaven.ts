import { z } from "zod";
import {
  EXTERNAL_ASSET_TYPES,
  type ExternalAssetType
} from "@/lib/externalAssets/types";

const externalAssetTypeSchema = z.preprocess(
  (value) => (typeof value === "string" ? value : ""),
  z.string().refine(
    (value): value is ExternalAssetType =>
      EXTERNAL_ASSET_TYPES.includes(value as ExternalAssetType),
    { message: "Unsupported asset type." }
  )
);

function positiveIntegerWithFallback(fallback: number) {
  return z.preprocess((value) => {
    const parsed =
      typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : typeof value === "number"
          ? value
          : Number.NaN;

    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }, z.number().int().positive());
}

const optionalSearchParamSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    return value.trim() || undefined;
  },
  z.string().optional()
);

export const listPolyhavenAssetsQuerySchema = z
  .object({
    type: externalAssetTypeSchema.transform((assetType) => assetType),
    page: positiveIntegerWithFallback(1).default(1),
    pageSize: positiveIntegerWithFallback(24).default(24),
    q: optionalSearchParamSchema,
    category: optionalSearchParamSchema
  })
  .strict()
  .transform(({ type, q, ...payload }) => ({
    ...payload,
    assetType: type,
    query: q
  }));

export type ListPolyhavenAssetsQuery = z.infer<typeof listPolyhavenAssetsQuerySchema>;

export const getPolyhavenAssetDetailQuerySchema = z
  .object({
    type: externalAssetTypeSchema.transform((assetType) => assetType)
  })
  .strict()
  .transform(({ type }) => ({
    assetType: type
  }));

export type GetPolyhavenAssetDetailQuery = z.infer<
  typeof getPolyhavenAssetDetailQuerySchema
>;

export const listPolyhavenCategoriesParamsSchema = z
  .object({
    type: externalAssetTypeSchema.transform((assetType) => assetType)
  })
  .strict()
  .transform(({ type }) => ({
    assetType: type
  }));

export type ListPolyhavenCategoriesParams = z.infer<
  typeof listPolyhavenCategoriesParamsSchema
>;
