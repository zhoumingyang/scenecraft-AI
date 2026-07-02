import {
  DEFAULT_IMAGE_GENERATION_MODEL_ID,
  MAX_REFERENCE_IMAGE_SLOTS,
  getImageGenerationModelConfig
} from "@/lib/ai/image-generation/models";
import type {
  Ai3DSettings,
  AiAssetRecommendationSettings,
  AiImageSettings,
  AiPanoramaSettings,
  AiTextureSettings,
  LightingConflictNotice,
  LocalProjectAssetEntry,
  ProjectSaveStatus,
  SceneLoadingStatus
} from "./editorStore.types";
import type { EditorHistoryState, StudioSceneState } from "@/render/editor";

export function createInitialAiImageSettings(): AiImageSettings {
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

export function createInitialAi3DSettings(): Ai3DSettings {
  return {
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
  };
}

export function createInitialAiTextureSettings(): AiTextureSettings {
  return {
    prompt: "",
    isGenerating: false,
    errorMessage: null,
    result: null,
    lastSeed: null,
    target: null
  };
}

export function createInitialAiPanoramaSettings(): AiPanoramaSettings {
  return {
    prompt: "",
    isGenerating: false,
    errorMessage: null,
    result: null
  };
}

export function createInitialAiAssetRecommendationSettings(): AiAssetRecommendationSettings {
  return {
    prompt: "",
    isGenerating: false,
    isApplying: false,
    errorMessage: null,
    applyMessage: null,
    bundles: [],
    selectedItemIds: {},
    lastTraceId: null,
    cacheHit: false
  };
}

export function createInitialSaveStatus(): ProjectSaveStatus {
  return {
    phase: "idle",
    message: null,
    updatedAt: null
  };
}

export function createInitialSceneLoadingStatus(): SceneLoadingStatus {
  return {
    activeRequests: 0,
    message: null
  };
}

export function createInitialLightingConflictNotice(): LightingConflictNotice {
  return {
    open: false,
    dismissed: false,
    hasAmbientLight: false,
    hasHemisphereLight: false,
    conflictKey: null
  };
}

export function createInitialStudioSceneState(): StudioSceneState {
  return {
    active: false,
    presetId: null,
    variantId: null,
    targetEntityId: null,
    productProfile: null,
    styleProfileId: null,
    styleSelectionMode: null,
    plinthKind: null,
    targetScale: 1,
    targetRotationY: 0,
    hdriStatus: "idle",
    hdriError: null
  };
}

export function createInitialHistoryState(): EditorHistoryState {
  return {
    canUndo: false,
    canRedo: false,
    undoLabel: null,
    redoLabel: null
  };
}

export function revokeLocalAssetSourceUrl(sourceUrl: string) {
  if (!sourceUrl.startsWith("blob:") || typeof URL === "undefined") {
    return;
  }

  URL.revokeObjectURL(sourceUrl);
}

export function revokeLocalProjectAssets(assets: LocalProjectAssetEntry[]) {
  assets.forEach((asset) => revokeLocalAssetSourceUrl(asset.sourceUrl));
}
