"use client";

import { useEffect } from "react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Box, Fade, Stack, Typography } from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import type { ProjectSaveStatus } from "@/stores/editorStore";

type ProjectSaveProgressToastProps = {
  status: ProjectSaveStatus;
  theme: EditorThemeTokens;
  onClose: () => void;
};

const savingDot = keyframes`
  0%, 100% {
    transform: translateY(0) scaleY(0.72);
    opacity: 0.42;
  }
  50% {
    transform: translateY(-2px) scaleY(1);
    opacity: 1;
  }
`;

const savingShimmer = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(240%);
  }
`;

const badgePulse = keyframes`
  0% {
    transform: scale(0.9);
    opacity: 0.6;
  }
  70% {
    transform: scale(1.22);
    opacity: 0;
  }
  100% {
    transform: scale(1.22);
    opacity: 0;
  }
`;

export default function ProjectSaveProgressToast({
  status,
  theme,
  onClose
}: ProjectSaveProgressToastProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (status.phase === "idle" || status.phase === "saving") {
      return;
    }

    const timer = window.setTimeout(() => {
      onClose();
    }, 3200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [onClose, status.phase, status.updatedAt]);

  if (status.phase === "idle") {
    return null;
  }

  const isSaving = status.phase === "saving";
  const isSuccess = status.phase === "success";
  const accentColor = isSaving
    ? alpha("#69b7ff", 0.92)
    : isSuccess
      ? alpha("#5be3a2", 0.96)
      : alpha("#ff8b8b", 0.96);
  const accentSoft = isSaving
    ? alpha("#69b7ff", 0.18)
    : isSuccess
      ? alpha("#5be3a2", 0.18)
      : alpha("#ff8b8b", 0.18);
  const Icon = isSaving ? SaveRoundedIcon : isSuccess ? CheckRoundedIcon : CloseRoundedIcon;

  return (
    <Fade in timeout={{ enter: 220, exit: 180 }}>
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: 84,
          transform: "translateX(-50%)",
          zIndex: 21,
          pointerEvents: "none"
        }}
      >
        <Box
          sx={{
            position: "relative",
            minWidth: 240,
            maxWidth: 420,
            overflow: "hidden",
            borderRadius: 2,
            border: theme.panelBorder,
            background: `linear-gradient(145deg, ${alpha(accentColor, 0.08)}, transparent 42%), ${theme.panelBg}`,
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
              py: 0.9
            }}
          >
            <Box
              sx={{
                position: "relative",
                flexShrink: 0,
                width: 30,
                height: 30,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                color: accentColor,
                background: `linear-gradient(145deg, ${alpha(accentColor, 0.24)}, ${accentSoft})`,
                border: `1px solid ${alpha(accentColor, 0.34)}`,
                boxShadow: `0 10px 22px ${alpha(accentColor, 0.18)}`,
                "&::after": isSaving
                  ? undefined
                  : {
                      content: '""',
                      position: "absolute",
                      inset: -4,
                      borderRadius: "50%",
                      border: `1px solid ${alpha(accentColor, 0.28)}`,
                      animation: `${badgePulse} 1.5s ease-out infinite`
                    }
              }}
            >
              <Icon sx={{ fontSize: 15 }} />
            </Box>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  color: theme.text,
                  fontSize: 12.5,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {status.message ??
                  (isSaving
                    ? t("editor.project.toastSavingFallback")
                    : isSuccess
                      ? t("editor.project.toastSuccessFallback")
                      : t("editor.project.toastErrorFallback"))}
              </Typography>
            </Box>

            {isSaving ? (
              <Stack
                direction="row"
                spacing={0.35}
                sx={{
                  alignItems: "flex-end",
                  alignSelf: "stretch",
                  py: 0.35
                }}
              >
                {[0, 1, 2].map((index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 3,
                      height: 13,
                      borderRadius: 999,
                      background: `linear-gradient(180deg, ${accentColor}, ${alpha(accentColor, 0.24)})`,
                      animation: `${savingDot} 0.95s ease-in-out ${index * 0.12}s infinite`
                    }}
                  />
                ))}
              </Stack>
            ) : null}
          </Stack>

          <Box
            sx={{
              position: "relative",
              height: 2,
              background: alpha(accentColor, isSaving ? 0.12 : 0.18)
            }}
          >
            {isSaving ? (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  width: "38%",
                  background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                  animation: `${savingShimmer} 1.15s linear infinite`
                }}
              />
            ) : (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(90deg, ${alpha(accentColor, 0.24)}, ${accentColor})`
                }}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Fade>
  );
}
