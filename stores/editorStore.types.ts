import type { StateCreator } from "zustand";
import type { ProjectAssetKind } from "@/lib/api/contracts/assets";
import type { AiExternalAssetRecommendationBundle } from "@/lib/api/contracts/ai";
import type { Ai3DIntentInput, Ai3DPlanDiagnostics } from "@/lib/ai/ai3d/intent";
import type {
  Ai3DPlan,
  EditorApp,
  EditorHistoryState,
  LightingConflictState,
  EditorProjectMetaJSON,
  ProjectAiAssetKindJSON,
  ProjectAiLibraryJSON,
  ProjectAiLibraryV2JSON,
  StudioSceneState
} from "@/render/editor";
import type {
  ImageGenerationImageSize,
  ImageGenerationModelId
} from "@/lib/ai/image-generation/models";

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

export type AiMode = "image" | "texture" | "panorama" | "assets" | "3d";

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

export type AiImageSettings = {
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

export type Ai3DSettings = {
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

export type AiTextureSettings = {
  prompt: string;
  isGenerating: boolean;
  errorMessage: string | null;
  result: AiTextureResult | null;
  lastSeed: number | null;
  target: AiTextureTarget | null;
};

export type AiPanoramaSettings = {
  prompt: string;
  isGenerating: boolean;
  errorMessage: string | null;
  result: {
    imageUrl: string;
    prompt: string;
  } | null;
};

export type AiAssetRecommendationSettings = {
  prompt: string;
  isGenerating: boolean;
  isApplying: boolean;
  errorMessage: string | null;
  applyMessage: string | null;
  bundles: AiExternalAssetRecommendationBundle[];
  selectedItemIds: Record<string, boolean>;
  lastTraceId: string | null;
  cacheHit: boolean;
};

export type EditorStoreState = {
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
  historyState: EditorHistoryState;
  studioScene: StudioSceneState;
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
  aiAssetRecommendations: AiAssetRecommendationSettings;
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
  setHistoryState: (state: EditorHistoryState) => void;
  setStudioSceneState: (state: StudioSceneState) => void;
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
  setAiAssetRecommendationPrompt: (prompt: string) => void;
  setAiAssetRecommendationState: (payload: Partial<AiAssetRecommendationSettings>) => void;
  setAiAssetRecommendationItemSelected: (itemId: string, selected: boolean) => void;
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

export type EditorStoreSlice<T> = StateCreator<EditorStoreState, [], [], T>;
