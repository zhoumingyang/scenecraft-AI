"use client";

import { Box, CircularProgress, IconButton, Paper, Stack } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import PromptInput from "@/components/editor/aiComposer/promptInput";
import ModeToggle from "@/components/editor/aiComposer/modeToggle";
import ImageToolbar from "@/components/editor/aiComposer/imageToolbar";
import Ai3dToolbar from "@/components/editor/aiComposer/ai3dToolbar";
import Ai3dIntentControls from "@/components/editor/aiComposer/ai3dIntentControls";
import Ai3dPreviewActions from "@/components/editor/aiComposer/ai3dPreviewActions";
import AssetRecommendationResults from "@/components/editor/aiComposer/assetRecommendationResults";
import type { AiComposerController } from "./useAiComposerController";

type Props = {
  controller: AiComposerController;
};

export default function AiComposerPanel({ controller }: Props) {
  const {
    activePlaceholder,
    activePrompt,
    activePromptAction,
    ai3dCreateCount,
    ai3dIntentDraft,
    ai3dIsGenerating,
    ai3dIsOptimizing,
    ai3dPreviewVariant,
    ai3dPrompt,
    aiAssetRecommendations,
    aiMode,
    aiPanoramaIsGenerating,
    aiPanoramaPrompt,
    aiTextureIsGenerating,
    aiTexturePrompt,
    canShowOptimized,
    canShowOriginal,
    editorThemeMode,
    focusAiMode,
    handleAi3dApply,
    handleAi3dDiscard,
    handleAi3dOptimize,
    handleAi3dShowOptimized,
    handleAi3dShowOriginal,
    handleAssetRecommendationApply,
    handleModeChange,
    handlePromptChange,
    handlePromptFocus,
    handlePromptKeyDown,
    handlePromptTransform,
    handleSubmitActive,
    hasAi3dPreview,
    imageIsGenerating,
    imageModel,
    imagePrompt,
    isAi3dBusy,
    isPolyhavenEnabled,
    isPromptActionPending,
    isSubmitDisabled,
    isSubmitHighlighted,
    isSubmitLoading,
    setAiAssetRecommendationItemSelected,
    setAiComposerOpen,
    setAi3dIntentDraft,
    setAiModel,
    t,
    theme,
    utilityIconButtonSx
  } = controller;

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
              placeholder={activePlaceholder}
              theme={theme}
              onFocus={handlePromptFocus}
              onChange={handlePromptChange}
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
              ) : aiMode === "assets" ? (
                <Ai3dToolbar
                  theme={theme}
                  utilityIconButtonSx={utilityIconButtonSx}
                  isAi3dBusy={
                    aiAssetRecommendations.isGenerating || aiAssetRecommendations.isApplying
                  }
                  isPromptActionPending={isPromptActionPending}
                  prompt={aiAssetRecommendations.prompt}
                  isGenerating={aiAssetRecommendations.isGenerating}
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
                disabled={isSubmitDisabled}
                onClick={handleSubmitActive}
                sx={{
                  color: theme.pillText,
                  transform: "rotate(-90deg)",
                  background: isSubmitHighlighted
                    ? editorThemeMode === "dark"
                      ? "linear-gradient(135deg, #2f6df4, #63a4ff)"
                      : "linear-gradient(135deg, #4c86f7, #86b7ff)"
                    : theme.itemBg,
                  border: theme.sectionBorder
                }}
              >
                {isSubmitLoading ? (
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

            {aiMode === "assets" ? (
              <AssetRecommendationResults
                theme={theme}
                bundles={aiAssetRecommendations.bundles}
                selectedItemIds={aiAssetRecommendations.selectedItemIds}
                isGenerating={aiAssetRecommendations.isGenerating}
                isApplying={aiAssetRecommendations.isApplying}
                errorMessage={
                  isPolyhavenEnabled
                    ? aiAssetRecommendations.errorMessage
                    : t("editor.aiAssets.polyhavenDisabled")
                }
                applyMessage={aiAssetRecommendations.applyMessage}
                onItemSelected={setAiAssetRecommendationItemSelected}
                onApply={handleAssetRecommendationApply}
                t={t}
              />
            ) : null}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
