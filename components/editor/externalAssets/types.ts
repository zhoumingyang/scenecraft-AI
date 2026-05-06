"use client";

import type {
  ExternalAssetFileOption,
  ExternalHdriAssetDetail,
  ExternalModelAssetDetail,
  ExternalModelFileOption,
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

export type ExternalModelApplyPayload = {
  asset: ExternalModelAssetDetail;
  file: ExternalModelFileOption;
};
