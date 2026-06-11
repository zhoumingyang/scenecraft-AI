import type { KeyboardEvent } from "react";
import type { AiExternalAssetRecommendationBundle } from "@/lib/api/contracts/ai";
import type { useI18n } from "@/lib/i18n";
import type { AiMode } from "@/stores/editorStore";
import type { AiComposerStoreState } from "./useAiComposerStoreState";

type AiComposerViewModelState = AiComposerStoreState & {
  t: ReturnType<typeof useI18n>["t"];
};

type CreateAiComposerViewModelInput = {
  state: AiComposerViewModelState;
  activePlaceholder: string;
  activePrompt: string;
  activePromptAction: "optimize" | "translate-en" | null;
  ai3dCreateCount: number;
  canShowOptimized: boolean;
  canShowOriginal: boolean;
  focusAiMode: () => void;
  handleAi3dApply: () => Promise<void>;
  handleAi3dDiscard: () => void;
  handleAi3dOptimize: () => Promise<void>;
  handleAi3dShowOptimized: () => void;
  handleAi3dShowOriginal: () => void;
  handleAssetRecommendationApply: (bundle: AiExternalAssetRecommendationBundle) => Promise<void>;
  handleModeChange: (value: AiMode) => void;
  handlePromptChange: (value: string) => void;
  handlePromptFocus: () => void;
  handlePromptKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handlePromptTransform: (action: "translate-en" | "optimize") => Promise<void>;
  handleSubmitActive: () => void;
  hasAi3dPreview: boolean;
  isAi3dBusy: boolean;
  isErrorToastOpen: boolean;
  isPromptActionPending: boolean;
  isSubmitDisabled: boolean;
  isSubmitHighlighted: boolean;
  isSubmitLoading: boolean;
  setIsErrorToastOpen: (open: boolean) => void;
  utilityIconButtonSx: Record<string, unknown>;
};

export function createAiComposerViewModel({
  state,
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
}: CreateAiComposerViewModelInput) {
  return {
    activePlaceholder,
    activePrompt,
    activePromptAction,
    ai3dCreateCount,
    ai3dErrorMessage: state.ai3dErrorMessage,
    ai3dIntentDraft: state.ai3dIntentDraft,
    ai3dIsGenerating: state.ai3dIsGenerating,
    ai3dIsOptimizing: state.ai3dIsOptimizing,
    ai3dPreviewVariant: state.ai3dPreviewVariant,
    ai3dPrompt: state.ai3dPrompt,
    aiAssetRecommendations: state.aiAssetRecommendations,
    aiMode: state.aiMode,
    aiPanoramaErrorMessage: state.aiPanoramaErrorMessage,
    aiPanoramaIsGenerating: state.aiPanoramaIsGenerating,
    aiPanoramaPrompt: state.aiPanoramaPrompt,
    aiTextureIsGenerating: state.aiTextureIsGenerating,
    aiTexturePrompt: state.aiTexturePrompt,
    canShowOptimized,
    canShowOriginal,
    editorThemeMode: state.editorThemeMode,
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
    imageIsGenerating: state.imageIsGenerating,
    imageModel: state.imageModel,
    imagePrompt: state.imagePrompt,
    isComposerOpen: state.isComposerOpen,
    isErrorToastOpen,
    isPolyhavenEnabled: state.isPolyhavenEnabled,
    isPromptActionPending,
    isStudioSceneActive: state.isStudioSceneActive,
    isSubmitDisabled,
    isSubmitHighlighted,
    isSubmitLoading,
    isAi3dBusy,
    setAiAssetRecommendationItemSelected: state.setAiAssetRecommendationItemSelected,
    setAiComposerOpen: state.setAiComposerOpen,
    setAi3dIntentDraft: state.setAi3dIntentDraft,
    setAiModel: state.setAiModel,
    setIsErrorToastOpen,
    t: state.t,
    theme: state.theme,
    utilityIconButtonSx
  };
}
