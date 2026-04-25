import { create } from "zustand";
import type { ProjectAssetKind } from "@/lib/api/contracts/assets";
import { createEmptyProjectAiLibrary } from "@/lib/project/schema";
import type { Ai3DIntentInput, Ai3DPlanDiagnostics } from "@/lib/ai/ai3d/intent";
import {
  DEFAULT_IMAGE_GENERATION_MODEL_ID,
  MAX_REFERENCE_IMAGE_SLOTS,
  getImageGenerationModelConfig,
  type ImageGenerationImageSize,
  type ImageGenerationModelId
} from "@/lib/ai/image-generation/models";
import type {
  Ai3DPlan,
  EditorApp,
  EditorProjectMetaJSON,
  ProjectAiLibraryJSON
} from "@/render/editor";

export type AiImageProviderId = "siliconflow" | "openrouter";
export type AiImageModelId = ImageGenerationModelId;
export type EditorThemeMode = "dark" | "light";
export type AiImageSize = ImageGenerationImageSize;
export type ProjectSavePhase = "idle" | "saving" | "success" | "error";

export type AiImageResult = {
  url: string;
};

export type AiMode = "image" | "3d";

export type AiReferenceImageSlot = {
  dataUrl: string | null;
  fileName: string | null;
};

export type LocalProjectAssetEntry = {
  sourceUrl: string;
  file: File;
  kind: ProjectAssetKind;
  targetPath: string;
  entityId?: string;
};

export type PendingAiLibraryImage = {
  id: string;
  sourceUrl: string;
  fileName: string;
  mimeType: string;
  appliedMeshIds: string[];
};

export type PendingAiReferenceImage = {
  dataUrl: string;
  fileName: string;
  mimeType: string;
};

export type PendingAiImageGeneration = {
  id: string;
  createdAt: string;
  prompt: string;
  model: string;
  seed: number | null;
  imageSize?: string;
  cfg: number;
  inferenceSteps: number;
  traceId: string | null;
  referenceImages: PendingAiReferenceImage[];
  results: PendingAiLibraryImage[];
};

export type ProjectSaveStatus = {
  phase: ProjectSavePhase;
  message: string | null;
  updatedAt: number | null;
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

type Ai3DSettings = {
  prompt: string;
  intentDraft: Partial<Ai3DIntentInput>;
  isGenerating: boolean;
  isOptimizing: boolean;
  errorMessage: string | null;
  previewStatus: "idle" | "ready";
  plan: Ai3DPlan | null;
  originalPlan: Ai3DPlan | null;
  optimizedPlan: Ai3DPlan | null;
  previewVariant: "original" | "optimized";
  lastDiagnostics: Ai3DPlanDiagnostics | null;
};

type EditorStoreState = {
  app: EditorApp | null;
  editorThemeMode: EditorThemeMode;
  selectedEntityId: string | null;
  currentProjectId: string | null;
  currentProjectMeta: EditorProjectMetaJSON | null;
  loadedAiLibrary: ProjectAiLibraryJSON;
  pendingAiImageGenerations: PendingAiImageGeneration[];
  localProjectAssets: LocalProjectAssetEntry[];
  saveStatus: ProjectSaveStatus;
  hasUnsavedChanges: boolean;
  projectListDialogOpen: boolean;
  projectSaveDialogOpen: boolean;
  projectVersion: number;
  entityRenderVersion: number;
  projectLoadVersion: number;
  cameraVersion: number;
  viewStateVersion: number;
  aiMode: AiMode;
  aiImage: AiImageSettings;
  ai3d: Ai3DSettings;
  setApp: (app: EditorApp | null) => void;
  setEditorThemeMode: (mode: EditorThemeMode) => void;
  setSelectedEntityId: (selectedEntityId: string | null) => void;
  setCurrentProject: (projectId: string | null) => void;
  setProjectMeta: (meta: EditorProjectMetaJSON | null) => void;
  setLoadedAiLibrary: (library: ProjectAiLibraryJSON) => void;
  appendPendingAiGeneration: (generation: PendingAiImageGeneration) => void;
  clearPendingAiGenerations: () => void;
  recordAiResultAppliedToMesh: (imageUrl: string, meshId: string) => void;
  registerLocalProjectAsset: (asset: LocalProjectAssetEntry) => void;
  clearLocalProjectAssets: () => void;
  markUnsavedChanges: (dirty: boolean) => void;
  setSaveStatus: (status: ProjectSaveStatus) => void;
  setProjectListDialogOpen: (open: boolean) => void;
  setProjectSaveDialogOpen: (open: boolean) => void;
  bumpProjectVersion: () => void;
  bumpEntityRenderVersion: () => void;
  bumpProjectLoadVersion: () => void;
  bumpCameraVersion: () => void;
  bumpViewStateVersion: () => void;
  setAiMode: (mode: AiMode) => void;
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
  setAi3dPrompt: (prompt: string) => void;
  setAi3dIntentDraft: (payload: Partial<Ai3DIntentInput>) => void;
  setAi3dState: (payload: Partial<Ai3DSettings>) => void;
  setAiGeneratingState: (payload: {
    isGenerating: boolean;
    errorMessage?: string | null;
    results?: AiImageResult[];
    lastSeed?: number | null;
  }) => void;
};

function createInitialAiImageSettings(): AiImageSettings {
  return {
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
  };
}

function createInitialSaveStatus(): ProjectSaveStatus {
  return {
    phase: "idle",
    message: null,
    updatedAt: null
  };
}

export const useEditorStore = create<EditorStoreState>((set) => ({
  app: null,
  editorThemeMode: "dark",
  selectedEntityId: null,
  currentProjectId: null,
  currentProjectMeta: null,
  loadedAiLibrary: createEmptyProjectAiLibrary(),
  pendingAiImageGenerations: [],
  localProjectAssets: [],
  saveStatus: createInitialSaveStatus(),
  hasUnsavedChanges: false,
  projectListDialogOpen: false,
  projectSaveDialogOpen: false,
  projectVersion: 0,
  entityRenderVersion: 0,
  projectLoadVersion: 0,
  cameraVersion: 0,
  viewStateVersion: 0,
  aiMode: "image",
  aiImage: createInitialAiImageSettings(),
  ai3d: {
    prompt: "",
    intentDraft: {},
    isGenerating: false,
    isOptimizing: false,
    errorMessage: null,
    previewStatus: "idle",
    plan: null,
    originalPlan: null,
    optimizedPlan: null,
    previewVariant: "original",
    lastDiagnostics: null
  },
  setApp: (app) => set({ app }),
  setEditorThemeMode: (editorThemeMode) => set({ editorThemeMode }),
  setSelectedEntityId: (selectedEntityId) => set({ selectedEntityId }),
  setCurrentProject: (currentProjectId) => set({ currentProjectId }),
  setProjectMeta: (currentProjectMeta) => set({ currentProjectMeta }),
  setLoadedAiLibrary: (loadedAiLibrary) => set({ loadedAiLibrary }),
  appendPendingAiGeneration: (generation) =>
    set((state) => ({
      pendingAiImageGenerations: [...state.pendingAiImageGenerations, generation]
    })),
  clearPendingAiGenerations: () => set({ pendingAiImageGenerations: [] }),
  recordAiResultAppliedToMesh: (imageUrl, meshId) =>
    set((state) => ({
      pendingAiImageGenerations: state.pendingAiImageGenerations.map((generation) => ({
        ...generation,
        results: generation.results.map((result) =>
          result.sourceUrl === imageUrl && !result.appliedMeshIds.includes(meshId)
            ? {
                ...result,
                appliedMeshIds: [...result.appliedMeshIds, meshId]
              }
            : result
        )
      })),
      loadedAiLibrary: {
        ...state.loadedAiLibrary,
        imageGenerations: state.loadedAiLibrary.imageGenerations.map((generation) => ({
          ...generation,
          results: generation.results.map((result) =>
            result.url === imageUrl &&
            !(result.appliedMeshIds ?? []).includes(meshId)
              ? {
                  ...result,
                  appliedMeshIds: [...(result.appliedMeshIds ?? []), meshId]
                }
              : result
          )
        }))
      }
    })),
  registerLocalProjectAsset: (asset) =>
    set((state) => ({
      localProjectAssets: [...state.localProjectAssets, asset]
    })),
  clearLocalProjectAssets: () => set({ localProjectAssets: [] }),
  markUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setProjectListDialogOpen: (projectListDialogOpen) => set({ projectListDialogOpen }),
  setProjectSaveDialogOpen: (projectSaveDialogOpen) => set({ projectSaveDialogOpen }),
  bumpProjectVersion: () => set((state) => ({ projectVersion: state.projectVersion + 1 })),
  bumpEntityRenderVersion: () =>
    set((state) => ({
      entityRenderVersion: state.entityRenderVersion + 1
    })),
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
  setAiMode: (aiMode) => set({ aiMode }),
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
}));
