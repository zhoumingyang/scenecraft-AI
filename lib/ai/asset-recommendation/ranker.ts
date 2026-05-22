import type { ExternalAssetFileOption, ExternalAssetListItem } from "@/lib/externalAssets/types";
import type { AssetSearchCandidate, SelectableFile } from "./types";

const FORMAT_PREFERENCE = ["gltf", "hdr", "exr", "jpg", "jpeg", "png", "fbx"];

export function tokenizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
}

function normalizeResolutionRank(value: string) {
  const match = value.trim().toLowerCase().match(/^(\d+)(k)?/);
  if (!match) return 0;
  const numeric = Number(match[1]);
  return match[2] ? numeric * 1024 : numeric;
}

function scoreTextMatch(item: ExternalAssetListItem, terms: string[]) {
  const name = item.displayName.toLowerCase().replace(/[_-]+/g, " ");
  const categories = item.categories.join(" ").toLowerCase();
  const tags = item.tags.join(" ").toLowerCase();

  return terms.reduce((score, term) => {
    if (name.includes(term)) return score + 8;
    if (tags.includes(term)) return score + 5;
    if (categories.includes(term)) return score + 4;
    return score;
  }, 0);
}

export function scoreExternalAssetCandidate(item: ExternalAssetListItem, query: string, keywords: string[]) {
  const terms = Array.from(new Set([...tokenizeSearchText(query), ...keywords.flatMap(tokenizeSearchText)]));
  const textScore = scoreTextMatch(item, terms);
  const popularityScore = Math.log10(Math.max(1, item.downloadCount)) * 1.5;
  const resolutionScore = normalizeResolutionRank(item.maxResolutionLabel) >= 2048 ? 2 : 0;

  return textScore + popularityScore + resolutionScore;
}

export function mergeAndRankCandidates(
  candidates: AssetSearchCandidate[],
  keywords: string[],
  limit: number
) {
  const winners = new Map<string, AssetSearchCandidate>();

  candidates.forEach((candidate) => {
    const key = `${candidate.item.assetType}:${candidate.item.assetId}`;
    const nextScore =
      candidate.score + scoreExternalAssetCandidate(candidate.item, candidate.query, keywords);
    const current = winners.get(key);

    if (!current || nextScore > current.score) {
      winners.set(key, {
        ...candidate,
        score: nextScore
      });
    }
  });

  return Array.from(winners.values())
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.item.downloadCount - left.item.downloadCount ||
        left.item.displayName.localeCompare(right.item.displayName)
    )
    .slice(0, limit);
}

export function selectPreferredFile<TFile extends SelectableFile>(
  files: TFile[],
  options: {
    targetResolution?: number;
    preferredFormats?: string[];
  } = {}
) {
  const targetResolution = options.targetResolution ?? 2048;
  const preferredFormats = options.preferredFormats ?? FORMAT_PREFERENCE;

  return [...files].sort((left, right) => {
    const leftResolutionDelta = Math.abs(normalizeResolutionRank(left.resolution) - targetResolution);
    const rightResolutionDelta = Math.abs(normalizeResolutionRank(right.resolution) - targetResolution);
    if (leftResolutionDelta !== rightResolutionDelta) {
      return leftResolutionDelta - rightResolutionDelta;
    }

    const leftFormatIndex = preferredFormats.indexOf(left.format.toLowerCase());
    const rightFormatIndex = preferredFormats.indexOf(right.format.toLowerCase());
    const normalizedLeftIndex = leftFormatIndex === -1 ? Number.MAX_SAFE_INTEGER : leftFormatIndex;
    const normalizedRightIndex = rightFormatIndex === -1 ? Number.MAX_SAFE_INTEGER : rightFormatIndex;

    if (normalizedLeftIndex !== normalizedRightIndex) {
      return normalizedLeftIndex - normalizedRightIndex;
    }

    return (left.sizeBytes ?? Number.MAX_SAFE_INTEGER) - (right.sizeBytes ?? Number.MAX_SAFE_INTEGER);
  })[0] ?? null;
}

export function selectTextureMapFile(files: ExternalAssetFileOption[]) {
  return selectPreferredFile(files, {
    targetResolution: 2048,
    preferredFormats: ["jpg", "jpeg", "png"]
  });
}
