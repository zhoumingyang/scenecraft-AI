"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { getEditorThemeTokens } from "@/components/editor/theme";
import PromptInput from "@/components/editor/aiComposer/promptInput";
import ModeToggle from "@/components/editor/aiComposer/modeToggle";
import ImageToolbar from "@/components/editor/aiComposer/imageToolbar";
import Ai3dToolbar from "@/components/editor/aiComposer/ai3dToolbar";
import Ai3dIntentControls from "@/components/editor/aiComposer/ai3dIntentControls";
import Ai3dPreviewActions from "@/components/editor/aiComposer/ai3dPreviewActions";
import { useAiImageComposer } from "@/components/editor/aiComposer/useAiImageComposer";
import { useAi3dComposer } from "@/components/editor/aiComposer/useAi3dComposer";
import { usePromptTransform } from "@/components/editor/aiComposer/usePromptTransform";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";

export default function AiImageComposer() {
  const { t } = useI18n();
  const [isAi3dErrorToastOpen, setIsAi3dErrorToastOpen] = useState(false);
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const aiMode = useEditorStore((state) => state.aiMode);
  const aiImage = useEditorStore((state) => state.aiImage);
  const ai3d = useEditorStore((state) => state.ai3d);
  const setAiMode = useEditorStore((state) => state.setAiMode);
  const setAiPrompt = useEditorStore((state) => state.setAiPrompt);
  const setAiModel = useEditorStore((state) => state.setAiModel);
  const setAiComposerOpen = useEditorStore((state) => state.setAiComposerOpen);
  const setAiInspectorMode = useEditorStore((state) => state.setAiInspectorMode);
  const setAi3dPrompt = useEditorStore((state) => state.setAi3dPrompt);
  const setAi3dIntentDraft = useEditorStore((state) => state.setAi3dIntentDraft);
  const setAi3dState = useEditorStore((state) => state.setAi3dState);
  const setAiGeneratingState = useEditorStore((state) => state.setAiGeneratingState);
  const theme = getEditorThemeTokens(editorThemeMode);

  useEffect(() => {
    if (!ai3d.errorMessage) return;
    setIsAi3dErrorToastOpen(true);
  }, [ai3d.errorMessage]);

  const utilityIconButtonSx = useMemo(
    () =>
      ({
        color: theme.pillText,
        background: theme.iconButtonBg,
        border: theme.sectionBorder,
        "&:hover": {
          background: theme.itemHoverBg
        },
        "&.Mui-disabled": {
          color: theme.mutedText,
          background: theme.itemBg,
          border: theme.sectionBorder
        }
      }) as const,
    [theme]
  );

  const focusAiMode = () => {
    setAiInspectorMode("ai");
    app?.setSelectedEntity(null);
  };

  const focusAi3dMode = () => {
    setAiMode("3d");
    setAiInspectorMode("entity");
  };

  const {
    activePromptAction,
    isPromptActionPending,
    handlePromptTransform
  } = usePromptTransform({
    aiMode,
    prompt: aiImage.prompt,
    ai3dPrompt: ai3d.prompt,
    isImageBusy: aiImage.isGenerating,
    isAi3dBusy: ai3d.isGenerating || ai3d.isOptimizing,
    setAiPrompt,
    setAi3dPrompt,
    setAiGeneratingState,
    setAi3dState,
    t
  });

  const { handleSubmit } = useAiImageComposer({
    model: aiImage.model,
    prompt: aiImage.prompt,
    seed: aiImage.seed,
    imageSize: aiImage.imageSize,
    cfg: aiImage.cfg,
    inferenceSteps: aiImage.inferenceSteps,
    referenceImages: aiImage.referenceImages,
    isGenerating: aiImage.isGenerating,
    isPromptActionPending,
    setAiGeneratingState,
    t
  });

  const {
    isAi3dBusy,
    hasAi3dPreview,
    canShowOriginal,
    canShowOptimized,
    ai3dCreateCount,
    handleAi3dSubmit,
    handleAi3dOptimize,
    handleAi3dShowOriginal,
    handleAi3dShowOptimized,
    handleAi3dDiscard,
    handleAi3dApply
  } = useAi3dComposer({
    app,
    ai3d,
    setAi3dState,
    setAiInspectorMode,
    t
  });

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();

      if (aiMode === "image") {
        void handleSubmit();
        return;
      }

      void handleAi3dSubmit();
    }
  };

  if (!aiImage.isComposerOpen) {
    return (
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          bottom: 32,
          transform: "translateX(-50%)",
          zIndex: 22
        }}
      >
        <Paper
          elevation={0}
          onClick={() => {
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
            cursor: "pointer"
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
    <Box
      sx={{
        position: "absolute",
        left: "50%",
        bottom: 24,
        transform: "translateX(-50%)",
        zIndex: 22,
        width: "min(720px, calc(100vw - 144px))"
      }}
    >
      <Box sx={{ position: "relative", width: "100%" }}>
        <IconButton
          size="small"
          onClick={() => setAiComposerOpen(false)}
          sx={{
            position: "absolute",
            top: -14,
            right: -14,
            zIndex: 1,
            color: theme.pillText,
            background: theme.panelBg,
            border: theme.sectionBorder,
            boxShadow: theme.panelShadow,
            "&:hover": {
              background: theme.sectionBg
            }
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 16 }} />
        </IconButton>

        <Paper
          elevation={0}
          sx={{
            width: "100%",
            borderRadius: "10px",
            border: theme.panelBorder,
            background: theme.panelBg,
            backdropFilter: "blur(16px)",
            boxShadow: theme.panelShadow
          }}
        >
          <Stack spacing={0.5} sx={{ p: 1.2 }}>
            <PromptInput
              value={aiMode === "image" ? aiImage.prompt : ai3d.prompt}
              placeholder={
                aiMode === "image" ? t("editor.ai.promptPlaceholder") : t("editor.ai3d.promptPlaceholder")
              }
              theme={theme}
              onFocus={aiMode === "image" ? focusAiMode : focusAi3dMode}
              onChange={(value) => {
                if (aiMode === "image") {
                  setAiPrompt(value);
                  return;
                }
                setAi3dPrompt(value);
              }}
              onKeyDown={handlePromptKeyDown}
            />

            {aiMode === "3d" ? (
              <Ai3dIntentControls
                theme={theme}
                value={ai3d.intentDraft}
                onChange={setAi3dIntentDraft}
                t={t}
              />
            ) : null}

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 0.3 }}>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <ModeToggle
                  aiMode={aiMode}
                  theme={theme}
                  t={t}
                  onChange={(mode) => {
                    if (mode === "image") {
                      setAiMode("image");
                      focusAiMode();
                      return;
                    }
                    focusAi3dMode();
                  }}
                />
              </Stack>

              {aiMode === "image" ? (
                <ImageToolbar
                  model={aiImage.model}
                  theme={theme}
                  utilityIconButtonSx={utilityIconButtonSx}
                  isGenerating={aiImage.isGenerating}
                  isPromptActionPending={isPromptActionPending}
                  prompt={aiImage.prompt}
                  activePromptAction={activePromptAction}
                  setAiModel={setAiModel}
                  focusAiMode={focusAiMode}
                  handlePromptTransform={handlePromptTransform}
                  t={t}
                />
              ) : (
                <Ai3dToolbar
                  theme={theme}
                  utilityIconButtonSx={utilityIconButtonSx}
                  isAi3dBusy={isAi3dBusy}
                  isPromptActionPending={isPromptActionPending}
                  prompt={ai3d.prompt}
                  isGenerating={ai3d.isGenerating}
                  isOptimizing={ai3d.isOptimizing}
                  activePromptAction={activePromptAction}
                  handlePromptTransform={handlePromptTransform}
                  t={t}
                />
              )}

              <IconButton
                size="small"
                disabled={
                  aiMode === "image"
                    ? aiImage.isGenerating || isPromptActionPending || !aiImage.prompt.trim()
                    : isAi3dBusy || !ai3d.prompt.trim()
                }
                onClick={() => {
                  if (aiMode === "image") {
                    void handleSubmit();
                    return;
                  }
                  void handleAi3dSubmit();
                }}
                sx={{
                  color: theme.pillText,
                  transform: "rotate(-90deg)",
                  background:
                    (aiMode === "image"
                      ? aiImage.prompt.trim() && !aiImage.isGenerating && !isPromptActionPending
                      : ai3d.prompt.trim() && !isAi3dBusy)
                      ? editorThemeMode === "dark"
                        ? "linear-gradient(135deg, #2f6df4, #63a4ff)"
                        : "linear-gradient(135deg, #4c86f7, #86b7ff)"
                      : theme.itemBg,
                  border: theme.sectionBorder
                }}
              >
                {(aiMode === "image" ? aiImage.isGenerating : isAi3dBusy) ? (
                  <CircularProgress size={16} sx={{ color: theme.pillText }} />
                ) : (
                  <SendRoundedIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </Stack>

            {aiMode === "3d" && hasAi3dPreview ? (
              <Ai3dPreviewActions
                theme={theme}
                utilityIconButtonSx={utilityIconButtonSx}
                previewVariant={ai3d.previewVariant}
                primitiveCountText={t("editor.ai3d.primitiveCount", { count: ai3dCreateCount })}
                canShowOriginal={canShowOriginal}
                canShowOptimized={canShowOptimized}
                isAi3dBusy={isAi3dBusy}
                isOptimizing={ai3d.isOptimizing}
                onShowOriginal={handleAi3dShowOriginal}
                onShowOptimized={handleAi3dShowOptimized}
                onOptimize={handleAi3dOptimize}
                onDiscard={handleAi3dDiscard}
                onApply={handleAi3dApply}
                t={t}
              />
            ) : null}
          </Stack>
        </Paper>
      </Box>

      <Snackbar
        open={isAi3dErrorToastOpen && Boolean(ai3d.errorMessage)}
        autoHideDuration={4000}
        onClose={() => setIsAi3dErrorToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setIsAi3dErrorToastOpen(false)}
          sx={{ width: "100%" }}
        >
          {ai3d.errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
