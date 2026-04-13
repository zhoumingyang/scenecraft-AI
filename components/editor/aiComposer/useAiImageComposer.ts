"use client";

import { useMemo } from "react";
import { generateAiImages } from "@/frontend/api/ai";
import { getImageGenerationModelConfig } from "@/lib/ai/image-generation/models";
import { getApiErrorMessage } from "@/lib/http/axios";
import { parseSeed } from "./utils";

type Params = {
  model: string;
  prompt: string;
  seed: string;
  imageSize: string;
  cfg: number;
  inferenceSteps: number;
  referenceImages: Array<{ dataUrl: string | null }>;
  isGenerating: boolean;
  isPromptActionPending: boolean;
  setAiGeneratingState: (payload: {
    isGenerating: boolean;
    errorMessage?: string | null;
    results?: Array<{ url: string }>;
    lastSeed?: number | null;
  }) => void;
  t: (key: any, params?: Record<string, string | number>) => string;
};

export function useAiImageComposer({
  model,
  prompt,
  seed,
  imageSize,
  cfg,
  inferenceSteps,
  referenceImages,
  isGenerating,
  isPromptActionPending,
  setAiGeneratingState,
  t
}: Params) {
  const filledReferenceImages = useMemo(
    () =>
      referenceImages.filter((item) => Boolean(item.dataUrl)).map((item) => item.dataUrl as string),
    [referenceImages]
  );

  const handleSubmit = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isGenerating || isPromptActionPending) return;

    const parsedSeed = parseSeed(seed);
    const modelConfig = getImageGenerationModelConfig(model as any);

    if (parsedSeed === null) {
      setAiGeneratingState({
        isGenerating: false,
        errorMessage: t("editor.ai.seedInvalid")
      });
      return;
    }

    if (filledReferenceImages.length < modelConfig.minReferenceImages) {
      setAiGeneratingState({
        isGenerating: false,
        errorMessage: t("editor.ai.referenceImageRequired")
      });
      return;
    }

    setAiGeneratingState({
      isGenerating: true,
      errorMessage: null
    });

    try {
      const payload = await generateAiImages({
        model: model as any,
        prompt: trimmedPrompt,
        seed: parsedSeed,
        imageSize: modelConfig.supportsImageSize ? (imageSize as any) : undefined,
        cfg,
        inferenceSteps,
        referenceImages:
          modelConfig.maxReferenceImages > 0
            ? filledReferenceImages.slice(0, modelConfig.maxReferenceImages)
            : []
      });
      const images = payload.images ?? [];

      if (images.length === 0) {
        throw new Error(t("editor.ai.emptyResult"));
      }

      setAiGeneratingState({
        isGenerating: false,
        errorMessage: null,
        results: images,
        lastSeed: typeof payload?.seed === "number" ? payload.seed : null
      });
    } catch (error) {
      setAiGeneratingState({
        isGenerating: false,
        errorMessage: getApiErrorMessage(error, t("editor.ai.generateFailed"))
      });
    }
  };

  return {
    filledReferenceImages,
    handleSubmit
  };
}
