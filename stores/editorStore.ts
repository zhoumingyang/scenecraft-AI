import { create } from "zustand";
import {
  DEFAULT_IMAGE_GENERATION_MODEL_ID,
  MAX_REFERENCE_IMAGE_SLOTS,
  getImageGenerationModelConfig,
  type ImageGenerationImageSize,
  type ImageGenerationModelId
} from "@/lib/ai/image-generation/models";
import type { EditorApp } from "@/render/editor";

export type AiImageProviderId = "siliconflow" | "openrouter";
export type AiImageModelId = ImageGenerationModelId;
export type EditorThemeMode = "dark" | "light";
export type AiImageSize = ImageGenerationImageSize;

export type AiImageResult = {
  url: string;
};

export type AiReferenceImageSlot = {
  dataUrl: string | null;
  fileName: string | null;
};

type AiImageSettings = {
  providerId: AiImageProviderId;
  model: AiImageModelId;
  prompt: string;
  seed: string;
  imageSize: AiImageSize;
  cfg: number;
  inferenceSteps: number;
  referenceImages: AiReferenceImageSlot[];
  isComposerOpen: boolean;
  inspectorMode: "entity" | "ai";
  isGenerating: boolean;
  errorMessage: string | null;
  results: AiImageResult[];
  lastSeed: number | null;
};

type EditorStoreState = {
  app: EditorApp | null;
  editorThemeMode: EditorThemeMode;
  selectedEntityId: string | null;
  projectVersion: number;
  projectLoadVersion: number;
  cameraVersion: number;
  viewStateVersion: number;
  aiImage: AiImageSettings;
  setApp: (app: EditorApp | null) => void;
  setEditorThemeMode: (mode: EditorThemeMode) => void;
  setSelectedEntityId: (selectedEntityId: string | null) => void;
  bumpProjectVersion: () => void;
  bumpProjectLoadVersion: () => void;
  bumpCameraVersion: () => void;
  bumpViewStateVersion: () => void;
  setAiInspectorMode: (mode: AiImageSettings["inspectorMode"]) => void;
  setAiComposerOpen: (open: boolean) => void;
  setAiPrompt: (prompt: string) => void;
  setAiModel: (model: AiImageModelId) => void;
  setAiSeed: (seed: string) => void;
  setAiImageSize: (imageSize: AiImageSize) => void;
  setAiCfg: (cfg: number) => void;
  setAiInferenceSteps: (steps: number) => void;
  setAiReferenceImageAt: (index: number, image: AiReferenceImageSlot) => void;
  clearAiReferenceImageAt: (index: number) => void;
  setAiGeneratingState: (payload: {
    isGenerating: boolean;
    errorMessage?: string | null;
    results?: AiImageResult[];
    lastSeed?: number | null;
  }) => void;
};

export const useEditorStore = create<EditorStoreState>((set) => ({
  app: null,
  editorThemeMode: "dark",
  selectedEntityId: null,
  projectVersion: 0,
  projectLoadVersion: 0,
  cameraVersion: 0,
  viewStateVersion: 0,
  aiImage: {
    providerId: getImageGenerationModelConfig(DEFAULT_IMAGE_GENERATION_MODEL_ID).providerId,
    model: DEFAULT_IMAGE_GENERATION_MODEL_ID,
    prompt: "",
    seed: "",
    imageSize: "1328x1328",
    cfg: 4,
    inferenceSteps: 20,
    referenceImages: Array.from({ length: MAX_REFERENCE_IMAGE_SLOTS }, () => ({
      dataUrl: null,
      fileName: null
    })),
    isComposerOpen: true,
    inspectorMode: "entity",
    isGenerating: false,
    errorMessage: null,
    results: [],
    lastSeed: null
  },
  setApp: (app) => set({ app }),
  setEditorThemeMode: (editorThemeMode) => set({ editorThemeMode }),
  setSelectedEntityId: (selectedEntityId) => set({ selectedEntityId }),
  bumpProjectVersion: () => set((state) => ({ projectVersion: state.projectVersion + 1 })),
  bumpProjectLoadVersion: () =>
    set((state) => ({
      projectLoadVersion: state.projectLoadVersion + 1
    })),
  bumpCameraVersion: () =>
    set((state) => ({
      cameraVersion: state.cameraVersion + 1
    })),
  bumpViewStateVersion: () =>
    set((state) => ({
      viewStateVersion: state.viewStateVersion + 1
    })),
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
  setAiInferenceSteps: (steps) =>
    set((state) => ({
      aiImage: {
        ...state.aiImage,
        inferenceSteps: steps
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
}));
