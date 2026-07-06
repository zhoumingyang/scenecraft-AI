"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { Box, Button, Fade, IconButton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEditorTheme } from "@/components/editor/editorThemeContext";
import { useI18n } from "@/lib/i18n";
import type { LightingConflictNotice } from "@/stores/editorStore";

type LightingConflictToastProps = {
  notice: LightingConflictNotice;
  onClose: () => void;
  onRemoveFillLights: () => void;
};

export default function LightingConflictToast({
  notice,
  onClose,
  onRemoveFillLights
}: LightingConflictToastProps) {
  const { t } = useI18n();
  const { theme } = useEditorTheme();

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
              <Button
                size="small"
                variant="text"
                startIcon={<DeleteSweepRoundedIcon sx={{ fontSize: 15 }} />}
                aria-label={t("editor.lightingConflict.removeFillLightsAria")}
                onClick={onRemoveFillLights}
                sx={{
                  mt: 0.8,
                  minHeight: 26,
                  px: 0.9,
                  py: 0.25,
                  color: alpha("#ffbf66", 0.96),
                  border: `1px solid ${alpha("#ffbf66", 0.32)}`,
                  background: alpha("#ffbf66", 0.08),
                  fontSize: 11.5,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  textTransform: "none",
                  "& .MuiButton-startIcon": {
                    mr: 0.55
                  },
                  "&:hover": {
                    background: alpha("#ffbf66", 0.14),
                    borderColor: alpha("#ffbf66", 0.48)
                  }
                }}
              >
                {t("editor.lightingConflict.removeFillLights")}
              </Button>
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
