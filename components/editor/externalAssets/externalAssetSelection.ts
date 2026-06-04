import {
  getPreferredHdriFormat,
  getPreferredHdriResolution,
  getPreferredModelFormat,
  getPreferredModelResolution,
  getPreferredTextureFormat,
  getPreferredTextureResolution
} from "@/lib/externalAssets/source";
import type {
  ExternalAssetDetail,
  ExternalAssetType,
  ExternalTextureAssetDetail
} from "@/lib/externalAssets/types";
import type { ExternalTextureApplyPayload } from "./types";

export const DETAIL_CACHE_LIMIT = 48;

export function getDetailCacheKey(assetType: ExternalAssetType, assetId: string) {
  return `${assetType}:${assetId}`;
}

function getTextureFormats(asset: ExternalTextureAssetDetail, resolution: string) {
  const formats = new Set<string>();
  asset.textureMaps.forEach((textureMap) => {
    textureMap.fileOptions.forEach((file) => {
      if (file.resolution === resolution) {
        formats.add(file.format);
      }
    });
  });

  return Array.from(formats).sort((left, right) => left.localeCompare(right));
}

export function getAvailableResolutions(asset: ExternalAssetDetail | null) {
  if (!asset) {
    return [];
  }

  if (asset.assetType === "hdri") {
    return Array.from(new Set(asset.fileOptions.map((file) => file.resolution)));
  }

  return asset.availableResolutions;
}

export function getAvailableFormats(asset: ExternalAssetDetail | null, resolution: string) {
  if (!asset || !resolution) {
    return [];
  }

  if (asset.assetType === "hdri") {
    return Array.from(
      new Set(
        asset.fileOptions
          .filter((file) => file.resolution === resolution)
          .map((file) => file.format)
      )
    );
  }

  if (asset.assetType === "model") {
    return Array.from(
      new Set(
        asset.modelFiles
          .filter((file) => file.resolution === resolution)
          .map((file) => file.format)
      )
    );
  }

  return getTextureFormats(asset, resolution);
}

export function getPreferredSelection(asset: ExternalAssetDetail) {
  if (asset.assetType === "hdri") {
    const resolution = getPreferredHdriResolution(asset.fileOptions);
    return {
      resolution,
      format: getPreferredHdriFormat(asset.fileOptions, resolution)
    };
  }

  if (asset.assetType === "model") {
    const resolution = getPreferredModelResolution(asset);
    return {
      resolution,
      format: getPreferredModelFormat(asset.modelFiles, resolution)
    };
  }

  return {
    resolution: getPreferredTextureResolution(asset),
    format: getPreferredTextureFormat(asset)
  };
}

export function getPreferredFormatForResolution(
  asset: ExternalAssetDetail,
  resolution: string,
  availableFormats: string[]
) {
  if (asset.assetType === "hdri") {
    return getPreferredHdriFormat(asset.fileOptions, resolution);
  }

  if (asset.assetType === "model") {
    return getPreferredModelFormat(asset.modelFiles, resolution);
  }

  return availableFormats[0] ?? "";
}

function preloadImageUrl(url: string, errorMessage: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(errorMessage));
    image.src = url;
  });
}

export async function preloadTextureSelections(
  selections: ExternalTextureApplyPayload["selections"],
  errorMessage: string
) {
  await Promise.all(
    Array.from(new Set(selections.map((selection) => selection.file.url))).map((url) =>
      preloadImageUrl(url, errorMessage)
    )
  );
}
