"use client";

import { Button, MenuItem, Stack, TextField } from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import type { ExternalHdriAssetDetail } from "@/lib/externalAssets/types";
import { ExternalAssetDetailHeader } from "./externalAssetDetailHeader";

type HdriAssetDetailPanelProps = {
  asset: ExternalHdriAssetDetail;
  theme: EditorThemeTokens;
  selectedResolution: string;
  selectedFormat: string;
  onResolutionChange: (value: string) => void;
  onFormatChange: (value: string) => void;
  onApply: () => void;
};

export function HdriAssetDetailPanel({
  asset,
  theme,
  selectedResolution,
  selectedFormat,
  onResolutionChange,
  onFormatChange,
  onApply
}: HdriAssetDetailPanelProps) {
  const { t } = useI18n();
  const availableResolutions = Array.from(new Set(asset.fileOptions.map((file) => file.resolution)));
  const availableFormats = Array.from(
    new Set(
      asset.fileOptions
        .filter((file) => file.resolution === selectedResolution)
        .map((file) => file.format)
    )
  );

  return (
    <>
      <ExternalAssetDetailHeader
        asset={asset}
        theme={theme}
        previewUrl={asset.tonemappedUrl || asset.thumbnailUrl}
      />

      <Stack spacing={1}>
        <TextField
          select
          size="small"
          label={t("editor.assets.resolution")}
          value={selectedResolution}
          onChange={(event) => onResolutionChange(event.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              color: theme.pillText,
              background: theme.inputBg
            }
          }}
        >
          {availableResolutions.map((resolution) => (
            <MenuItem key={resolution} value={resolution}>
              {resolution.toUpperCase()}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label={t("editor.assets.format")}
          value={selectedFormat}
          onChange={(event) => onFormatChange(event.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              color: theme.pillText,
              background: theme.inputBg
            }
          }}
        >
          {availableFormats.map((format) => (
            <MenuItem key={format} value={format}>
              {format.toUpperCase()}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Button
        color="inherit"
        onClick={onApply}
        sx={{
          mt: "auto",
          minHeight: 40,
          borderRadius: 1,
          border: theme.sectionBorder,
          background: theme.iconButtonBg,
          color: theme.pillText,
          textTransform: "none"
        }}
      >
        {t("editor.assets.applyHdri")}
      </Button>
    </>
  );
}
