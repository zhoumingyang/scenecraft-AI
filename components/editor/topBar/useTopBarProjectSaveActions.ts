import type {
  EditorApp,
  EditorProjectJSON,
  EditorProjectMetaJSON,
  ProjectAiLibraryV2JSON
} from "@/render/editor";
import type {
  EditorStoreState,
  LocalProjectAssetEntry,
  PendingAiAsset
} from "@/stores/editorStore";
import { cleanupUploadedAssets } from "@/frontend/api/assets";
import { createProject, updateProject } from "@/frontend/api/projects";
import {
  hasStoredViewHelperVisibility,
  persistViewHelperVisibility
} from "@/components/editor/viewHelperPreferences";
import type { TopBarTranslate } from "./types";
import {
  cloneProjectSnapshot,
  uploadPendingAiAssets,
  uploadProjectThumbnail,
  uploadSceneLocalAssets
} from "./projectSaveHelpers";
import type { PersistedProject } from "./topBarProjectActionUtils";

type UseTopBarProjectSaveActionsOptions = {
  app: EditorApp | null;
  applyPersistedProjectState: (
    project: PersistedProject,
    fallbackMeta?: EditorProjectMetaJSON | null
  ) => void;
  currentProjectId: string | null;
  currentProjectMeta: EditorProjectMetaJSON | null;
  isSaving: boolean;
  loadedAiLibrary: ProjectAiLibraryV2JSON;
  localProjectAssets: LocalProjectAssetEntry[];
  pendingAiAssets: PendingAiAsset[];
  prepareProjectForLoad: (project: PersistedProject) => EditorProjectJSON;
  runWithSceneLoading: <T>(task: () => Promise<T>) => Promise<T>;
  setProjectSaveDialogOpen: EditorStoreState["setProjectSaveDialogOpen"];
  setSaveStatus: EditorStoreState["setSaveStatus"];
  t: TopBarTranslate;
};

export function useTopBarProjectSaveActions({
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
}: UseTopBarProjectSaveActionsOptions) {
  const executeSave = async (meta: EditorProjectMetaJSON) => {
    if (!app) {
      return;
    }

    app.flushRuntimeStateToProjectModel();
    const currentSnapshot = app.getProjectJSON();
    if (!currentSnapshot) {
      return;
    }

    const snapshot = cloneProjectSnapshot(currentSnapshot);
    const projectId = snapshot.id;
    snapshot.meta = meta;
    setSaveStatus({
      phase: "saving",
      message: t("editor.project.saving"),
      updatedAt: Date.now()
    });
    setProjectSaveDialogOpen(false);

    const uploadedAssetsForCleanup: string[] = [];
    let shouldCleanupUploadedAssets = true;
    const trackUploadedAsset = (asset: { objectKey: string }) => {
      uploadedAssetsForCleanup.push(asset.objectKey);
    };

    try {
      const uploadedSceneAssets = await uploadSceneLocalAssets(
        snapshot,
        projectId,
        localProjectAssets,
        { onUploaded: trackUploadedAsset }
      );
      const thumbnailAsset = await uploadProjectThumbnail(app, snapshot, projectId, {
        onUploaded: trackUploadedAsset
      });
      const uploadedAi = await uploadPendingAiAssets(
        snapshot,
        projectId,
        loadedAiLibrary,
        pendingAiAssets,
        { onUploaded: trackUploadedAsset }
      );
      const uploadedAssets = [...uploadedSceneAssets, thumbnailAsset, ...uploadedAi.uploadedAssets];
      const payload = {
        snapshot,
        aiSnapshot: uploadedAi.aiSnapshot,
        uploadedAssets
      };

      const response = currentProjectId
        ? await updateProject(currentProjectId, payload)
        : await createProject(payload);
      shouldCleanupUploadedAssets = false;

      if (!currentProjectId && !hasStoredViewHelperVisibility(response.project.id)) {
        persistViewHelperVisibility(response.project.id, app.getViewHelperVisibility());
      }

      await runWithSceneLoading(() =>
        app.dispatch({
          type: "project.load",
          project: prepareProjectForLoad(response.project)
        })
      );
      applyPersistedProjectState(response.project, meta);
      setSaveStatus({
        phase: "success",
        message: t("editor.project.saveSuccess"),
        updatedAt: Date.now()
      });
    } catch (error) {
      if (shouldCleanupUploadedAssets && uploadedAssetsForCleanup.length > 0) {
        await cleanupUploadedAssets({
          objectKeys: uploadedAssetsForCleanup
        }).catch((cleanupError) => {
          console.warn("[projects] Failed to clean up uploaded assets after save failure.", cleanupError);
        });
      }

      const message = error instanceof Error ? error.message : t("editor.project.saveFailed");
      setSaveStatus({
        phase: "error",
        message,
        updatedAt: Date.now()
      });
    }
  };

  const onSaveScene = () => {
    if (isSaving) {
      return;
    }

    if (!currentProjectId) {
      setProjectSaveDialogOpen(true);
      return;
    }

    void executeSave(
      currentProjectMeta ?? {
        title: t("editor.project.untitled")
      }
    );
  };

  return {
    executeSave,
    onSaveScene
  };
}
