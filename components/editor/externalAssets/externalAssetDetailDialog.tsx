"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import type { ExternalAssetDetail } from "@/lib/externalAssets/types";
import { HdriAssetDetailPanel } from "./hdriAssetDetailPanel";
import { ModelAssetDetailPanel } from "./modelAssetDetailPanel";
import { TextureAssetDetailPanel } from "./textureAssetDetailPanel";

type ExternalAssetDetailDialogProps = {
  open: boolean;
  asset: ExternalAssetDetail | null;
  theme: EditorThemeTokens;
  selectedResolution: string;
  selectedFormat: string;
  onResolutionChange: (value: string) => void;
  onFormatChange: (value: string) => void;
  onClose: () => void;
};

export function ExternalAssetDetailDialog({
  open,
  asset,
  theme,
  selectedResolution,
  selectedFormat,
  onResolutionChange,
  onFormatChange,
  onClose
}: ExternalAssetDetailDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog
      open={open && Boolean(asset)}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 1.5,
          border: theme.panelBorder,
          background: theme.panelBg,
          overflow: "hidden"
        }
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          color: theme.titleText,
          fontWeight: 700
        }}
      >
        <Typography component="span" sx={{ fontSize: 18, fontWeight: 700, color: theme.titleText }}>
          {asset?.displayName ?? t("editor.assets.assetDetails")}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          aria-label={t("dialog.close")}
          sx={{
            color: theme.pillText,
            border: theme.sectionBorder,
            background: theme.iconButtonBg
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
        {asset?.assetType === "hdri" ? (
          <HdriAssetDetailPanel
            asset={asset}
            theme={theme}
            selectedResolution={selectedResolution}
            selectedFormat={selectedFormat}
            onResolutionChange={onResolutionChange}
            onFormatChange={onFormatChange}
            showApplyButton={false}
            showSelectionControls={false}
          />
        ) : asset?.assetType === "model" ? (
          <ModelAssetDetailPanel
            asset={asset}
            theme={theme}
            selectedResolution={selectedResolution}
            selectedFormat={selectedFormat}
            onResolutionChange={onResolutionChange}
            onFormatChange={onFormatChange}
            showApplyButton={false}
            showSelectionControls={false}
          />
        ) : asset?.assetType === "texture" ? (
          <TextureAssetDetailPanel
            asset={asset}
            theme={theme}
            selectedResolution={selectedResolution}
            selectedFormat={selectedFormat}
            onResolutionChange={onResolutionChange}
            onFormatChange={onFormatChange}
            showApplyButton={false}
            showSelectionControls={false}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
