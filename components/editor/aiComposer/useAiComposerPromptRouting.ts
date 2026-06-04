"use client";

import type { KeyboardEvent } from "react";
import type { useI18n } from "@/lib/i18n";
import type { AiMode, EditorStoreState } from "@/stores/editorStore";

type UseAiComposerPromptRoutingOptions = {
  ai3dPrompt: string;
  aiAssetRecommendationPrompt: string;
  aiMode: AiMode;
  aiPanoramaPrompt: string;
  aiTexturePrompt: string;
  focusAi3dMode: () => void;
  focusAiMode: () => void;
  focusAssetsMode: () => void;
  focusPanoramaMode: () => void;
  focusTextureMode: () => void;
  handleSubmitActive: () => void;
  imagePrompt: string;
  setAi3dPrompt: EditorStoreState["setAi3dPrompt"];
  setAiAssetRecommendationPrompt: EditorStoreState["setAiAssetRecommendationPrompt"];
  setAiPanoramaPrompt: EditorStoreState["setAiPanoramaPrompt"];
  setAiPrompt: EditorStoreState["setAiPrompt"];
  setAiTexturePrompt: EditorStoreState["setAiTexturePrompt"];
  t: ReturnType<typeof useI18n>["t"];
};

export function useAiComposerPromptRouting({
  ai3dPrompt,
  aiAssetRecommendationPrompt,
  aiMode,
  aiPanoramaPrompt,
  aiTexturePrompt,
  focusAi3dMode,
  focusAiMode,
  focusAssetsMode,
  focusPanoramaMode,
  focusTextureMode,
  handleSubmitActive,
  imagePrompt,
  setAi3dPrompt,
  setAiAssetRecommendationPrompt,
  setAiPanoramaPrompt,
  setAiPrompt,
  setAiTexturePrompt,
  t
}: UseAiComposerPromptRoutingOptions) {
  const activePrompt =
    aiMode === "image"
      ? imagePrompt
      : aiMode === "texture"
        ? aiTexturePrompt
        : aiMode === "panorama"
          ? aiPanoramaPrompt
          : aiMode === "assets"
            ? aiAssetRecommendationPrompt
            : ai3dPrompt;

  const activePlaceholder =
    aiMode === "image"
      ? t("editor.ai.promptPlaceholder")
      : aiMode === "texture"
        ? t("editor.aiPbr.promptPlaceholder")
        : aiMode === "panorama"
          ? t("editor.aiPanorama.promptPlaceholder")
          : aiMode === "assets"
            ? t("editor.aiAssets.promptPlaceholder")
            : t("editor.ai3d.promptPlaceholder");

  const handlePromptChange = (value: string) => {
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

    if (aiMode === "assets") {
      setAiAssetRecommendationPrompt(value);
      return;
    }

    setAi3dPrompt(value);
  };

  const handlePromptFocus = () => {
    if (aiMode === "image") {
      focusAiMode();
      return;
    }

    if (aiMode === "texture") {
      focusTextureMode();
      return;
    }

    if (aiMode === "panorama") {
      focusPanoramaMode();
      return;
    }

    if (aiMode === "assets") {
      focusAssetsMode();
      return;
    }

    focusAi3dMode();
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSubmitActive();
    }
  };

  return {
    activePrompt,
    activePlaceholder,
    handlePromptChange,
    handlePromptFocus,
    handlePromptKeyDown
  };
}
