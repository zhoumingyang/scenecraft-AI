import { useEditorStore } from "@/stores/editorStore";

export function useTopBarProjectStoreState() {
  const app = useEditorStore((state) => state.app);
  const currentProjectId = useEditorStore((state) => state.currentProjectId);
  const currentProjectMeta = useEditorStore((state) => state.currentProjectMeta);
  const loadedAiLibrary = useEditorStore((state) => state.loadedAiLibrary);
  const pendingAiAssets = useEditorStore((state) => state.pendingAiAssets);
  const localProjectAssets = useEditorStore((state) => state.localProjectAssets);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const hasUnsavedChanges = useEditorStore((state) => state.hasUnsavedChanges);
  const isStudioSceneActive = useEditorStore((state) => state.studioScene.active);
  const projectListDialogOpen = useEditorStore((state) => state.projectListDialogOpen);
  const projectSaveDialogOpen = useEditorStore((state) => state.projectSaveDialogOpen);
  const registerLocalProjectAsset = useEditorStore((state) => state.registerLocalProjectAsset);
  const clearLocalProjectAssets = useEditorStore((state) => state.clearLocalProjectAssets);
  const clearPendingAiAssets = useEditorStore((state) => state.clearPendingAiAssets);
  const setCurrentProject = useEditorStore((state) => state.setCurrentProject);
  const setProjectMeta = useEditorStore((state) => state.setProjectMeta);
  const setLoadedAiLibrary = useEditorStore((state) => state.setLoadedAiLibrary);
  const markUnsavedChanges = useEditorStore((state) => state.markUnsavedChanges);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
  const beginSceneLoading = useEditorStore((state) => state.beginSceneLoading);
  const endSceneLoading = useEditorStore((state) => state.endSceneLoading);
  const setProjectListDialogOpen = useEditorStore((state) => state.setProjectListDialogOpen);
  const setProjectSaveDialogOpen = useEditorStore((state) => state.setProjectSaveDialogOpen);
  const removeAiLibraryAsset = useEditorStore((state) => state.removeAiLibraryAsset);

  return {
    app,
    currentProjectId,
    currentProjectMeta,
    loadedAiLibrary,
    pendingAiAssets,
    localProjectAssets,
    saveStatus,
    hasUnsavedChanges,
    isStudioSceneActive,
    projectListDialogOpen,
    projectSaveDialogOpen,
    registerLocalProjectAsset,
    clearLocalProjectAssets,
    clearPendingAiAssets,
    setCurrentProject,
    setProjectMeta,
    setLoadedAiLibrary,
    markUnsavedChanges,
    setSaveStatus,
    beginSceneLoading,
    endSceneLoading,
    setProjectListDialogOpen,
    setProjectSaveDialogOpen,
    removeAiLibraryAsset,
    isSaving: saveStatus.phase === "saving"
  };
}

export type TopBarProjectStoreState = ReturnType<typeof useTopBarProjectStoreState>;
