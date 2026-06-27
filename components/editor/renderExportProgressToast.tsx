"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { Box, Button, Fade, LinearProgress, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";

export type RenderExportProgressStatus = {
  active: boolean;
  progress: number;
  message: string;
};

type RenderExportProgressToastProps = {
  status: RenderExportProgressStatus;
  theme: EditorThemeTokens;
  onCancel: () => void;
};

export default function RenderExportProgressToast({
  status,
  theme,
  onCancel
}: RenderExportProgressToastProps) {
  const { t } = useI18n();

  if (!status.active) {
    return null;
  }

  const progressPercent = Math.round(status.progress * 100);

  return (
    <Fade in timeout={{ enter: 220, exit: 180 }}>
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: 84,
          transform: "translateX(-50%)",
          zIndex: 22
        }}
      >
        <Box
          sx={{
            minWidth: 280,
            maxWidth: 420,
            overflow: "hidden",
            borderRadius: 2,
            border: theme.panelBorder,
            background: `linear-gradient(145deg, ${alpha("#69b7ff", 0.1)}, transparent 48%), ${theme.panelBg}`,
            boxShadow: theme.panelShadow,
            backdropFilter: "blur(14px)"
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              px: 1.2,
              py: 0.95
            }}
          >
            <Box
              sx={{
                flexShrink: 0,
                width: 30,
                height: 30,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                color: alpha("#69b7ff", 0.96),
                background: alpha("#69b7ff", 0.18),
                border: `1px solid ${alpha("#69b7ff", 0.32)}`
              }}
            >
              <DownloadRoundedIcon sx={{ fontSize: 15 }} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  color: theme.text,
                  fontSize: 12.5,
                  lineHeight: 1.25,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {status.message}
              </Typography>
              <Typography sx={{ mt: 0.25, color: theme.mutedText, fontSize: 11 }}>
                {t("editor.export.progress", { progress: progressPercent })}
              </Typography>
            </Box>
            <Button
              size="small"
              color="inherit"
              startIcon={<CloseRoundedIcon />}
              onClick={onCancel}
              sx={{
                minWidth: "auto",
                px: 0.9,
                color: theme.text,
                textTransform: "none",
                fontSize: 12
              }}
            >
              {t("editor.export.cancel")}
            </Button>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 2,
              background: alpha("#69b7ff", 0.12),
              "& .MuiLinearProgress-bar": {
                background: alpha("#69b7ff", 0.95)
              }
            }}
          />
        </Box>
      </Box>
    </Fade>
  );
}
