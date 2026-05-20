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
import { useAiPbrTextureComposer } from "@/components/editor/aiComposer/useAiPbrTextureComposer";
import { useAiPanoramaComposer } from "@/components/editor/aiComposer/useAiPanoramaComposer";
import { useAi3dComposer } from "@/components/editor/aiComposer/useAi3dComposer";
import { usePromptTransform } from "@/components/editor/aiComposer/usePromptTransform";
import { useI18n } from "@/lib/i18n";
import { GROUND_HELPER_NODE_ID, SCENE_NODE_ID } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import type { AiMode, AiTextureTarget } from "@/stores/editorStore";

export default function AiImageComposer() {
  const { t } = useI18n();
  const [isAi3dErrorToastOpen, setIsAi3dErrorToastOpen] = useState(false);
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const aiMode = useEditorStore((state) => state.aiMode);
  const selectedEntityId = useEditorStore((state) => state.selectedEntityId);
  const lastAiClearedEntityId = useEditorStore((state) => state.lastAiClearedEntityId);
  const imagePrompt = useEditorStore((state) => state.aiImage.prompt);
  const imageModel = useEditorStore((state) => state.aiImage.model);
  const imageSeed = useEditorStore((state) => state.aiImage.seed);
  const imageSize = useEditorStore((state) => state.aiImage.imageSize);
  const imageCfg = useEditorStore((state) => state.aiImage.cfg);
  const imageInferenceSteps = useEditorStore((state) => state.aiImage.inferenceSteps);
  const imageReferenceImages = useEditorStore((state) => state.aiImage.referenceImages);
  const imageIsGenerating = useEditorStore((state) => state.aiImage.isGenerating);
  const isComposerOpen = useEditorStore((state) => state.aiImage.isComposerOpen);
  const aiTexturePrompt = useEditorStore((state) => state.aiTexture.prompt);
  const aiTextureIsGenerating = useEditorStore((state) => state.aiTexture.isGenerating);
  const aiTextureTarget = useEditorStore((state) => state.aiTexture.target);
  const aiPanoramaPrompt = useEditorStore((state) => state.aiPanorama.prompt);
  const aiPanoramaIsGenerating = useEditorStore((state) => state.aiPanorama.isGenerating);
  const aiPanoramaErrorMessage = useEditorStore((state) => state.aiPanorama.errorMessage);
  const ai3dPrompt = useEditorStore((state) => state.ai3d.prompt);
  const ai3dIntentDraft = useEditorStore((state) => state.ai3d.intentDraft);
  const ai3dIsGenerating = useEditorStore((state) => state.ai3d.isGenerating);
  const ai3dIsOptimizing = useEditorStore((state) => state.ai3d.isOptimizing);
  const ai3dErrorMessage = useEditorStore((state) => state.ai3d.errorMessage);
  const ai3dPreviewStatus = useEditorStore((state) => state.ai3d.previewStatus);
  const ai3dPlan = useEditorStore((state) => state.ai3d.plan);
  const ai3dOriginalPlan = useEditorStore((state) => state.ai3d.originalPlan);
  const ai3dOptimizedPlan = useEditorStore((state) => state.ai3d.optimizedPlan);
  const ai3dPreviewVariant = useEditorStore((state) => state.ai3d.previewVariant);
  const ai3dLastDiagnostics = useEditorStore((state) => state.ai3d.lastDiagnostics);
  const setAiMode = useEditorStore((state) => state.setAiMode);
  const setAiPrompt = useEditorStore((state) => state.setAiPrompt);
  const setAiModel = useEditorStore((state) => state.setAiModel);
  const setAiComposerOpen = useEditorStore((state) => state.setAiComposerOpen);
  const setAiInspectorMode = useEditorStore((state) => state.setAiInspectorMode);
  const setLastAiClearedEntityId = useEditorStore((state) => state.setLastAiClearedEntityId);
  const setAiTexturePrompt = useEditorStore((state) => state.setAiTexturePrompt);
  const setAiTextureState = useEditorStore((state) => state.setAiTextureState);
  const setAiPanoramaPrompt = useEditorStore((state) => state.setAiPanoramaPrompt);
  const setAiPanoramaState = useEditorStore((state) => state.setAiPanoramaState);
  const setAi3dPrompt = useEditorStore((state) => state.setAi3dPrompt);
  const setAi3dIntentDraft = useEditorStore((state) => state.setAi3dIntentDraft);
  const setAi3dState = useEditorStore((state) => state.setAi3dState);
  const setAiGeneratingState = useEditorStore((state) => state.setAiGeneratingState);
  const appendPendingAiGeneration = useEditorStore((state) => state.appendPendingAiGeneration);
  const registerLocalProjectAsset = useEditorStore((state) => state.registerLocalProjectAsset);
  const theme = getEditorThemeTokens(editorThemeMode);
  const ai3d = useMemo(
    () => ({
      prompt: ai3dPrompt,
      intentDraft: ai3dIntentDraft,
      isGenerating: ai3dIsGenerating,
      isOptimizing: ai3dIsOptimizing,
      errorMessage: ai3dErrorMessage,
      previewStatus: ai3dPreviewStatus,
      plan: ai3dPlan,
      originalPlan: ai3dOriginalPlan,
      optimizedPlan: ai3dOptimizedPlan,
      previewVariant: ai3dPreviewVariant,
      lastDiagnostics: ai3dLastDiagnostics
    }),
    [
      ai3dPrompt,
      ai3dIntentDraft,
      ai3dIsGenerating,
      ai3dIsOptimizing,
      ai3dErrorMessage,
      ai3dPreviewStatus,
      ai3dPlan,
      ai3dOriginalPlan,
      ai3dOptimizedPlan,
      ai3dPreviewVariant,
      ai3dLastDiagnostics
    ]
  );

  useEffect(() => {
    if (!ai3dErrorMessage) return;
    setIsAi3dErrorToastOpen(true);
  }, [ai3dErrorMessage]);

  useEffect(() => {
    if (!aiPanoramaErrorMessage) return;
    setIsAi3dErrorToastOpen(true);
  }, [aiPanoramaErrorMessage]);

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

  const rememberAndClearSelection = () => {
    const currentSelectedEntityId = app?.getSelectedEntityId() ?? selectedEntityId;
    if (currentSelectedEntityId) {
      setLastAiClearedEntityId(currentSelectedEntityId);
    }
    app?.setSelectedEntity(null);
  };

  const resolveTextureTarget = (entityId: string | null): AiTextureTarget | null => {
    const project = app?.projectModel;
    if (!project || !entityId) return null;

    if (entityId === GROUND_HELPER_NODE_ID) {
      if (!project.envConfig.ground.visible || project.envConfig.ground.mode !== "plane") {
        return null;
      }

      return {
        kind: "ground",
        label: t("editor.view.gridHelper")
      };
    }

    const record = project.getEntityById(entityId);
    if (!record || record.kind !== "mesh") {
      return null;
    }

    return {
      kind: "mesh",
      id: record.item.id,
      label: record.item.label || t("editor.sceneTree.meshes")
    };
  };

  const focusAiMode = () => {
    setAiMode("image");
    setAiInspectorMode("ai");
    rememberAndClearSelection();
  };

  const focusAi3dMode = () => {
    setAiMode("3d");
    setAiInspectorMode("entity");
    rememberAndClearSelection();
  };

  const focusTextureMode = () => {
    const rememberedTarget = resolveTextureTarget(lastAiClearedEntityId);
    const currentTarget = resolveTextureTarget(app?.getSelectedEntityId() ?? selectedEntityId);
    const nextTarget = rememberedTarget ?? currentTarget;

    setAiMode("texture");
    setAiInspectorMode("entity");
    setAiTextureState({
      target: nextTarget,
      errorMessage: null
    });

    if (nextTarget?.kind === "mesh" && nextTarget.id) {
      app?.setSelectedEntity(nextTarget.id);
      return;
    }

    if (nextTarget?.kind === "ground") {
      app?.setSelectedEntity(GROUND_HELPER_NODE_ID);
      return;
    }

    app?.setSelectedEntity(null);
  };

  const focusPanoramaMode = () => {
    setAiMode("panorama");
    setAiInspectorMode("entity");
    app?.setSelectedEntity(SCENE_NODE_ID);
  };

  const handleModeChange = (mode: AiMode) => {
    if (mode === "image") {
      focusAiMode();
      return;
    }

    if (mode === "texture") {
      focusTextureMode();
      return;
    }

    if (mode === "panorama") {
      focusPanoramaMode();
      return;
    }

    focusAi3dMode();
  };

  const activePrompt =
    aiMode === "image"
      ? imagePrompt
      : aiMode === "texture"
        ? aiTexturePrompt
        : aiMode === "panorama"
          ? aiPanoramaPrompt
          : ai3dPrompt;

  const {
    activePromptAction,
    isPromptActionPending,
    handlePromptTransform
  } = usePromptTransform({
    aiMode,
    prompt: imagePrompt,
    aiTexturePrompt,
    aiPanoramaPrompt,
    ai3dPrompt,
    isImageBusy: imageIsGenerating,
    isTextureBusy: aiTextureIsGenerating,
    isPanoramaBusy: aiPanoramaIsGenerating,
    isAi3dBusy: ai3dIsGenerating || ai3dIsOptimizing,
    setAiPrompt,
    setAiTexturePrompt,
    setAiTextureState,
    setAiPanoramaPrompt,
    setAiPanoramaState,
    setAi3dPrompt,
    setAiGeneratingState,
    setAi3dState,
    t
  });

  const { handleSubmit } = useAiImageComposer({
    model: imageModel,
    prompt: imagePrompt,
    seed: imageSeed,
    imageSize,
    cfg: imageCfg,
    inferenceSteps: imageInferenceSteps,
    referenceImages: imageReferenceImages,
    isGenerating: imageIsGenerating,
    isPromptActionPending,
    appendPendingAiGeneration,
    setAiGeneratingState,
    t
  });

  const { handleTextureSubmit } = useAiPbrTextureComposer({
    app,
    prompt: aiTexturePrompt,
    target: aiTextureTarget,
    isGenerating: aiTextureIsGenerating,
    isPromptActionPending,
    appendPendingAiGeneration,
    setAiTextureState,
    t
  });

  const { handlePanoramaSubmit } = useAiPanoramaComposer({
    app,
    prompt: aiPanoramaPrompt,
    isGenerating: aiPanoramaIsGenerating,
    isPromptActionPending,
    appendPendingAiGeneration,
    registerLocalProjectAsset,
    setAiPanoramaState,
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

      if (aiMode === "texture") {
        void handleTextureSubmit();
        return;
      }

      if (aiMode === "panorama") {
        void handlePanoramaSubmit();
        return;
      }

      void handleAi3dSubmit();
    }
  };

  if (!isComposerOpen) {
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
              value={activePrompt}
              placeholder={
                aiMode === "image"
                  ? t("editor.ai.promptPlaceholder")
                  : aiMode === "texture"
                    ? t("editor.aiPbr.promptPlaceholder")
                    : aiMode === "panorama"
                      ? t("editor.aiPanorama.promptPlaceholder")
                      : t("editor.ai3d.promptPlaceholder")
              }
              theme={theme}
              onFocus={
                aiMode === "image"
                  ? focusAiMode
                  : aiMode === "texture"
                    ? focusTextureMode
                    : aiMode === "panorama"
                      ? focusPanoramaMode
                      : focusAi3dMode
              }
              onChange={(value) => {
                if (aiMode === "image") {
                  setAiPrompt(value);
                  return;
                }
                if (aiMode === "texture") {
                  setAiTexturePrompt(value);
                  return;
                }
                if (aiMode === "panorama") {
                  setAiPanoramaPrompt(value);
                  return;
                }
                setAi3dPrompt(value);
              }}
              onKeyDown={handlePromptKeyDown}
            />

            {aiMode === "3d" ? (
              <Ai3dIntentControls
                theme={theme}
                value={ai3dIntentDraft}
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
                  onChange={handleModeChange}
                />
              </Stack>

              {aiMode === "image" ? (
                <ImageToolbar
                  model={imageModel}
                  theme={theme}
                  utilityIconButtonSx={utilityIconButtonSx}
                  isGenerating={imageIsGenerating}
                  isPromptActionPending={isPromptActionPending}
                  prompt={imagePrompt}
                  activePromptAction={activePromptAction}
                  setAiModel={setAiModel}
                  focusAiMode={focusAiMode}
                  handlePromptTransform={handlePromptTransform}
                  t={t}
                />
              ) : aiMode === "texture" ? (
                <Ai3dToolbar
                  theme={theme}
                  utilityIconButtonSx={utilityIconButtonSx}
                  isAi3dBusy={aiTextureIsGenerating}
                  isPromptActionPending={isPromptActionPending}
                  prompt={aiTexturePrompt}
                  isGenerating={aiTextureIsGenerating}
                  isOptimizing={false}
                  canOptimizePrompt
                  activePromptAction={activePromptAction}
                  handlePromptTransform={handlePromptTransform}
                  t={t}
                />
              ) : aiMode === "panorama" ? (
                <Ai3dToolbar
                  theme={theme}
                  utilityIconButtonSx={utilityIconButtonSx}
                  isAi3dBusy={aiPanoramaIsGenerating}
                  isPromptActionPending={isPromptActionPending}
                  prompt={aiPanoramaPrompt}
                  isGenerating={aiPanoramaIsGenerating}
                  isOptimizing={false}
                  canOptimizePrompt
                  activePromptAction={activePromptAction}
                  handlePromptTransform={handlePromptTransform}
                  t={t}
                />
              ) : (
                <Ai3dToolbar
                  theme={theme}
                  utilityIconButtonSx={utilityIconButtonSx}
                  isAi3dBusy={isAi3dBusy}
                  isPromptActionPending={isPromptActionPending}
                  prompt={ai3dPrompt}
                  isGenerating={ai3dIsGenerating}
                  isOptimizing={ai3dIsOptimizing}
                  activePromptAction={activePromptAction}
                  handlePromptTransform={handlePromptTransform}
                  t={t}
                />
              )}

              <IconButton
                size="small"
                disabled={
                  aiMode === "image"
                    ? imageIsGenerating || isPromptActionPending || !imagePrompt.trim()
                    : aiMode === "texture"
                      ? aiTextureIsGenerating || isPromptActionPending || !aiTexturePrompt.trim()
                      : aiMode === "panorama"
                        ? aiPanoramaIsGenerating || isPromptActionPending || !aiPanoramaPrompt.trim()
                      : isAi3dBusy || !ai3dPrompt.trim()
                }
                onClick={() => {
                  if (aiMode === "image") {
                    void handleSubmit();
                    return;
                  }
                  if (aiMode === "texture") {
                    void handleTextureSubmit();
                    return;
                  }
                  if (aiMode === "panorama") {
                    void handlePanoramaSubmit();
                    return;
                  }
                  void handleAi3dSubmit();
                }}
                sx={{
                  color: theme.pillText,
                  transform: "rotate(-90deg)",
                  background:
                    (aiMode === "image"
                      ? imagePrompt.trim() && !imageIsGenerating && !isPromptActionPending
                      : aiMode === "texture"
                        ? activePrompt.trim() && !aiTextureIsGenerating && !isPromptActionPending
                        : aiMode === "panorama"
                          ? activePrompt.trim() && !aiPanoramaIsGenerating && !isPromptActionPending
                      : ai3dPrompt.trim() && !isAi3dBusy)
                      ? editorThemeMode === "dark"
                        ? "linear-gradient(135deg, #2f6df4, #63a4ff)"
                        : "linear-gradient(135deg, #4c86f7, #86b7ff)"
                      : theme.itemBg,
                  border: theme.sectionBorder
                }}
              >
                {(aiMode === "image"
                  ? imageIsGenerating
                  : aiMode === "texture"
                    ? aiTextureIsGenerating
                    : aiMode === "panorama"
                      ? aiPanoramaIsGenerating
                    : isAi3dBusy) ? (
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
                previewVariant={ai3dPreviewVariant}
                primitiveCountText={t("editor.ai3d.primitiveCount", { count: ai3dCreateCount })}
                canShowOriginal={canShowOriginal}
                canShowOptimized={canShowOptimized}
                isAi3dBusy={isAi3dBusy}
                isOptimizing={ai3dIsOptimizing}
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
        open={isAi3dErrorToastOpen && Boolean(ai3dErrorMessage)}
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
          {ai3dErrorMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={isAi3dErrorToastOpen && Boolean(aiPanoramaErrorMessage)}
        autoHideDuration={4000}
        onClose={() => setIsAi3dErrorToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          onClose={() => setIsAi3dErrorToastOpen(false)}
          sx={{ fontSize: 12 }}
        >
          {aiPanoramaErrorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
