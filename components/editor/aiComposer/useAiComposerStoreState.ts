"use client";

import { useMemo } from "react";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { isPolyhavenProviderEnabled } from "@/lib/externalAssets/config";
import { useEditorStore } from "@/stores/editorStore";

export function useAiComposerStoreState() {
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const aiMode = useEditorStore((state) => state.aiMode);
  const isStudioSceneActive = useEditorStore((state) => state.studioScene.active);
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
  const aiAssetRecommendations = useEditorStore((state) => state.aiAssetRecommendations);
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
  const setAiAssetRecommendationPrompt = useEditorStore(
    (state) => state.setAiAssetRecommendationPrompt
  );
  const setAiAssetRecommendationState = useEditorStore(
    (state) => state.setAiAssetRecommendationState
  );
  const setAiAssetRecommendationItemSelected = useEditorStore(
    (state) => state.setAiAssetRecommendationItemSelected
  );
  const setAi3dPrompt = useEditorStore((state) => state.setAi3dPrompt);
  const setAi3dIntentDraft = useEditorStore((state) => state.setAi3dIntentDraft);
  const setAi3dState = useEditorStore((state) => state.setAi3dState);
  const setAiGeneratingState = useEditorStore((state) => state.setAiGeneratingState);
  const appendPendingAiAsset = useEditorStore((state) => state.appendPendingAiAsset);
  const registerLocalProjectAsset = useEditorStore((state) => state.registerLocalProjectAsset);
  const theme = getEditorThemeTokens(editorThemeMode);
  const isPolyhavenEnabled = isPolyhavenProviderEnabled();
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

  return {
    app,
    editorThemeMode,
    aiMode,
    isStudioSceneActive,
    selectedEntityId,
    lastAiClearedEntityId,
    imagePrompt,
    imageModel,
    imageSeed,
    imageSize,
    imageCfg,
    imageInferenceSteps,
    imageReferenceImages,
    imageIsGenerating,
    isComposerOpen,
    aiTexturePrompt,
    aiTextureIsGenerating,
    aiTextureTarget,
    aiPanoramaPrompt,
    aiPanoramaIsGenerating,
    aiPanoramaErrorMessage,
    aiAssetRecommendations,
    ai3dPrompt,
    ai3dIntentDraft,
    ai3dIsGenerating,
    ai3dIsOptimizing,
    ai3dErrorMessage,
    ai3dPreviewVariant,
    setAiMode,
    setAiPrompt,
    setAiModel,
    setAiComposerOpen,
    setAiInspectorMode,
    setLastAiClearedEntityId,
    setAiTexturePrompt,
    setAiTextureState,
    setAiPanoramaPrompt,
    setAiPanoramaState,
    setAiAssetRecommendationPrompt,
    setAiAssetRecommendationState,
    setAiAssetRecommendationItemSelected,
    setAi3dPrompt,
    setAi3dIntentDraft,
    setAi3dState,
    setAiGeneratingState,
    appendPendingAiAsset,
    registerLocalProjectAsset,
    theme,
    isPolyhavenEnabled,
    ai3d
  };
}

export type AiComposerStoreState = ReturnType<typeof useAiComposerStoreState>;
