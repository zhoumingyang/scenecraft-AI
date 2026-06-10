"use client";

import type { EditorAppOptions } from "@/render/editor/app";
import { getPolyhavenAssetDetail } from "@/frontend/api/externalAssets";
import {
  getPreferredHdriFormat,
  getPreferredHdriResolution,
  selectHdriFile
} from "@/lib/externalAssets/source";

type ResolveStudioHdriUrl = NonNullable<EditorAppOptions["resolveStudioHdriUrl"]>;

export const resolveStudioHdriUrl: ResolveStudioHdriUrl = async (input) => {
  if (input.url) {
    return {
      url: input.url,
      assetName: input.assetId ?? input.url
    };
  }

  if (input.provider !== "polyhaven" || !input.assetId) {
    return null;
  }

  const detail = await getPolyhavenAssetDetail(input.assetId, "hdri");
  if (detail.assetType !== "hdri" || detail.fileOptions.length === 0) {
    return null;
  }

  const resolution = getPreferredHdriResolution(detail.fileOptions);
  const format = getPreferredHdriFormat(detail.fileOptions, resolution);
  const file = selectHdriFile(detail.fileOptions, resolution, format);

  return file
    ? {
        url: file.url,
        assetName: file.fileName || file.url
      }
    : null;
};
