"use client";

import { Box, Stack, Typography } from "@mui/material";
import { useI18n } from "@/lib/i18n";
import type { ExternalAssetDetail } from "@/lib/externalAssets/types";
import type { EditorThemeTokens } from "@/components/editor/theme";

type ExternalAssetDetailHeaderProps = {
  asset: ExternalAssetDetail;
  theme: EditorThemeTokens;
  previewUrl: string;
};

export function ExternalAssetDetailHeader({
  asset,
  theme,
  previewUrl
}: ExternalAssetDetailHeaderProps) {
  const { t } = useI18n();

  return (
    <>
      <Box
        component="img"
        src={previewUrl}
        alt={asset.displayName}
        sx={{
          width: "100%",
          aspectRatio: "16 / 9",
          objectFit: "cover",
          display: "block",
          borderRadius: 1.2,
          border: theme.sectionBorder,
          background: theme.inputBg
        }}
      />

      <Stack spacing={0.45}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: theme.titleText }}>
          {asset.displayName}
        </Typography>
        <Typography sx={{ fontSize: 12, color: theme.text }}>
          {asset.authorLabel}
        </Typography>
        <Typography sx={{ fontSize: 12, color: theme.mutedText }}>
          {t("editor.assets.sourceLine", {
            provider: "Poly Haven",
            license: asset.licenseLabel
          })}
        </Typography>
        <Box
          component="a"
          href={asset.pageUrl}
          target="_blank"
          rel="noreferrer"
          sx={{
            fontSize: 12,
            color: theme.titleText,
            textDecoration: "underline"
          }}
        >
          {t("editor.assets.viewSource")}
        </Box>
      </Stack>
    </>
  );
}
