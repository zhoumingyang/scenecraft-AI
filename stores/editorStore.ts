import { create } from "zustand";
import type { ProjectAssetKind } from "@/lib/api/contracts/assets";
import { createEmptyProjectAiLibrary, normalizeProjectAiLibrary } from "@/lib/project/schema";
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
  LightingConflictState,
  EditorProjectMetaJSON,
  ProjectAiAssetKindJSON,
  ProjectAiLibraryJSON,
  ProjectAiLibraryV2JSON
} from "@/render/editor";

export type AiImageProviderId = "siliconflow" | "openrouter";
export type AiImageModelId = ImageGenerationModelId;
export type EditorThemeMode = "dark" | "light";
export type AiImageSize = ImageGenerationImageSize;
export type ProjectSavePhase = "idle" | "saving" | "success" | "error";

export type AiImageResult = {
  url: string;
};

export type AiTextureResult = {
  atlasImageUrl: string;
  prompt: string;
  model: string;
  seed: number | null;
  traceId: string | null;
  layoutVersion: number;
};

export type AiTextureTarget = {
  kind: "mesh" | "ground";
  id?: string;
  label: string;
};

export type AiMode = "image" | "texture" | "panorama" | "3d";

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

export type PendingAiReferenceImage = {
  dataUrl: string;
  fileName: string;
  mimeType: string;
};

export type PendingAiAsset = {
  id: string;
  kind: ProjectAiAssetKindJSON;
  createdAt: string;
  prompt: string;
  model: string;
  seed: number | null;
  imageSize?: string;
  cfg: number;
  inferenceSteps: number;
  traceId: string | null;
  referenceImages: PendingAiReferenceImage[];
  sourceUrl: string;
  fileName: string;
  mimeType: string;
  appliedMeshIds: string[];
  atlasLayoutVersion?: number;
  targetKind?: "mesh" | "ground";
  targetId?: string | null;
  width?: number;
  height?: number;
  targetPath?: "env:pano";
};

export type ProjectSaveStatus = {
  phase: ProjectSavePhase;
  message: string | null;
  updatedAt: number | null;
};

export type SceneLoadingStatus = {
  activeRequests: number;
  message: string | null;
};

export type LightingConflictNotice = {
  open: boolean;
  dismissed: boolean;
  hasAmbientLight: boolean;
  hasHemisphereLight: boolean;
  conflictKey: string | null;
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

type AiTextureSettings = {
  prompt: string;
  isGenerating: boolean;
  errorMessage: string | null;
  result: AiTextureResult | null;
  lastSeed: number | null;
  target: AiTextureTarget | null;
};

type AiPanoramaSettings = {
  prompt: string;
  isGenerating: boolean;
  errorMessage: string | null;
  result: {
    imageUrl: string;
    prompt: string;
  } | null;
};

type EditorStoreState = {
  app: EditorApp | null;
  editorThemeMode: EditorThemeMode;
  selectedEntityId: string | null;
  currentProjectId: string | null;
  currentProjectMeta: EditorProjectMetaJSON | null;
  loadedAiLibrary: ProjectAiLibraryV2JSON;
  pendingAiAssets: PendingAiAsset[];
  localProjectAssets: LocalProjectAssetEntry[];
  saveStatus: ProjectSaveStatus;
  sceneLoadingStatus: SceneLoadingStatus;
  lightingConflictNotice: LightingConflictNotice;
  hasUnsavedChanges: boolean;
  projectListDialogOpen: boolean;
  projectSaveDialogOpen: boolean;
  projectVersion: number;
  entityVersions: Record<string, number>;
  sceneTreeVersion: number;
  meshListVersion: number;
  entityRenderVersion: number;
  projectLoadVersion: number;
  cameraVersion: number;
  viewStateVersion: number;
  aiMode: AiMode;
  lastAiClearedEntityId: string | null;
  aiImage: AiImageSettings;
  aiTexture: AiTextureSettings;
  aiPanorama: AiPanoramaSettings;
  ai3d: Ai3DSettings;
  setApp: (app: EditorApp | null) => void;
  setEditorThemeMode: (mode: EditorThemeMode) => void;
  setSelectedEntityId: (selectedEntityId: string | null) => void;
  setCurrentProject: (projectId: string | null) => void;
  setProjectMeta: (meta: EditorProjectMetaJSON | null) => void;
  setLoadedAiLibrary: (library: ProjectAiLibraryJSON) => void;
  appendPendingAiAsset: (asset: PendingAiAsset) => void;
  clearPendingAiAssets: () => void;
  removeAiLibraryAsset: (payload: {
    source: "loaded" | "pending";
    assetId: string;
  }) => void;
  recordAiResultAppliedToMesh: (imageUrl: string, meshId: string) => void;
  registerLocalProjectAsset: (asset: LocalProjectAssetEntry) => void;
  clearLocalProjectAssets: () => void;
  markUnsavedChanges: (dirty: boolean) => void;
  setSaveStatus: (status: ProjectSaveStatus) => void;
  syncLightingConflictNotice: (state: LightingConflictState) => void;
  dismissLightingConflictNotice: () => void;
  resetLightingConflictNotice: () => void;
  beginSceneLoading: (message?: string | null) => void;
  endSceneLoading: () => void;
  setProjectListDialogOpen: (open: boolean) => void;
  setProjectSaveDialogOpen: (open: boolean) => void;
  bumpProjectVersion: () => void;
  bumpEntityVersion: (entityId: string) => void;
  bumpSceneTreeVersion: () => void;
  bumpMeshListVersion: () => void;
  bumpEntityRenderVersion: () => void;
  bumpProjectLoadVersion: () => void;
  bumpCameraVersion: () => void;
  bumpViewStateVersion: () => void;
  setAiMode: (mode: AiMode) => void;
  setLastAiClearedEntityId: (entityId: string | null) => void;
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
  setAiTexturePrompt: (prompt: string) => void;
  setAiTextureState: (payload: Partial<AiTextureSettings>) => void;
  setAiPanoramaPrompt: (prompt: string) => void;
  setAiPanoramaState: (payload: Partial<AiPanoramaSettings>) => void;
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

function createInitialAiTextureSettings(): AiTextureSettings {
  return {
    prompt: "",
    isGenerating: false,
    errorMessage: null,
    result: null,
    lastSeed: null,
    target: null
  };
}

function createInitialAiPanoramaSettings(): AiPanoramaSettings {
  return {
    prompt: "",
    isGenerating: false,
    errorMessage: null,
    result: null
  };
}

function createInitialSaveStatus(): ProjectSaveStatus {
  return {
    phase: "idle",
    message: null,
    updatedAt: null
  };
}

function createInitialSceneLoadingStatus(): SceneLoadingStatus {
  return {
    activeRequests: 0,
    message: null
  };
}

function createInitialLightingConflictNotice(): LightingConflictNotice {
  return {
    open: false,
    dismissed: false,
    hasAmbientLight: false,
    hasHemisphereLight: false,
    conflictKey: null
  };
}

function revokeLocalAssetSourceUrl(sourceUrl: string) {
  if (!sourceUrl.startsWith("blob:") || typeof URL === "undefined") {
    return;
  }

  URL.revokeObjectURL(sourceUrl);
}

function revokeLocalProjectAssets(assets: LocalProjectAssetEntry[]) {
  assets.forEach((asset) => revokeLocalAssetSourceUrl(asset.sourceUrl));
}

export const useEditorStore = create<EditorStoreState>((set) => ({
  app: null,
  editorThemeMode: "dark",
  selectedEntityId: null,
  currentProjectId: null,
  currentProjectMeta: null,
  loadedAiLibrary: createEmptyProjectAiLibrary(),
  pendingAiAssets: [],
  localProjectAssets: [],
  saveStatus: createInitialSaveStatus(),
  sceneLoadingStatus: createInitialSceneLoadingStatus(),
  lightingConflictNotice: createInitialLightingConflictNotice(),
  hasUnsavedChanges: false,
  projectListDialogOpen: false,
  projectSaveDialogOpen: false,
  projectVersion: 0,
  entityVersions: {},
  sceneTreeVersion: 0,
  meshListVersion: 0,
  entityRenderVersion: 0,
  projectLoadVersion: 0,
  cameraVersion: 0,
  viewStateVersion: 0,
  aiMode: "image",
  lastAiClearedEntityId: null,
  aiImage: createInitialAiImageSettings(),
  aiTexture: createInitialAiTextureSettings(),
  aiPanorama: createInitialAiPanoramaSettings(),
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
  setLoadedAiLibrary: (loadedAiLibrary) =>
    set({
      loadedAiLibrary: normalizeProjectAiLibrary(loadedAiLibrary)
    }),
  appendPendingAiAsset: (asset) =>
    set((state) => ({
      pendingAiAssets: [...state.pendingAiAssets, asset]
    })),
  clearPendingAiAssets: () =>
    set((state) => {
      state.pendingAiAssets.forEach((asset) => revokeLocalAssetSourceUrl(asset.sourceUrl));
      return { pendingAiAssets: [] };
    }),
  removeAiLibraryAsset: ({ source, assetId }) =>
    set((state) => ({
      loadedAiLibrary:
        source === "loaded"
          ? {
              ...state.loadedAiLibrary,
              assets: state.loadedAiLibrary.assets.filter((asset) => asset.id !== assetId)
            }
          : state.loadedAiLibrary,
      pendingAiAssets:
        source === "pending"
          ? state.pendingAiAssets.filter((asset) => {
              const shouldRemove = asset.id === assetId;
              if (shouldRemove) {
                revokeLocalAssetSourceUrl(asset.sourceUrl);
              }
              return !shouldRemove;
            })
          : state.pendingAiAssets
    })),
  recordAiResultAppliedToMesh: (imageUrl, meshId) =>
    set((state) => ({
      pendingAiAssets: state.pendingAiAssets.map((asset) => ({
        ...asset,
        appliedMeshIds:
          asset.sourceUrl === imageUrl && !asset.appliedMeshIds.includes(meshId)
            ? [...asset.appliedMeshIds, meshId]
            : asset.appliedMeshIds
      })),
      loadedAiLibrary: {
        ...state.loadedAiLibrary,
        assets: state.loadedAiLibrary.assets.map((asset) => ({
          ...asset,
          appliedMeshIds:
            asset.url === imageUrl && !(asset.appliedMeshIds ?? []).includes(meshId)
              ? [...(asset.appliedMeshIds ?? []), meshId]
              : asset.appliedMeshIds
        }))
      }
    })),
  registerLocalProjectAsset: (asset) =>
    set((state) => {
      const replacedAssets = state.localProjectAssets.filter(
        (currentAsset) => currentAsset.targetPath === asset.targetPath
      );
      revokeLocalProjectAssets(replacedAssets);

      return {
        localProjectAssets: [
          ...state.localProjectAssets.filter(
            (currentAsset) => currentAsset.targetPath !== asset.targetPath
          ),
          asset
        ]
      };
    }),
  clearLocalProjectAssets: () =>
    set((state) => {
      revokeLocalProjectAssets(state.localProjectAssets);
      return { localProjectAssets: [] };
    }),
  markUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  syncLightingConflictNotice: ({ hasAmbientLight, hasHemisphereLight, hasConflict }) =>
    set((state) => {
      if (!hasConflict) {
        return {
          lightingConflictNotice: createInitialLightingConflictNotice()
        };
      }

      const conflictKey = [
        hasAmbientLight ? "ambient" : null,
        hasHemisphereLight ? "hemisphere" : null
      ]
        .filter(Boolean)
        .join("|");
      const conflictChanged = state.lightingConflictNotice.conflictKey !== conflictKey;
      const dismissed = conflictChanged ? false : state.lightingConflictNotice.dismissed;

      return {
        lightingConflictNotice: {
          open: !dismissed,
          dismissed,
          hasAmbientLight,
          hasHemisphereLight,
          conflictKey
        }
      };
    }),
  dismissLightingConflictNotice: () =>
    set((state) => ({
      lightingConflictNotice: {
        ...state.lightingConflictNotice,
        open: false,
        dismissed: true
      }
    })),
  resetLightingConflictNotice: () =>
    set({
      lightingConflictNotice: createInitialLightingConflictNotice()
    }),
  beginSceneLoading: (message = null) =>
    set((state) => ({
      sceneLoadingStatus: {
        activeRequests: state.sceneLoadingStatus.activeRequests + 1,
        message: message ?? state.sceneLoadingStatus.message
      }
    })),
  endSceneLoading: () =>
    set((state) => {
      const nextActiveRequests = Math.max(0, state.sceneLoadingStatus.activeRequests - 1);
      return {
        sceneLoadingStatus: {
          activeRequests: nextActiveRequests,
          message: nextActiveRequests === 0 ? null : state.sceneLoadingStatus.message
        }
      };
    }),
  setProjectListDialogOpen: (projectListDialogOpen) => set({ projectListDialogOpen }),
  setProjectSaveDialogOpen: (projectSaveDialogOpen) => set({ projectSaveDialogOpen }),
  bumpProjectVersion: () => set((state) => ({ projectVersion: state.projectVersion + 1 })),
  bumpEntityVersion: (entityId) =>
    set((state) => ({
      entityVersions: {
        ...state.entityVersions,
        [entityId]: (state.entityVersions[entityId] ?? 0) + 1
      }
    })),
  bumpSceneTreeVersion: () =>
    set((state) => ({
      sceneTreeVersion: state.sceneTreeVersion + 1
    })),
  bumpMeshListVersion: () =>
    set((state) => ({
      meshListVersion: state.meshListVersion + 1
    })),
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
