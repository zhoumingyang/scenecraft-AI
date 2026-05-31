import { getImageGenerationModelConfig } from "@/lib/ai/image-generation/models";
import type { EditorStoreSlice, EditorStoreState } from "./editorStore.types";
import {
  createInitialAi3DSettings,
  createInitialAiAssetRecommendationSettings,
  createInitialAiImageSettings,
  createInitialAiPanoramaSettings,
  createInitialAiTextureSettings
} from "./editorStore.initializers";

type EditorAiSlice = Pick<
  EditorStoreState,
  | "aiMode"
  | "lastAiClearedEntityId"
  | "aiImage"
  | "aiTexture"
  | "aiPanorama"
  | "aiAssetRecommendations"
  | "ai3d"
  | "setAiMode"
  | "setLastAiClearedEntityId"
  | "setAiInspectorMode"
  | "setAiComposerOpen"
  | "setAiPrompt"
  | "setAiModel"
  | "setAiSeed"
  | "setAiImageSize"
  | "setAiCfg"
  | "setAiInferenceSteps"
  | "setAiReferenceImageAt"
  | "clearAiReferenceImageAt"
  | "setAiTexturePrompt"
  | "setAiTextureState"
  | "setAiPanoramaPrompt"
  | "setAiPanoramaState"
  | "setAiAssetRecommendationPrompt"
  | "setAiAssetRecommendationState"
  | "setAiAssetRecommendationItemSelected"
  | "setAi3dPrompt"
  | "setAi3dIntentDraft"
  | "setAi3dState"
  | "setAiGeneratingState"
>;

export const createAiSlice: EditorStoreSlice<EditorAiSlice> = (set) => ({
  aiMode: "image",
  lastAiClearedEntityId: null,
  aiImage: createInitialAiImageSettings(),
  aiTexture: createInitialAiTextureSettings(),
  aiPanorama: createInitialAiPanoramaSettings(),
  aiAssetRecommendations: createInitialAiAssetRecommendationSettings(),
  ai3d: createInitialAi3DSettings(),
  setAiMode: (aiMode) => set({ aiMode }),
  setLastAiClearedEntityId: (lastAiClearedEntityId) => set({ lastAiClearedEntityId }),
  setAiInspectorMode: (mode) =>
    set((state) => ({
      aiImage: {
        ...state.aiImage,
        inspectorMode: mode
      }
    })),
  setAiComposerOpen: (open) =>
    set((state) => ({
      aiImage: {
        ...state.aiImage,
        isComposerOpen: open,
        inspectorMode: open ? "ai" : "entity"
      }
    })),
  setAiPrompt: (prompt) =>
    set((state) => ({
      aiImage: {
        ...state.aiImage,
        prompt
      }
    })),
  setAiModel: (model) =>
    set((state) => {
      const modelConfig = getImageGenerationModelConfig(model);

      return {
        aiImage: {
          ...state.aiImage,
          providerId: modelConfig.providerId,
          model,
          referenceImages: state.aiImage.referenceImages.map((item, index) =>
            index < modelConfig.maxReferenceImages
              ? item
              : {
                  dataUrl: null,
                  fileName: null
                }
          )
        }
      };
    }),
  setAiSeed: (seed) =>
    set((state) => ({
      aiImage: {
        ...state.aiImage,
        seed
      }
    })),
  setAiImageSize: (imageSize) =>
    set((state) => ({
      aiImage: {
        ...state.aiImage,
        imageSize
      }
    })),
  setAiCfg: (cfg) =>
    set((state) => ({
      aiImage: {
        ...state.aiImage,
        cfg
      }
    })),
  setAiInferenceSteps: (inferenceSteps) =>
    set((state) => ({
      aiImage: {
        ...state.aiImage,
        inferenceSteps
      }
    })),
  setAiReferenceImageAt: (index, image) =>
    set((state) => ({
      aiImage: {
        ...state.aiImage,
        referenceImages: state.aiImage.referenceImages.map((item, itemIndex) =>
          itemIndex === index ? image : item
        )
      }
    })),
  clearAiReferenceImageAt: (index) =>
    set((state) => ({
      aiImage: {
        ...state.aiImage,
        referenceImages: state.aiImage.referenceImages.map((item, itemIndex) =>
          itemIndex === index
            ? {
                dataUrl: null,
                fileName: null
              }
            : item
        )
      }
    })),
  setAiTexturePrompt: (prompt) =>
    set((state) => ({
      aiTexture: {
        ...state.aiTexture,
        prompt
      }
    })),
  setAiTextureState: (payload) =>
    set((state) => ({
      aiTexture: {
        ...state.aiTexture,
        ...payload
      }
    })),
  setAiPanoramaPrompt: (prompt) =>
    set((state) => ({
      aiPanorama: {
        ...state.aiPanorama,
        prompt
      }
    })),
  setAiPanoramaState: (payload) =>
    set((state) => ({
      aiPanorama: {
        ...state.aiPanorama,
        ...payload
      }
    })),
  setAiAssetRecommendationPrompt: (prompt) =>
    set((state) => ({
      aiAssetRecommendations: {
        ...state.aiAssetRecommendations,
        prompt
      }
    })),
  setAiAssetRecommendationState: (payload) =>
    set((state) => ({
      aiAssetRecommendations: {
        ...state.aiAssetRecommendations,
        ...payload
      }
    })),
  setAiAssetRecommendationItemSelected: (itemId, selected) =>
    set((state) => ({
      aiAssetRecommendations: {
        ...state.aiAssetRecommendations,
        selectedItemIds: {
          ...state.aiAssetRecommendations.selectedItemIds,
          [itemId]: selected
        }
      }
    })),
  setAi3dPrompt: (prompt) =>
    set((state) => ({
      ai3d: {
        ...state.ai3d,
        prompt
      }
    })),
  setAi3dIntentDraft: (payload) =>
    set((state) => ({
      ai3d: {
        ...state.ai3d,
        intentDraft: {
          ...state.ai3d.intentDraft,
          ...payload
        }
      }
    })),
  setAi3dState: (payload) =>
    set((state) => ({
      ai3d: {
        ...state.ai3d,
        ...payload
      }
    })),
  setAiGeneratingState: (payload) =>
    set((state) => ({
      aiImage: {
        ...state.aiImage,
        isGenerating: payload.isGenerating,
        errorMessage:
          "errorMessage" in payload ? payload.errorMessage ?? null : state.aiImage.errorMessage,
        results: "results" in payload ? payload.results ?? [] : state.aiImage.results,
        lastSeed: "lastSeed" in payload ? payload.lastSeed ?? null : state.aiImage.lastSeed
      }
    }))
});
