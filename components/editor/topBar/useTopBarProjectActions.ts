import { isPolyhavenProviderEnabled } from "@/lib/externalAssets/config";
import type { TopBarTranslate } from "./types";
import { createIdleSaveStatus } from "./topBarProjectActionUtils";
import { useTopBarAiLibraryActions } from "./useTopBarAiLibraryActions";
import { useTopBarImportActions } from "./useTopBarImportActions";
import { useTopBarProjectListActions } from "./useTopBarProjectListActions";
import { useTopBarProjectLoadActions } from "./useTopBarProjectLoadActions";
import { useTopBarProjectSaveActions } from "./useTopBarProjectSaveActions";
import { useTopBarProjectStoreState } from "./useTopBarProjectStoreState";

type UseTopBarProjectActionsOptions = {
  confirm: (options: { message: string; title?: string; confirmLabel?: string; confirmColor?: "primary" | "error" }) => Promise<boolean>;
  notify: (options: { message: string; title?: string; confirmLabel?: string }) => Promise<void>;
  t: TopBarTranslate;
};

export function useTopBarProjectActions({
  confirm,
  notify,
  t
}: UseTopBarProjectActionsOptions) {
  const state = useTopBarProjectStoreState();
  const {
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
    isSaving
  } = state;
  const isPolyhavenEnabled = isPolyhavenProviderEnabled();
  const {
    applyPersistedProjectState,
    loadDefaultProject,
    onClearProject,
    onCreateProject,
    prepareProjectForLoad,
    runWithSceneLoading
  } = useTopBarProjectLoadActions({
    app,
    beginSceneLoading,
    clearLocalProjectAssets,
    clearPendingAiAssets,
    endSceneLoading,
    hasUnsavedChanges,
    markUnsavedChanges,
    setCurrentProject,
    setLoadedAiLibrary,
    setProjectMeta,
    setSaveStatus,
    confirm,
    t
  });
  const { executeSave, onSaveScene } = useTopBarProjectSaveActions({
    app,
    applyPersistedProjectState,
    currentProjectId,
    currentProjectMeta,
    isSaving,
    loadedAiLibrary,
    localProjectAssets,
    pendingAiAssets,
    prepareProjectForLoad,
    runWithSceneLoading,
    setProjectSaveDialogOpen,
    setSaveStatus,
    t
  });
  const {
    deletingProjectId,
    isProjectListLoading,
    onDeleteProject,
    onSelectProject,
    openProjectSelectDialog,
    projectListError,
    projects
  } = useTopBarProjectListActions({
    app,
    applyPersistedProjectState,
    confirm,
    currentProjectId,
    hasUnsavedChanges,
    loadDefaultProject,
    prepareProjectForLoad,
    runWithSceneLoading,
    setProjectListDialogOpen,
    setSaveStatus,
    t
  });
  const importActions = useTopBarImportActions({
    app,
    isPolyhavenEnabled,
    isStudioSceneActive,
    notify,
    registerLocalProjectAsset,
    t
  });
  const aiLibraryActions = useTopBarAiLibraryActions({
    app,
    loadedAiLibrary,
    markUnsavedChanges,
    notify,
    pendingAiAssets,
    removeAiLibraryAsset,
    t
  });

  return {
    aiLibraryAssetCount: aiLibraryActions.aiLibraryAssetCount,
    aiLibraryDialogOpen: aiLibraryActions.aiLibraryDialogOpen,
    app,
    closeAiLibraryDialog: aiLibraryActions.closeAiLibraryDialog,
    closePolyhavenHdriDialog: importActions.closePolyhavenHdriDialog,
    closePolyhavenModelDialog: importActions.closePolyhavenModelDialog,
    closeProjectListDialog: () => setProjectListDialogOpen(false),
    closeProjectSaveDialog: () => setProjectSaveDialogOpen(false),
    currentProjectMeta,
    deletingProjectId,
    executeSave,
    isPolyhavenEnabled,
    isProjectListLoading,
    isSaving,
    loadedAiLibrary,
    modelImportInputRef: importActions.modelImportInputRef,
    onApplyExternalHdri: importActions.onApplyExternalHdri,
    onApplyExternalModel: importActions.onApplyExternalModel,
    onClearProject,
    onCreateProject,
    onDeleteAiLibraryAsset: aiLibraryActions.onDeleteAiLibraryAsset,
    onDeleteProject,
    onImportLibraryHdri: importActions.onImportLibraryHdri,
    onImportLibraryModel: importActions.onImportLibraryModel,
    onImportModel: importActions.onImportModel,
    onImportModelFile: importActions.onImportModelFile,
    onImportPano: importActions.onImportPano,
    onImportPanoFile: importActions.onImportPanoFile,
    onSaveScene,
    onSelectProject,
    openAiLibraryDialog: aiLibraryActions.openAiLibraryDialog,
    openProjectSelectDialog,
    panoImportInputRef: importActions.panoImportInputRef,
    pendingAiAssets,
    polyhavenHdriDialogOpen: importActions.polyhavenHdriDialogOpen,
    polyhavenModelDialogOpen: importActions.polyhavenModelDialogOpen,
    projectListDialogOpen,
    projectListError,
    projectSaveDialogOpen,
    projects,
    resetSaveStatus: () => setSaveStatus(createIdleSaveStatus()),
    saveStatus
  };
}
