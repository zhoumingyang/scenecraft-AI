import {
  selectHdriFile,
  selectModelFile,
  selectTextureImportFiles
} from "@/lib/externalAssets/source";
import type { ExternalAssetDetail } from "@/lib/externalAssets/types";
import type {
  ExternalHdriApplyPayload,
  ExternalModelApplyPayload,
  ExternalTextureApplyPayload
} from "./types";

type ExternalAssetApplySelection =
  | {
      type: "hdri";
      payload: ExternalHdriApplyPayload;
    }
  | {
      type: "model";
      payload: ExternalModelApplyPayload;
    }
  | {
      type: "texture";
      payload: ExternalTextureApplyPayload;
    }
  | {
      errorMessage: string;
    };

export function getExternalAssetApplySelection({
  asset,
  format,
  resolution,
  t
}: {
  asset: ExternalAssetDetail;
  format: string;
  resolution: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}): ExternalAssetApplySelection {
  if (asset.assetType === "hdri") {
    const file = selectHdriFile(asset.fileOptions, resolution, format);
    if (!file) {
      return { errorMessage: t("editor.assets.noCompatibleFile") };
    }

    return {
      type: "hdri",
      payload: {
        asset,
        file
      }
    };
  }

  if (asset.assetType === "model") {
    const file = selectModelFile(asset.modelFiles, resolution, format);
    if (!file) {
      return { errorMessage: t("editor.assets.noCompatibleFile") };
    }

    return {
      type: "model",
      payload: {
        asset,
        file
      }
    };
  }

  const selections = selectTextureImportFiles(asset, resolution, format);
  if (selections.length === 0) {
    return { errorMessage: t("editor.assets.noCompatibleMaps") };
  }

  return {
    type: "texture",
    payload: {
      asset,
      selections
    }
  };
}
