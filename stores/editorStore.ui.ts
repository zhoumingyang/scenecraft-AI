import {
  createInitialHistoryState,
  createInitialLightingConflictNotice,
  createInitialSceneLoadingStatus,
  createInitialStudioSceneState
} from "./editorStore.initializers";
import type { EditorStoreSlice, EditorStoreState } from "./editorStore.types";

type EditorUiSlice = Pick<
  EditorStoreState,
  | "app"
  | "editorThemeMode"
  | "selectedEntityId"
  | "selectedEntityIds"
  | "sceneLoadingStatus"
  | "lightingConflictNotice"
  | "historyState"
  | "studioScene"
  | "projectListDialogOpen"
  | "projectSaveDialogOpen"
  | "entityVersions"
  | "sceneTreeVersion"
  | "meshListVersion"
  | "entityRenderVersion"
  | "cameraVersion"
  | "viewStateVersion"
  | "setApp"
  | "setEditorThemeMode"
  | "setSelectedEntityId"
  | "setSelectedEntityIds"
  | "syncLightingConflictNotice"
  | "dismissLightingConflictNotice"
  | "resetLightingConflictNotice"
  | "setHistoryState"
  | "setStudioSceneState"
  | "beginSceneLoading"
  | "endSceneLoading"
  | "setProjectListDialogOpen"
  | "setProjectSaveDialogOpen"
  | "bumpEntityVersion"
  | "bumpSceneTreeVersion"
  | "bumpMeshListVersion"
  | "bumpEntityRenderVersion"
  | "bumpCameraVersion"
  | "bumpViewStateVersion"
>;

export const createUiSlice: EditorStoreSlice<EditorUiSlice> = (set) => ({
  app: null,
  editorThemeMode: "dark",
  selectedEntityId: null,
  selectedEntityIds: [],
  sceneLoadingStatus: createInitialSceneLoadingStatus(),
  lightingConflictNotice: createInitialLightingConflictNotice(),
  historyState: createInitialHistoryState(),
  studioScene: createInitialStudioSceneState(),
  projectListDialogOpen: false,
  projectSaveDialogOpen: false,
  entityVersions: {},
  sceneTreeVersion: 0,
  meshListVersion: 0,
  entityRenderVersion: 0,
  cameraVersion: 0,
  viewStateVersion: 0,
  setApp: (app) => set({ app }),
  setEditorThemeMode: (editorThemeMode) => set({ editorThemeMode }),
  setSelectedEntityId: (selectedEntityId) =>
    set({ selectedEntityId, selectedEntityIds: selectedEntityId ? [selectedEntityId] : [] }),
  setSelectedEntityIds: (selectedEntityIds) =>
    set({
      selectedEntityIds,
      selectedEntityId: selectedEntityIds.length === 1 ? selectedEntityIds[0] : null
    }),
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
  setHistoryState: (historyState) => set({ historyState }),
  setStudioSceneState: (studioScene) => set({ studioScene }),
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
  bumpCameraVersion: () =>
    set((state) => ({
      cameraVersion: state.cameraVersion + 1
    })),
  bumpViewStateVersion: () =>
    set((state) => ({
      viewStateVersion: state.viewStateVersion + 1
    }))
});
