"use client";

import { Alert, Box, Paper, Snackbar, Typography } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import AiComposerPanel from "@/components/editor/aiComposer/aiComposerPanel";
import { useAiComposerController } from "@/components/editor/aiComposer/useAiComposerController";

export default function AiImageComposer() {
  const controller = useAiComposerController();
  const {
    ai3dErrorMessage,
    aiPanoramaErrorMessage,
    editorThemeMode,
    focusAiMode,
    isComposerOpen,
    isErrorToastOpen,
    isStudioSceneActive,
    setAiComposerOpen,
    setIsErrorToastOpen,
    t,
    theme
  } = controller;

  if (!isComposerOpen || isStudioSceneActive) {
    return (
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          bottom: isStudioSceneActive ? 178 : 32,
          transform: "translateX(-50%)",
          zIndex: 22
        }}
      >
        <Paper
          elevation={0}
          onClick={() => {
            if (isStudioSceneActive) return;
            setAiComposerOpen(true);
            focusAiMode();
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2.2,
            py: 1.2,
            borderRadius: "999px",
            border: theme.pillBorder,
            background:
              editorThemeMode === "dark"
                ? "linear-gradient(135deg, rgba(15,24,52,0.94), rgba(24,39,82,0.88) 55%, rgba(42,84,168,0.82))"
                : "linear-gradient(135deg, rgba(255,255,255,0.94), rgba(237,245,255,0.92) 55%, rgba(189,220,255,0.88))",
            boxShadow: theme.panelShadow,
            color: theme.pillText,
            cursor: isStudioSceneActive ? "not-allowed" : "pointer",
            opacity: isStudioSceneActive ? 0.48 : 1,
            pointerEvents: isStudioSceneActive ? "none" : "auto"
          }}
        >
          <AutoAwesomeRoundedIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.03em" }}>
            {t("editor.ai.chatButton")}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <>
      <AiComposerPanel controller={controller} />

      <Snackbar
        open={isErrorToastOpen && Boolean(ai3dErrorMessage)}
        autoHideDuration={4000}
        onClose={() => setIsErrorToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setIsErrorToastOpen(false)}
          sx={{ width: "100%" }}
        >
          {ai3dErrorMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={isErrorToastOpen && Boolean(aiPanoramaErrorMessage)}
        autoHideDuration={4000}
        onClose={() => setIsErrorToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          onClose={() => setIsErrorToastOpen(false)}
          sx={{ fontSize: 12 }}
        >
          {aiPanoramaErrorMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
