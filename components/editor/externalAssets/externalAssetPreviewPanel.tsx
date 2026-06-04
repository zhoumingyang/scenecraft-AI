"use client";

import type { EditorThemeTokens } from "@/components/editor/theme";
import type { ExternalAssetDetail } from "@/lib/externalAssets/types";
import { ExternalAssetDetailDialog } from "./externalAssetDetailDialog";

type ExternalAssetPreviewPanelProps = {
  open: boolean;
  asset: ExternalAssetDetail | null;
  theme: EditorThemeTokens;
  selectedResolution: string;
  selectedFormat: string;
  onResolutionChange: (value: string) => void;
  onFormatChange: (value: string) => void;
  onClose: () => void;
};

export function ExternalAssetPreviewPanel({
  open,
  asset,
  theme,
  selectedResolution,
  selectedFormat,
  onResolutionChange,
  onFormatChange,
  onClose
}: ExternalAssetPreviewPanelProps) {
  return (
    <ExternalAssetDetailDialog
      open={open}
      asset={asset}
      theme={theme}
      selectedResolution={selectedResolution}
      selectedFormat={selectedFormat}
      onResolutionChange={onResolutionChange}
      onFormatChange={onFormatChange}
      onClose={onClose}
    />
  );
}
