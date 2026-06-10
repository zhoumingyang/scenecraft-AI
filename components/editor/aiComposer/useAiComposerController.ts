"use client";

import { useI18n } from "@/lib/i18n";
import { createAiComposerViewModel } from "./createAiComposerViewModel";
import { useAi3dComposer } from "./useAi3dComposer";
import { useAiAssetRecommendationComposer } from "./useAiAssetRecommendationComposer";
import { useAiComposerLifecycle } from "./useAiComposerLifecycle";
import { useAiComposerModeNavigation } from "./useAiComposerModeNavigation";
import { useAiComposerPromptRouting } from "./useAiComposerPromptRouting";
import { useAiComposerUiState } from "./useAiComposerUiState";
import { useAiComposerStoreState } from "./useAiComposerStoreState";
import { useAiComposerSubmitRouting } from "./useAiComposerSubmitRouting";
import { useAiImageComposer } from "./useAiImageComposer";
import { useAiPanoramaComposer } from "./useAiPanoramaComposer";
import { useAiPbrTextureComposer } from "./useAiPbrTextureComposer";
import { usePromptTransform } from "./usePromptTransform";

export function useAiComposerController() {
  const { t } = useI18n();
  const state = useAiComposerStoreState();
  const { isErrorToastOpen, setIsErrorToastOpen, utilityIconButtonSx } =
    useAiComposerUiState({
      theme: state.theme
    });
  const {
    app,
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
    ai3dIsGenerating,
    ai3dIsOptimizing,
    ai3dErrorMessage,
    setAiMode,
    setAiPrompt,
    setAiComposerOpen,
    setAiInspectorMode,
    setLastAiClearedEntityId,
    setAiTexturePrompt,
    setAiTextureState,
    setAiPanoramaPrompt,
    setAiPanoramaState,
    setAiAssetRecommendationPrompt,
    setAiAssetRecommendationState,
    setAi3dPrompt,
    setAi3dState,
    setAiGeneratingState,
    appendPendingAiAsset,
    registerLocalProjectAsset,
    isPolyhavenEnabled,
    ai3d
  } = state;

  useAiComposerLifecycle({
    ai3dErrorMessage,
    aiPanoramaErrorMessage,
    isComposerOpen,
    isStudioSceneActive,
    setAiComposerOpen,
    setIsErrorToastOpen
  });

  const {
    focusAiMode,
    focusAi3dMode,
    focusTextureMode,
    focusPanoramaMode,
    focusAssetsMode,
    handleModeChange
  } = useAiComposerModeNavigation({
    app,
    lastAiClearedEntityId,
    selectedEntityId,
    setAiInspectorMode,
    setAiMode,
    setAiTextureState,
    setLastAiClearedEntityId,
    t
  });

  const {
    activePromptAction,
    isPromptActionPending,
    handlePromptTransform
  } = usePromptTransform({
    aiMode,
    prompt: imagePrompt,
    aiTexturePrompt,
    aiPanoramaPrompt,
    aiAssetRecommendationPrompt: aiAssetRecommendations.prompt,
    ai3dPrompt,
    isImageBusy: imageIsGenerating,
    isTextureBusy: aiTextureIsGenerating,
    isPanoramaBusy: aiPanoramaIsGenerating,
    isAssetRecommendationBusy:
      aiAssetRecommendations.isGenerating || aiAssetRecommendations.isApplying,
    isAi3dBusy: ai3dIsGenerating || ai3dIsOptimizing,
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
    appendPendingAiAsset,
    setAiGeneratingState,
    t
  });

  const { handleTextureSubmit } = useAiPbrTextureComposer({
    app,
    prompt: aiTexturePrompt,
    target: aiTextureTarget,
    isGenerating: aiTextureIsGenerating,
    isPromptActionPending,
    appendPendingAiAsset,
    setAiTextureState,
    t
  });

  const { handlePanoramaSubmit } = useAiPanoramaComposer({
    app,
    prompt: aiPanoramaPrompt,
    isGenerating: aiPanoramaIsGenerating,
    isPromptActionPending,
    appendPendingAiAsset,
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

  const { handleAssetRecommendationSubmit, handleAssetRecommendationApply } =
    useAiAssetRecommendationComposer({
      app,
      aiAssetRecommendations,
      isPromptActionPending,
      setAiAssetRecommendationState,
      t
    });

  const {
    handleSubmitActive,
    isSubmitDisabled,
    isSubmitLoading,
    isSubmitHighlighted
  } = useAiComposerSubmitRouting({
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
  });

  const {
    activePrompt,
    activePlaceholder,
    handlePromptChange,
    handlePromptFocus,
    handlePromptKeyDown
  } = useAiComposerPromptRouting({
    ai3dPrompt,
    aiAssetRecommendationPrompt: aiAssetRecommendations.prompt,
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
  });

  return createAiComposerViewModel({
    state: {
      ...state,
      t
    },
    activePlaceholder,
    activePrompt,
    activePromptAction,
    ai3dCreateCount,
    canShowOptimized,
    canShowOriginal,
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
    isAi3dBusy,
    isErrorToastOpen,
    isPromptActionPending,
    isSubmitDisabled,
    isSubmitHighlighted,
    isSubmitLoading,
    setIsErrorToastOpen,
    utilityIconButtonSx
  });
}

export type AiComposerController = ReturnType<typeof useAiComposerController>;
