"use client";

import { Box, CircularProgress, Typography } from "@mui/material";
import { useI18n } from "@/lib/i18n";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useEditorStore } from "@/stores/editorStore";

export default function SceneLoadingOverlay() {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const sceneLoadingStatus = useEditorStore((state) => state.sceneLoadingStatus);
  const theme = getEditorThemeTokens(editorThemeMode);

  if (sceneLoadingStatus.activeRequests === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
        backdropFilter: "blur(12px)",
        background:
          editorThemeMode === "dark"
            ? "radial-gradient(circle at top, rgba(74,133,255,0.18), transparent 30%), rgba(4,7,16,0.7)"
            : "radial-gradient(circle at top, rgba(255,188,122,0.22), transparent 30%), rgba(245,249,255,0.72)"
      }}
    >
      <Box
        sx={{
          minWidth: 240,
          maxWidth: 320,
          px: 3,
          py: 2.5,
          border: theme.panelBorder,
          borderRadius: "22px",
          background: theme.menuBg,
          boxShadow: theme.panelShadow,
          display: "grid",
          justifyItems: "center",
          gap: 1.25,
          textAlign: "center"
        }}
      >
        <CircularProgress size={34} thickness={4.2} sx={{ color: theme.titleText }} />
        <Typography
          sx={{
            color: theme.titleText,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.04em"
          }}
        >
          {sceneLoadingStatus.message ?? t("editor.scene.loadingTitle")}
        </Typography>
        <Typography
          sx={{
            color: theme.mutedText,
            fontSize: 12.5,
            lineHeight: 1.5
          }}
        >
          {t("editor.scene.loadingHint")}
        </Typography>
      </Box>
    </Box>
  );
}
