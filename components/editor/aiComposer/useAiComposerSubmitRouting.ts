"use client";

import type { AiMode, AiAssetRecommendationSettings } from "@/stores/editorStore";

type UseAiComposerSubmitRoutingOptions = {
  ai3dPrompt: string;
  aiAssetRecommendations: AiAssetRecommendationSettings;
  aiMode: AiMode;
  aiPanoramaIsGenerating: boolean;
  aiPanoramaPrompt: string;
  aiTextureIsGenerating: boolean;
  aiTexturePrompt: string;
  handleAi3dSubmit: () => void | Promise<void>;
  handleAssetRecommendationSubmit: () => void | Promise<void>;
  handlePanoramaSubmit: () => void | Promise<void>;
  handleSubmit: () => void | Promise<void>;
  handleTextureSubmit: () => void | Promise<void>;
  imageIsGenerating: boolean;
  imagePrompt: string;
  isAi3dBusy: boolean;
  isPolyhavenEnabled: boolean;
  isPromptActionPending: boolean;
};

export function useAiComposerSubmitRouting({
  ai3dPrompt,
  aiAssetRecommendations,
  aiMode,
  aiPanoramaIsGenerating,
  aiPanoramaPrompt,
  aiTextureIsGenerating,
  aiTexturePrompt,
  handleAi3dSubmit,
  handleAssetRecommendationSubmit,
  handlePanoramaSubmit,
  handleSubmit,
  handleTextureSubmit,
  imageIsGenerating,
  imagePrompt,
  isAi3dBusy,
  isPolyhavenEnabled,
  isPromptActionPending
}: UseAiComposerSubmitRoutingOptions) {
  const handleSubmitActive = () => {
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

    if (aiMode === "assets") {
      if (isPolyhavenEnabled) {
        void handleAssetRecommendationSubmit();
      }
      return;
    }

    void handleAi3dSubmit();
  };

  const isSubmitDisabled =
    aiMode === "image"
      ? imageIsGenerating || isPromptActionPending || !imagePrompt.trim()
      : aiMode === "texture"
        ? aiTextureIsGenerating || isPromptActionPending || !aiTexturePrompt.trim()
        : aiMode === "panorama"
          ? aiPanoramaIsGenerating || isPromptActionPending || !aiPanoramaPrompt.trim()
          : aiMode === "assets"
            ? aiAssetRecommendations.isGenerating ||
              aiAssetRecommendations.isApplying ||
              !isPolyhavenEnabled ||
              isPromptActionPending ||
              !aiAssetRecommendations.prompt.trim()
            : isAi3dBusy || !ai3dPrompt.trim();

  const isSubmitLoading =
    aiMode === "image"
      ? imageIsGenerating
      : aiMode === "texture"
        ? aiTextureIsGenerating
        : aiMode === "panorama"
          ? aiPanoramaIsGenerating
          : aiMode === "assets"
            ? aiAssetRecommendations.isGenerating || aiAssetRecommendations.isApplying
            : isAi3dBusy;

  const isSubmitHighlighted =
    aiMode === "image"
      ? imagePrompt.trim() && !imageIsGenerating && !isPromptActionPending
      : aiMode === "texture"
        ? aiTexturePrompt.trim() && !aiTextureIsGenerating && !isPromptActionPending
        : aiMode === "panorama"
          ? aiPanoramaPrompt.trim() && !aiPanoramaIsGenerating && !isPromptActionPending
          : aiMode === "assets"
            ? aiAssetRecommendations.prompt.trim() &&
              !aiAssetRecommendations.isGenerating &&
              !aiAssetRecommendations.isApplying &&
              isPolyhavenEnabled &&
              !isPromptActionPending
            : ai3dPrompt.trim() && !isAi3dBusy;

  return {
    handleSubmitActive,
    isSubmitDisabled,
    isSubmitLoading,
    isSubmitHighlighted
  };
}
