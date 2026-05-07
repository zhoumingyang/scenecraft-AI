"use client";

import CircularProgress from "@mui/material/CircularProgress";
import { Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import type { ExternalTextureAssetDetail } from "@/lib/externalAssets/types";
import { ExternalAssetDetailHeader } from "./externalAssetDetailHeader";

type TextureAssetDetailPanelProps = {
  asset: ExternalTextureAssetDetail;
  theme: EditorThemeTokens;
  selectedResolution: string;
  onResolutionChange: (value: string) => void;
  isApplying: boolean;
  onApply: () => void | Promise<void>;
};

export function TextureAssetDetailPanel({
  asset,
  theme,
  selectedResolution,
  onResolutionChange,
  isApplying,
  onApply
}: TextureAssetDetailPanelProps) {
  const { t } = useI18n();

  return (
    <>
      <ExternalAssetDetailHeader asset={asset} theme={theme} previewUrl={asset.thumbnailUrl} />

      <Stack spacing={1}>
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

        <Stack spacing={0.55}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.titleText }}>
            {t("editor.assets.textureMaps")}
          </Typography>
          {asset.textureMaps.map((textureMap) => (
            <Typography
              key={textureMap.materialField}
              sx={{ fontSize: 12, color: theme.text }}
            >
              {textureMap.displayName} → {textureMap.materialField}
            </Typography>
          ))}
        </Stack>
      </Stack>

      <Button
        color="inherit"
        onClick={onApply}
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
        {isApplying ? t("common.processing") : t("editor.assets.applyTextureSet")}
      </Button>
    </>
  );
}
