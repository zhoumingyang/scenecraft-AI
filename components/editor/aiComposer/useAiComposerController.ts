"use client";

import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { isPolyhavenProviderEnabled } from "@/lib/externalAssets/config";
import { useI18n } from "@/lib/i18n";
import { GROUND_HELPER_NODE_ID, SCENE_NODE_ID } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import type { AiMode, AiTextureTarget } from "@/stores/editorStore";
import { useAi3dComposer } from "./useAi3dComposer";
import { useAiAssetRecommendationComposer } from "./useAiAssetRecommendationComposer";
import { useAiImageComposer } from "./useAiImageComposer";
import { useAiPanoramaComposer } from "./useAiPanoramaComposer";
import { useAiPbrTextureComposer } from "./useAiPbrTextureComposer";
import { usePromptTransform } from "./usePromptTransform";

export function useAiComposerController() {
  const { t } = useI18n();
  const [isErrorToastOpen, setIsErrorToastOpen] = useState(false);
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

  useEffect(() => {
    if (!ai3dErrorMessage && !aiPanoramaErrorMessage) return;
    setIsErrorToastOpen(true);
  }, [ai3dErrorMessage, aiPanoramaErrorMessage]);

  useEffect(() => {
    if (isStudioSceneActive && isComposerOpen) {
      setAiComposerOpen(false);
    }
  }, [isComposerOpen, isStudioSceneActive, setAiComposerOpen]);

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

  const focusAssetsMode = () => {
    setAiMode("assets");
    setAiInspectorMode("entity");
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

    if (mode === "assets") {
      focusAssetsMode();
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
          : aiMode === "assets"
            ? aiAssetRecommendations.prompt
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
        ? activePrompt.trim() && !aiTextureIsGenerating && !isPromptActionPending
        : aiMode === "panorama"
          ? activePrompt.trim() && !aiPanoramaIsGenerating && !isPromptActionPending
          : aiMode === "assets"
            ? activePrompt.trim() &&
              !aiAssetRecommendations.isGenerating &&
              !aiAssetRecommendations.isApplying &&
              isPolyhavenEnabled &&
              !isPromptActionPending
            : ai3dPrompt.trim() && !isAi3dBusy;

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSubmitActive();
    }
  };

  return {
    activePlaceholder,
    activePrompt,
    activePromptAction,
    ai3dCreateCount,
    ai3dErrorMessage,
    ai3dIntentDraft,
    ai3dIsGenerating,
    ai3dIsOptimizing,
    ai3dPreviewVariant,
    ai3dPrompt,
    aiAssetRecommendations,
    aiMode,
    aiPanoramaErrorMessage,
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
    isComposerOpen,
    isErrorToastOpen,
    isPolyhavenEnabled,
    isPromptActionPending,
    isStudioSceneActive,
    isSubmitDisabled,
    isSubmitHighlighted,
    isSubmitLoading,
    isAi3dBusy,
    setAiAssetRecommendationItemSelected,
    setAiComposerOpen,
    setAi3dIntentDraft,
    setAiModel,
    setIsErrorToastOpen,
    t,
    theme,
    utilityIconButtonSx
  };
}

export type AiComposerController = ReturnType<typeof useAiComposerController>;
