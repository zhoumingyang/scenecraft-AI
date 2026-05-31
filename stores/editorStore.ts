import { create } from "zustand";
import { createAiSlice } from "./editorStore.ai";
import { createProjectSlice } from "./editorStore.project";
import { createUiSlice } from "./editorStore.ui";
import type { EditorStoreState } from "./editorStore.types";

export type {
  Ai3DSettings,
  AiAssetRecommendationSettings,
  AiImageModelId,
  AiImageProviderId,
  AiImageResult,
  AiImageSettings,
  AiImageSize,
  AiMode,
  AiPanoramaSettings,
  AiReferenceImageSlot,
  AiTextureResult,
  AiTextureSettings,
  AiTextureTarget,
  EditorStoreState,
  EditorThemeMode,
  LightingConflictNotice,
  LocalProjectAssetEntry,
  PendingAiAsset,
  PendingAiReferenceImage,
  ProjectSavePhase,
  ProjectSaveStatus,
  SceneLoadingStatus
} from "./editorStore.types";

export const useEditorStore = create<EditorStoreState>()((...args) => ({
  ...createUiSlice(...args),
  ...createProjectSlice(...args),
  ...createAiSlice(...args)
}));
