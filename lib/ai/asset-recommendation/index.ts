import type {
  AiExternalAssetRecommendationAsset,
  AiExternalAssetRecommendationBundle,
  AiExternalAssetRecommendationTextureMap,
  RecommendAiExternalAssetsResponse
} from "@/lib/api/contracts/ai";
import { polyhavenProvider } from "@/lib/externalAssets/polyhaven";
import type {
  ExternalAssetDetail,
  ExternalAssetListItem,
  ExternalHdriAssetDetail,
  ExternalModelAssetDetail,
  ExternalTextureAssetDetail,
  SupportedMaterialTextureField
} from "@/lib/externalAssets/types";
import {
  buildAssetRecommendationCacheKey,
  getOrLoadAssetRecommendationCache
} from "./cache";
import { resolveAssetRecommendationIntent } from "./intent";
import { PolyhavenKeywordSearchProvider } from "./polyhavenSearchProvider";
import {
  mergeAndRankCandidates,
  selectPreferredFile,
  selectTextureMapFile,
  tokenizeSearchText
} from "./ranker";
import type {
  AssetRecommendationInput,
  AssetRecommendationIntent,
  AssetSearchCandidate,
  DetailCandidate,
  ExternalAssetRecommendationSearchProvider
} from "./types";
import { toRecommendationFile } from "./types";

const BUNDLE_COUNT = 3;
const CANDIDATE_LIMIT = 12;
const REQUIRED_TEXTURE_FIELDS: SupportedMaterialTextureField[] = [
  "diffuseMap",
  "normalMap",
  "roughnessMap",
  "aoMap"
];

function toRecommendationAsset(item: ExternalAssetListItem): AiExternalAssetRecommendationAsset {
  return {
    provider: item.provider,
    assetId: item.assetId,
    assetType: item.assetType,
    displayName: item.displayName,
    thumbnailUrl: item.thumbnailUrl,
    categories: item.categories,
    tags: item.tags,
    authorLabel: item.authorLabel,
    licenseLabel: item.licenseLabel,
    pageUrl: item.pageUrl,
    downloadCount: item.downloadCount,
    maxResolutionLabel: item.maxResolutionLabel
  };
}

function createStableId(parts: Array<string | number | null | undefined>) {
  return parts.filter((part) => part !== null && part !== undefined && part !== "").join(":");
}

async function getDetailCandidate(candidate: AssetSearchCandidate) {
  const cacheKey = buildAssetRecommendationCacheKey("polyhaven-detail", [
    candidate.item.assetType,
    candidate.item.assetId
  ]);
  const { value } = await getOrLoadAssetRecommendationCache(cacheKey, () =>
    polyhavenProvider.getAssetDetail({
      assetType: candidate.item.assetType,
      assetId: candidate.item.assetId
    })
  );

  return {
    detail: value,
    query: candidate.query,
    score: candidate.score
  } satisfies DetailCandidate;
}

async function searchDetails({
  provider,
  queries,
  assetType,
  keywords
}: {
  provider: ExternalAssetRecommendationSearchProvider;
  queries: string[];
  assetType: "hdri" | "texture" | "model";
  keywords: string[];
}) {
  const candidateResults = await Promise.all(
    queries.map((query) =>
      provider.searchCandidates({
        assetType,
        query,
        limit: CANDIDATE_LIMIT
      })
    )
  );
  const ranked = mergeAndRankCandidates(candidateResults.flat(), keywords, CANDIDATE_LIMIT);
  const details = await Promise.all(ranked.map(getDetailCandidate));

  return details.filter((candidate) => candidate.detail.assetType === assetType);
}

function isUsableHdri(detail: ExternalAssetDetail): detail is ExternalHdriAssetDetail {
  return detail.assetType === "hdri" && detail.fileOptions.length > 0;
}

function isUsableTexture(detail: ExternalAssetDetail): detail is ExternalTextureAssetDetail {
  return detail.assetType === "texture" && detail.textureMaps.length > 0;
}

function isUsableModel(detail: ExternalAssetDetail): detail is ExternalModelAssetDetail {
  return detail.assetType === "model" && detail.modelFiles.length > 0;
}

function selectTextureMaps(detail: ExternalTextureAssetDetail) {
  const maps: AiExternalAssetRecommendationTextureMap[] = [];

  detail.textureMaps.forEach((textureMap) => {
    const file = selectTextureMapFile(textureMap.fileOptions);
    if (!file) return;

    maps.push({
      mapKey: textureMap.mapKey,
      displayName: textureMap.displayName,
      materialField: textureMap.materialField,
      file: toRecommendationFile(file)
    });
  });

  return maps.sort((left, right) => {
    const leftIndex = REQUIRED_TEXTURE_FIELDS.indexOf(left.materialField);
    const rightIndex = REQUIRED_TEXTURE_FIELDS.indexOf(right.materialField);
    const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
    return normalizedLeft - normalizedRight;
  });
}

function formatReason(intent: AssetRecommendationIntent, query: string, assetName: string) {
  const mood = intent.moodKeywords.slice(0, 3).join(", ");
  return mood
    ? `${assetName} matches "${query}" and supports the ${mood} direction.`
    : `${assetName} matches "${query}" for this scene kit.`;
}

function buildBundle({
  index,
  intent,
  hdri,
  groundTexture,
  selectedTexture,
  models,
  selectedTargetId,
  selectedTargetLabel
}: {
  index: number;
  intent: AssetRecommendationIntent;
  hdri: DetailCandidate<ExternalHdriAssetDetail> | null;
  groundTexture: DetailCandidate<ExternalTextureAssetDetail> | null;
  selectedTexture: DetailCandidate<ExternalTextureAssetDetail> | null;
  models: Array<DetailCandidate<ExternalModelAssetDetail>>;
  selectedTargetId: string | null;
  selectedTargetLabel: string;
}) {
  const bundleId = createStableId(["bundle", index, hdri?.detail.assetId, groundTexture?.detail.assetId]);

  return {
    id: bundleId,
    title: index === 0 ? intent.title : `${intent.title} ${index + 1}`,
    description: intent.description,
    reason: intent.lightingHint || "A balanced Poly Haven asset kit for the requested scene direction.",
    hdri: hdri
      ? {
          id: createStableId([bundleId, "hdri", hdri.detail.assetId]),
          asset: {
            ...toRecommendationAsset(hdri.detail),
            assetType: "hdri"
          },
          file: toRecommendationFile(
            selectPreferredFile(hdri.detail.fileOptions, {
              targetResolution: 2048,
              preferredFormats: ["hdr", "exr"]
            }) ?? hdri.detail.fileOptions[0]
          ),
          reason: formatReason(intent, hdri.query, hdri.detail.displayName)
        }
      : null,
    textures: [
      ...(groundTexture
        ? [
            {
              id: createStableId([bundleId, "ground", groundTexture.detail.assetId]),
              asset: {
                ...toRecommendationAsset(groundTexture.detail),
                assetType: "texture" as const
              },
              target: "ground" as const,
              targetId: null,
              targetLabel: "Ground",
              maps: selectTextureMaps(groundTexture.detail),
              reason: formatReason(intent, groundTexture.query, groundTexture.detail.displayName)
            }
          ]
        : []),
      ...(selectedTexture
        ? [
            {
              id: createStableId([bundleId, "selected", selectedTexture.detail.assetId]),
              asset: {
                ...toRecommendationAsset(selectedTexture.detail),
                assetType: "texture" as const
              },
              target: "selectedMesh" as const,
              targetId: selectedTargetId,
              targetLabel: selectedTargetLabel,
              maps: selectTextureMaps(selectedTexture.detail),
              reason: formatReason(intent, selectedTexture.query, selectedTexture.detail.displayName)
            }
          ]
        : [])
    ].filter((texture) => texture.maps.length > 0),
    models: models.slice(0, 3).map((model, modelIndex) => ({
      id: createStableId([bundleId, "model", model.detail.assetId, modelIndex]),
      asset: {
        ...toRecommendationAsset(model.detail),
        assetType: "model" as const
      },
      file: toRecommendationFile(
        selectPreferredFile(model.detail.modelFiles, {
          targetResolution: 1024,
          preferredFormats: ["gltf", "fbx"]
        }) ?? model.detail.modelFiles[0]
      ),
      count: 1,
      placement: modelIndex === 0 ? ("nearSelection" as const) : ("sceneDressing" as const),
      scaleHint: "medium" as const,
      reason: formatReason(intent, model.query, model.detail.displayName)
    })),
    sceneAdjustments: {
      tone: intent.colorTone,
      reason: intent.lightingHint || undefined
    }
  } satisfies AiExternalAssetRecommendationBundle;
}

function buildQueries(intent: AssetRecommendationIntent, fallbackPrompt: string) {
  const fallback = fallbackPrompt.trim();
  return {
    environmentQueries: intent.environmentQueries.length > 0 ? intent.environmentQueries : [fallback],
    groundTextureQueries:
      intent.groundTextureQueries.length > 0 ? intent.groundTextureQueries : [fallback],
    selectedTextureQueries:
      intent.selectedTextureQueries.length > 0 ? intent.selectedTextureQueries : [fallback],
    modelQueries: intent.modelQueries.length > 0 ? intent.modelQueries : [fallback]
  };
}

export async function recommendExternalAssets(
  input: AssetRecommendationInput,
  provider: ExternalAssetRecommendationSearchProvider = new PolyhavenKeywordSearchProvider()
): Promise<RecommendAiExternalAssetsResponse> {
  const cacheKey = buildAssetRecommendationCacheKey("bundle", [
    input.prompt,
    input.scope,
    input.selectedTarget?.kind,
    input.selectedTarget?.id,
    input.selectedTarget?.label
  ]);

  const { value, cacheHit } = await getOrLoadAssetRecommendationCache(cacheKey, async () => {
    const { intent, traceId } = await resolveAssetRecommendationIntent(input);
    const queries = buildQueries(intent, input.prompt);
    const keywords = [
      ...intent.moodKeywords,
      ...tokenizeSearchText(input.prompt),
      input.selectedTarget?.label ?? ""
    ].filter(Boolean);

    const [hdriDetails, groundTextureDetails, selectedTextureDetails, modelDetails] =
      await Promise.all([
        input.scope === "materials" || input.scope === "models" || input.scope === "selection"
          ? Promise.resolve([])
          : searchDetails({
              provider,
              queries: queries.environmentQueries,
              assetType: "hdri",
              keywords
            }),
        input.scope === "environment" || input.scope === "models"
          ? Promise.resolve([])
          : searchDetails({
              provider,
              queries: queries.groundTextureQueries,
              assetType: "texture",
              keywords
            }),
        input.scope === "environment" || input.scope === "models"
          ? Promise.resolve([])
          : searchDetails({
              provider,
              queries: queries.selectedTextureQueries,
              assetType: "texture",
              keywords
            }),
        input.scope === "environment" || input.scope === "materials" || input.scope === "selection"
          ? Promise.resolve([])
          : searchDetails({
              provider,
              queries: queries.modelQueries,
              assetType: "model",
              keywords
            })
      ]);

    const usableHdris = hdriDetails.filter(
      (candidate): candidate is DetailCandidate<ExternalHdriAssetDetail> =>
        isUsableHdri(candidate.detail)
    );
    const usableGroundTextures = groundTextureDetails.filter(
      (candidate): candidate is DetailCandidate<ExternalTextureAssetDetail> =>
        isUsableTexture(candidate.detail)
    );
    const usableSelectedTextures = selectedTextureDetails.filter(
      (candidate): candidate is DetailCandidate<ExternalTextureAssetDetail> =>
        isUsableTexture(candidate.detail)
    );
    const usableModels = modelDetails.filter(
      (candidate): candidate is DetailCandidate<ExternalModelAssetDetail> =>
        isUsableModel(candidate.detail)
    );
    const selectedTargetLabel = input.selectedTarget?.label ?? "Selected mesh";

    const bundles = Array.from({ length: BUNDLE_COUNT })
      .map((_, index) =>
        buildBundle({
          index,
          intent,
          hdri: usableHdris[index] ?? null,
          groundTexture: usableGroundTextures[index] ?? null,
          selectedTexture:
            input.selectedTarget?.kind === "mesh" ? usableSelectedTextures[index] ?? null : null,
          models: usableModels.slice(index * 3, index * 3 + 3),
          selectedTargetId: input.selectedTarget?.kind === "mesh" ? input.selectedTarget.id ?? null : null,
          selectedTargetLabel
        })
      )
      .filter(
        (bundle) => bundle.hdri || bundle.textures.length > 0 || bundle.models.length > 0
      );

    return {
      bundles,
      traceId
    };
  });

  return {
    bundles: value.bundles,
    traceId: value.traceId,
    cacheHit
  };
}
