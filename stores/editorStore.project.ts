import { createEmptyProjectAiLibrary, normalizeProjectAiLibrary } from "@/lib/project/schema";
import {
  createInitialSaveStatus,
  revokeLocalAssetSourceUrl,
  revokeLocalProjectAssets
} from "./editorStore.initializers";
import type { EditorStoreSlice, EditorStoreState } from "./editorStore.types";

type EditorProjectSlice = Pick<
  EditorStoreState,
  | "currentProjectId"
  | "currentProjectMeta"
  | "loadedAiLibrary"
  | "pendingAiAssets"
  | "localProjectAssets"
  | "saveStatus"
  | "hasUnsavedChanges"
  | "projectVersion"
  | "projectLoadVersion"
  | "setCurrentProject"
  | "setProjectMeta"
  | "setLoadedAiLibrary"
  | "appendPendingAiAsset"
  | "clearPendingAiAssets"
  | "removeAiLibraryAsset"
  | "recordAiResultAppliedToMesh"
  | "registerLocalProjectAsset"
  | "clearLocalProjectAssets"
  | "markUnsavedChanges"
  | "setSaveStatus"
  | "bumpProjectVersion"
  | "bumpProjectLoadVersion"
>;

export const createProjectSlice: EditorStoreSlice<EditorProjectSlice> = (set) => ({
  currentProjectId: null,
  currentProjectMeta: null,
  loadedAiLibrary: createEmptyProjectAiLibrary(),
  pendingAiAssets: [],
  localProjectAssets: [],
  saveStatus: createInitialSaveStatus(),
  hasUnsavedChanges: false,
  projectVersion: 0,
  projectLoadVersion: 0,
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
  bumpProjectVersion: () => set((state) => ({ projectVersion: state.projectVersion + 1 })),
  bumpProjectLoadVersion: () =>
    set((state) => ({
      projectLoadVersion: state.projectLoadVersion + 1
    }))
});
