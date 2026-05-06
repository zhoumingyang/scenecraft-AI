"use client";

import type {
  ExternalAssetFileOption,
  ExternalHdriAssetDetail,
  ExternalTextureAssetDetail,
  SupportedMaterialTextureField
} from "@/lib/externalAssets/types";

export type ExternalHdriApplyPayload = {
  asset: ExternalHdriAssetDetail;
  file: ExternalAssetFileOption;
};

export type ExternalTextureApplyPayload = {
  asset: ExternalTextureAssetDetail;
  selections: Array<{
    materialField: SupportedMaterialTextureField;
    file: ExternalAssetFileOption;
  }>;
};
