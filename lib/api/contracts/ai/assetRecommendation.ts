import { z } from "zod";
import type {
  ExternalAssetProviderId,
  ExternalAssetType,
  SupportedMaterialTextureField
} from "@/lib/externalAssets/types";
import { promptSchema } from "./shared";

const aiAssetRecommendationScopeSchema = z.enum([
  "scene",
  "selection",
  "environment",
  "materials",
  "models"
]);

const aiAssetRecommendationSelectedTargetSchema = z
  .object({
    kind: z.enum(["scene", "ground", "mesh", "model", "group"]),
    id: z.string().trim().max(160).optional(),
    label: z.string().trim().max(160).optional(),
    materialSummary: z.string().trim().max(500).optional()
  })
  .strict();

const aiAssetRecommendationSceneContextSchema = z
  .object({
    entityLabels: z.array(z.string().trim().max(160)).max(80).optional(),
    selectedEntityId: z.string().trim().max(160).nullable().optional(),
    environmentLabel: z.string().trim().max(160).optional(),
    groundMaterialLabel: z.string().trim().max(160).optional()
  })
  .strict();

export const recommendAiExternalAssetsRequestSchema = z
  .object({
    prompt: promptSchema,
    scope: aiAssetRecommendationScopeSchema.optional().default("scene"),
    selectedTarget: aiAssetRecommendationSelectedTargetSchema.nullable().optional(),
    sceneContext: aiAssetRecommendationSceneContextSchema.optional()
  })
  .strict();

export type RecommendAiExternalAssetsRequest = z.input<
  typeof recommendAiExternalAssetsRequestSchema
>;

export type AiExternalAssetRecommendationScope = z.infer<
  typeof aiAssetRecommendationScopeSchema
>;

export type AiExternalAssetRecommendationSelectedTarget = z.infer<
  typeof aiAssetRecommendationSelectedTargetSchema
>;

export type AiExternalAssetRecommendationSceneContext = z.infer<
  typeof aiAssetRecommendationSceneContextSchema
>;

export type AiExternalAssetRecommendationFile = {
  url: string;
  fileName: string;
  resolution: string;
  format: string;
  sizeBytes: number | null;
  md5: string | null;
  includes?: Array<{
    path: string;
    url: string;
    sizeBytes?: number | null;
    md5?: string | null;
  }>;
};

export type AiExternalAssetRecommendationAsset = {
  provider: ExternalAssetProviderId;
  assetId: string;
  assetType: ExternalAssetType;
  displayName: string;
  thumbnailUrl: string;
  categories: string[];
  tags: string[];
  authorLabel: string;
  licenseLabel: string;
  pageUrl: string;
  downloadCount: number;
  maxResolutionLabel: string;
};

export type AiExternalAssetRecommendationTextureMap = {
  mapKey: string;
  displayName: string;
  materialField: SupportedMaterialTextureField;
  file: AiExternalAssetRecommendationFile;
};

export type AiExternalAssetRecommendationHdri = {
  id: string;
  asset: AiExternalAssetRecommendationAsset & { assetType: "hdri" };
  file: AiExternalAssetRecommendationFile;
  reason: string;
};

export type AiExternalAssetRecommendationTexture = {
  id: string;
  asset: AiExternalAssetRecommendationAsset & { assetType: "texture" };
  target: "ground" | "selectedMesh";
  targetId: string | null;
  targetLabel: string;
  maps: AiExternalAssetRecommendationTextureMap[];
  reason: string;
};

export type AiExternalAssetRecommendationModel = {
  id: string;
  asset: AiExternalAssetRecommendationAsset & { assetType: "model" };
  file: AiExternalAssetRecommendationFile;
  count: number;
  placement: "center" | "nearSelection" | "sceneDressing";
  scaleHint: "small" | "medium" | "large";
  reason: string;
};

export type AiExternalAssetRecommendationSceneAdjustments = {
  environmentIntensity?: number;
  exposure?: number;
  tone?: "cold" | "warm" | "neutral";
  reason?: string;
};

export type AiExternalAssetRecommendationBundle = {
  id: string;
  title: string;
  description: string;
  reason: string;
  hdri: AiExternalAssetRecommendationHdri | null;
  textures: AiExternalAssetRecommendationTexture[];
  models: AiExternalAssetRecommendationModel[];
  sceneAdjustments: AiExternalAssetRecommendationSceneAdjustments | null;
};

export type RecommendAiExternalAssetsResponse = {
  bundles: AiExternalAssetRecommendationBundle[];
  traceId: string | null;
  cacheHit: boolean;
};
