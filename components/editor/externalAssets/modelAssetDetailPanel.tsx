"use client";

import CircularProgress from "@mui/material/CircularProgress";
import { Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import type { ExternalModelAssetDetail } from "@/lib/externalAssets/types";
import { ExternalAssetDetailHeader } from "./externalAssetDetailHeader";

type ModelAssetDetailPanelProps = {
  asset: ExternalModelAssetDetail;
  theme: EditorThemeTokens;
  selectedResolution: string;
  selectedFormat: string;
  onResolutionChange: (value: string) => void;
  onFormatChange: (value: string) => void;
  isApplying: boolean;
  onApply: () => void | Promise<void>;
};

export function ModelAssetDetailPanel({
  asset,
  theme,
  selectedResolution,
  selectedFormat,
  onResolutionChange,
  onFormatChange,
  isApplying,
  onApply
}: ModelAssetDetailPanelProps) {
  const { t } = useI18n();
  const availableFormats = Array.from(new Set(
    asset.modelFiles
      .filter((file) => file.resolution === selectedResolution)
      .map((file) => file.format)
  ));

  return (
    <>
      <ExternalAssetDetailHeader asset={asset} theme={theme} previewUrl={asset.thumbnailUrl} />

      <Stack spacing={1}>
        {asset.categories.length > 0 ? (
          <Stack spacing={0.35}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.titleText }}>
              {t("editor.assets.categories")}
            </Typography>
            <Typography sx={{ fontSize: 12, color: theme.text }}>
              {asset.categories.join(", ")}
            </Typography>
          </Stack>
        ) : null}

        {asset.tags.length > 0 ? (
          <Stack spacing={0.35}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.titleText }}>
              {t("editor.assets.tags")}
            </Typography>
            <Typography sx={{ fontSize: 12, color: theme.text }}>
              {asset.tags.join(", ")}
            </Typography>
          </Stack>
        ) : null}

        <TextField
          select
          size="small"
          label={t("editor.assets.resolution")}
          value={selectedResolution}
          disabled={isApplying}
          onChange={(event) => onResolutionChange(event.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              color: theme.pillText,
              background: theme.inputBg
            }
          }}
        >
          {asset.availableResolutions.map((resolution) => (
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
          disabled={isApplying}
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

        {asset.lods && asset.lods.length > 0 ? (
          <Stack spacing={0.55}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.titleText }}>
              {t("editor.assets.modelLods")}
            </Typography>
            <Typography sx={{ fontSize: 12, color: theme.text }}>
              {asset.lods.join(" / ")}
            </Typography>
          </Stack>
        ) : null}
      </Stack>

      <Button
        color="inherit"
        onClick={() => {
          void onApply();
        }}
        disabled={isApplying}
        startIcon={isApplying ? <CircularProgress size={16} color="inherit" /> : undefined}
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
        {isApplying ? t("common.processing") : t("editor.assets.importModel")}
      </Button>
    </>
  );
}
