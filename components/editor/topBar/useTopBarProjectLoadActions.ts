import { createEmptyProjectAiLibrary } from "@/lib/project/schema";
import type {
  EditorApp,
  EditorProjectJSON,
  EditorProjectMetaJSON
} from "@/render/editor";
import { createDefaultEditorProjectJSON } from "@/render/editor";
import type { EditorStoreState } from "@/stores/editorStore";
import {
  applyGroundFallbackFromViewHelperStorage,
  restoreViewHelperVisibility
} from "@/components/editor/viewHelperPreferences";
import { syncEditorProjectSearchParam } from "@/components/editor/projectPersistence";
import type { TopBarTranslate } from "./types";
import { createIdleSaveStatus, type PersistedProject } from "./topBarProjectActionUtils";

type UseTopBarProjectLoadActionsOptions = {
  app: EditorApp | null;
  beginSceneLoading: EditorStoreState["beginSceneLoading"];
  clearLocalProjectAssets: EditorStoreState["clearLocalProjectAssets"];
  clearPendingAiAssets: EditorStoreState["clearPendingAiAssets"];
  endSceneLoading: EditorStoreState["endSceneLoading"];
  hasUnsavedChanges: boolean;
  markUnsavedChanges: EditorStoreState["markUnsavedChanges"];
  setCurrentProject: EditorStoreState["setCurrentProject"];
  setLoadedAiLibrary: EditorStoreState["setLoadedAiLibrary"];
  setProjectMeta: EditorStoreState["setProjectMeta"];
  setSaveStatus: EditorStoreState["setSaveStatus"];
  confirm: (options: { message: string; title?: string; confirmLabel?: string; confirmColor?: "primary" | "error" }) => Promise<boolean>;
  t: TopBarTranslate;
};

export function useTopBarProjectLoadActions({
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
}: UseTopBarProjectLoadActionsOptions) {
  const runWithSceneLoading = async <T,>(task: () => Promise<T>) => {
    beginSceneLoading(t("editor.scene.loadingTitle"));
    try {
      return await task();
    } finally {
      endSceneLoading();
    }
  };

  const restoreProjectViewHelpers = (projectId: string | null) => {
    if (!app) return;
    restoreViewHelperVisibility(app, projectId);
  };

  const clearProjectScopedState = () => {
    clearPendingAiAssets();
    clearLocalProjectAssets();
  };

  const confirmDiscardUnsavedChanges = async () => {
    return !hasUnsavedChanges || confirm({ message: t("editor.project.confirmDiscardChanges") });
  };

  const applyPersistedProjectState = (
    project: PersistedProject,
    fallbackMeta: EditorProjectMetaJSON | null = null
  ) => {
    restoreProjectViewHelpers(project.id);
    setCurrentProject(project.id);
    setProjectMeta(project.snapshot.meta ?? fallbackMeta);
    setLoadedAiLibrary(project.aiSnapshot);
    clearProjectScopedState();
    markUnsavedChanges(false);
    syncEditorProjectSearchParam(project.id);
  };

  const prepareProjectForLoad = (project: PersistedProject) =>
    applyGroundFallbackFromViewHelperStorage(project.snapshot, project.id);

  const resetToDefaultProjectState = (project: EditorProjectJSON) => {
    restoreProjectViewHelpers(null);
    setCurrentProject(null);
    setProjectMeta(project.meta ?? null);
    setLoadedAiLibrary(createEmptyProjectAiLibrary());
    clearProjectScopedState();
    markUnsavedChanges(false);
    syncEditorProjectSearchParam(null);
    setSaveStatus(createIdleSaveStatus());
  };

  const loadDefaultProject = async () => {
    if (!app) return;
    const project = createDefaultEditorProjectJSON();
    await runWithSceneLoading(() =>
      app.dispatch({
        type: "project.load",
        project
      })
    );
    resetToDefaultProjectState(project);
  };

  const onCreateProject = async () => {
    if (!(await confirmDiscardUnsavedChanges())) {
      return;
    }

    await loadDefaultProject();
  };

  const onClearProject = async () => {
    if (!app) return;
    if (!(await confirmDiscardUnsavedChanges())) {
      return;
    }

    await app.dispatch({ type: "project.clear" });
    markUnsavedChanges(true);
  };

  return {
    applyPersistedProjectState,
    confirmDiscardUnsavedChanges,
    loadDefaultProject,
    onClearProject,
    onCreateProject,
    prepareProjectForLoad,
    runWithSceneLoading
  };
}
