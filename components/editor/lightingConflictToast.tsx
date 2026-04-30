"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { Box, Fade, IconButton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import type { LightingConflictNotice } from "@/stores/editorStore";

type LightingConflictToastProps = {
  notice: LightingConflictNotice;
  theme: EditorThemeTokens;
  onClose: () => void;
};

export default function LightingConflictToast({
  notice,
  theme,
  onClose
}: LightingConflictToastProps) {
  const { t } = useI18n();

  if (!notice.open) {
    return null;
  }

  const message = notice.hasAmbientLight && notice.hasHemisphereLight
    ? t("editor.lightingConflict.messageAmbientAndHemisphere")
    : notice.hasAmbientLight
      ? t("editor.lightingConflict.messageAmbient")
      : t("editor.lightingConflict.messageHemisphere");

  return (
    <Fade in timeout={{ enter: 220, exit: 180 }}>
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: 132,
          transform: "translateX(-50%)",
          zIndex: 21,
          width: "min(560px, calc(100vw - 32px))",
          pointerEvents: "none"
        }}
      >
        <Box
          sx={{
            pointerEvents: "auto",
            overflow: "hidden",
            borderRadius: 2,
            border: theme.panelBorder,
            background: `linear-gradient(145deg, ${alpha("#ffbf66", 0.14)}, transparent 46%), ${theme.panelBg}`,
            boxShadow: theme.panelShadow,
            backdropFilter: "blur(14px)"
          }}
        >
          <Stack
            direction="row"
            spacing={1.1}
            sx={{
              alignItems: "flex-start",
              px: 1.2,
              py: 1
            }}
          >
            <Box
              sx={{
                mt: 0.15,
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                color: alpha("#ffbf66", 0.96),
                background: `linear-gradient(145deg, ${alpha("#ffbf66", 0.24)}, ${alpha("#ffbf66", 0.12)})`,
                border: `1px solid ${alpha("#ffbf66", 0.3)}`
              }}
            >
              <LightModeRoundedIcon sx={{ fontSize: 16 }} />
            </Box>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  color: theme.titleText,
                  fontSize: 12.5,
                  fontWeight: 600,
                  lineHeight: 1.25
                }}
              >
                {t("editor.lightingConflict.title")}
              </Typography>
              <Typography
                sx={{
                  mt: 0.35,
                  color: theme.text,
                  fontSize: 11.5,
                  lineHeight: 1.45
                }}
              >
                {message}
              </Typography>
            </Box>

            <IconButton
              size="small"
              aria-label={t("editor.lightingConflict.dismiss")}
              onClick={onClose}
              sx={{
                mt: -0.25,
                mr: -0.25,
                color: theme.mutedText,
                background: theme.iconButtonBg
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Stack>
          <Box
            sx={{
              height: 2,
              background: `linear-gradient(90deg, ${alpha("#ffbf66", 0.18)}, ${alpha("#ffbf66", 0.9)})`
            }}
          />
        </Box>
      </Box>
    </Fade>
  );
}
