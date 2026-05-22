"use client";

import { useRef, useState } from "react";
import { transformAiPrompt } from "@/frontend/api/ai";
import { getApiErrorMessage } from "@/lib/http/axios";
import type { AiMode } from "@/stores/editorStore";

type Params = {
  aiMode: AiMode;
  prompt: string;
  aiTexturePrompt: string;
  aiPanoramaPrompt: string;
  aiAssetRecommendationPrompt: string;
  ai3dPrompt: string;
  isImageBusy: boolean;
  isTextureBusy: boolean;
  isPanoramaBusy: boolean;
  isAssetRecommendationBusy: boolean;
  isAi3dBusy: boolean;
  setAiPrompt: (prompt: string) => void;
  setAiTexturePrompt: (prompt: string) => void;
  setAiTextureState: (payload: {
    errorMessage?: string | null;
  }) => void;
  setAiPanoramaPrompt: (prompt: string) => void;
  setAiPanoramaState: (payload: {
    errorMessage?: string | null;
  }) => void;
  setAiAssetRecommendationPrompt: (prompt: string) => void;
  setAiAssetRecommendationState: (payload: {
    errorMessage?: string | null;
  }) => void;
  setAi3dPrompt: (prompt: string) => void;
  setAiGeneratingState: (payload: {
    isGenerating: boolean;
    errorMessage?: string | null;
  }) => void;
  setAi3dState: (payload: {
    errorMessage?: string | null;
  }) => void;
  t: (key: any, params?: Record<string, string | number>) => string;
};

function getPromptTransformTarget(aiMode: AiMode) {
  if (aiMode === "texture") {
    return "texture";
  }

  if (aiMode === "panorama") {
    return "panorama";
  }

  return "image";
}

export function usePromptTransform({
  aiMode,
  prompt,
  aiTexturePrompt,
  aiPanoramaPrompt,
  aiAssetRecommendationPrompt,
  ai3dPrompt,
  isImageBusy,
  isTextureBusy,
  isPanoramaBusy,
  isAssetRecommendationBusy,
  isAi3dBusy,
  setAiPrompt,
  setAiTexturePrompt,
  setAiTextureState,
  setAiPanoramaPrompt,
  setAiPanoramaState,
  setAiAssetRecommendationPrompt,
  setAiAssetRecommendationState,
  setAi3dPrompt,
  setAiGeneratingState,
  setAi3dState,
  t
}: Params) {
  const [activePromptAction, setActivePromptAction] = useState<"optimize" | "translate-en" | null>(
    null
  );
  const promptActionLockRef = useRef(false);
  const isPromptActionPending = activePromptAction !== null;

  const handlePromptTransform = async (mode: "optimize" | "translate-en") => {
    const sourcePrompt =
      aiMode === "image"
        ? prompt
        : aiMode === "texture"
          ? aiTexturePrompt
          : aiMode === "panorama"
            ? aiPanoramaPrompt
            : aiMode === "assets"
              ? aiAssetRecommendationPrompt
            : ai3dPrompt;
    const trimmedPrompt = sourcePrompt.trim();
    const isBusy =
      aiMode === "image"
        ? isImageBusy
        : aiMode === "texture"
          ? isTextureBusy
          : aiMode === "panorama"
            ? isPanoramaBusy
            : aiMode === "assets"
              ? isAssetRecommendationBusy
            : isAi3dBusy;
    if (!trimmedPrompt || isBusy || isPromptActionPending || promptActionLockRef.current) {
      return;
    }

    promptActionLockRef.current = true;
    setActivePromptAction(mode);
    if (aiMode === "image") {
      setAiGeneratingState({
        isGenerating: false,
        errorMessage: null
      });
    } else if (aiMode === "texture") {
      setAiTextureState({
        errorMessage: null
      });
    } else if (aiMode === "panorama") {
      setAiPanoramaState({
        errorMessage: null
      });
    } else if (aiMode === "assets") {
      setAiAssetRecommendationState({
        errorMessage: null
      });
    } else {
      setAi3dState({
        errorMessage: null
      });
    }

    try {
      const payload = await transformAiPrompt({
        mode,
        prompt: trimmedPrompt,
        target: getPromptTransformTarget(aiMode)
      });
      const nextPrompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";

      if (!nextPrompt) {
        throw new Error(t("editor.ai.promptTransformEmpty"));
      }

      if (aiMode === "image") {
        setAiPrompt(nextPrompt);
      } else if (aiMode === "texture") {
        setAiTexturePrompt(nextPrompt);
      } else if (aiMode === "panorama") {
        setAiPanoramaPrompt(nextPrompt);
      } else if (aiMode === "assets") {
        setAiAssetRecommendationPrompt(nextPrompt);
      } else {
        setAi3dPrompt(nextPrompt);
      }
    } catch (error) {
      if (aiMode === "image") {
        setAiGeneratingState({
          isGenerating: false,
          errorMessage: getApiErrorMessage(error, t("editor.ai.promptTransformFailed"))
        });
      } else if (aiMode === "texture") {
        setAiTextureState({
          errorMessage: getApiErrorMessage(error, t("editor.ai.promptTransformFailed"))
        });
      } else if (aiMode === "panorama") {
        setAiPanoramaState({
          errorMessage: getApiErrorMessage(error, t("editor.ai.promptTransformFailed"))
        });
      } else if (aiMode === "assets") {
        setAiAssetRecommendationState({
          errorMessage: getApiErrorMessage(error, t("editor.ai.promptTransformFailed"))
        });
      } else {
        setAi3dState({
          errorMessage: getApiErrorMessage(error, t("editor.ai.promptTransformFailed"))
        });
      }
    } finally {
      promptActionLockRef.current = false;
      setActivePromptAction(null);
    }
  };

  return {
    activePromptAction,
    isPromptActionPending,
    handlePromptTransform
  };
}
