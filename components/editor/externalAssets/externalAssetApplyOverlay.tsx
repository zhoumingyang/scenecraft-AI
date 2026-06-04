"use client";

import { Backdrop, CircularProgress, Typography } from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";

type ExternalAssetApplyOverlayProps = {
  open: boolean;
  theme: EditorThemeTokens;
  editorThemeMode: "dark" | "light";
};

export function ExternalAssetApplyOverlay({
  open,
  theme,
  editorThemeMode
}: ExternalAssetApplyOverlayProps) {
  const { t } = useI18n();

  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (muiTheme) => muiTheme.zIndex.modal + 1,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        color: theme.titleText,
        backdropFilter: "blur(10px)",
        background:
          editorThemeMode === "dark"
            ? "radial-gradient(circle at 50% 28%, rgba(114,234,255,0.16), transparent 38%), rgba(4,7,16,0.78)"
            : "radial-gradient(circle at 50% 28%, rgba(145,198,255,0.22), transparent 38%), rgba(245,249,255,0.78)"
      }}
    >
      <CircularProgress size={34} thickness={4.2} sx={{ color: theme.titleText }} />
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: theme.titleText }}>
        {t("editor.scene.loadingTitle")}
      </Typography>
    </Backdrop>
  );
}
