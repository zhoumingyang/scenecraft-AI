import { useRef, useState, type ChangeEvent } from "react";
import {
  createExternalAssetSource
} from "@/lib/externalAssets/source";
import { createEmptyProjectAiLibrary } from "@/lib/project/schema";
import type {
  GetProjectResponse,
  ProjectSummary,
  SaveProjectResponse
} from "@/lib/api/contracts/projects";
import type {
  EditorProjectJSON,
  EditorProjectMetaJSON
} from "@/render/editor";
import {
  SCENE_NODE_ID,
  createDefaultEditorProjectJSON,
  inferModelFileFormat,
  isHighDynamicRangeEnvironmentAssetName
} from "@/render/editor";
import { useEditorStore, type ProjectSaveStatus } from "@/stores/editorStore";
import {
  applyGroundFallbackFromViewHelperStorage,
  hasStoredViewHelperVisibility,
  persistViewHelperVisibility,
  restoreViewHelperVisibility
} from "@/components/editor/viewHelperPreferences";
import {
  clearProjectTextureReferencesByUrl,
  readImageDimensions,
  syncEditorProjectSearchParam
} from "@/components/editor/projectPersistence";
import type {
  ExternalHdriApplyPayload,
  ExternalModelApplyPayload
} from "@/components/editor/externalAssetBrowserDialog";
import { cleanupUploadedAssets } from "@/frontend/api/assets";
import { deleteProject, getProject, listProjects, createProject, updateProject } from "@/frontend/api/projects";
import { isPolyhavenProviderEnabled } from "@/lib/externalAssets/config";
import type { TopBarTranslate } from "./types";
import {
  cloneProjectSnapshot,
  uploadPendingAiGenerations,
  uploadProjectThumbnail,
  uploadSceneLocalAssets
} from "./projectSaveHelpers";

type PersistedProject = GetProjectResponse["project"] | SaveProjectResponse["project"];

function createIdleSaveStatus(): ProjectSaveStatus {
  return {
    phase: "idle",
    message: null,
    updatedAt: Date.now()
  };
}

export function useTopBarProjectActions(t: TopBarTranslate) {
  const modelImportInputRef = useRef<HTMLInputElement | null>(null);
  const panoImportInputRef = useRef<HTMLInputElement | null>(null);
  const app = useEditorStore((state) => state.app);
  const currentProjectId = useEditorStore((state) => state.currentProjectId);
  const currentProjectMeta = useEditorStore((state) => state.currentProjectMeta);
  const loadedAiLibrary = useEditorStore((state) => state.loadedAiLibrary);
  const pendingAiImageGenerations = useEditorStore((state) => state.pendingAiImageGenerations);
  const localProjectAssets = useEditorStore((state) => state.localProjectAssets);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const hasUnsavedChanges = useEditorStore((state) => state.hasUnsavedChanges);
  const projectListDialogOpen = useEditorStore((state) => state.projectListDialogOpen);
  const projectSaveDialogOpen = useEditorStore((state) => state.projectSaveDialogOpen);
  const registerLocalProjectAsset = useEditorStore((state) => state.registerLocalProjectAsset);
  const clearLocalProjectAssets = useEditorStore((state) => state.clearLocalProjectAssets);
  const clearPendingAiGenerations = useEditorStore((state) => state.clearPendingAiGenerations);
  const setCurrentProject = useEditorStore((state) => state.setCurrentProject);
  const setProjectMeta = useEditorStore((state) => state.setProjectMeta);
  const setLoadedAiLibrary = useEditorStore((state) => state.setLoadedAiLibrary);
  const markUnsavedChanges = useEditorStore((state) => state.markUnsavedChanges);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
  const beginSceneLoading = useEditorStore((state) => state.beginSceneLoading);
  const endSceneLoading = useEditorStore((state) => state.endSceneLoading);
  const setProjectListDialogOpen = useEditorStore((state) => state.setProjectListDialogOpen);
  const setProjectSaveDialogOpen = useEditorStore((state) => state.setProjectSaveDialogOpen);
  const removeAiLibraryResult = useEditorStore((state) => state.removeAiLibraryResult);
  const [aiLibraryDialogOpen, setAiLibraryDialogOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isProjectListLoading, setIsProjectListLoading] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [projectListError, setProjectListError] = useState<string | null>(null);
  const [polyhavenHdriDialogOpen, setPolyhavenHdriDialogOpen] = useState(false);
  const [polyhavenModelDialogOpen, setPolyhavenModelDialogOpen] = useState(false);
  const isPolyhavenEnabled = isPolyhavenProviderEnabled();
  const isSaving = saveStatus.phase === "saving";
  const aiLibraryAssetCount =
    loadedAiLibrary.imageGenerations.reduce((count, generation) => count + generation.results.length, 0) +
    pendingAiImageGenerations.reduce((count, generation) => count + generation.results.length, 0);

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
    clearPendingAiGenerations();
    clearLocalProjectAssets();
  };

  const confirmDiscardUnsavedChanges = () => {
    return !hasUnsavedChanges || window.confirm(t("editor.project.confirmDiscardChanges"));
  };

  const applyPersistedProjectState = (project: PersistedProject, fallbackMeta: EditorProjectMetaJSON | null = null) => {
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

  const loadProjectsForDialog = async () => {
    setProjectListError(null);
    setIsProjectListLoading(true);

    try {
      const response = await listProjects();
      setProjects(response.projects);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("editor.project.loadListFailed");
      setProjectListError(message);
    } finally {
      setIsProjectListLoading(false);
    }
  };

  const onImportModel = () => {
    modelImportInputRef.current?.click();
  };

  const onImportPano = () => {
    panoImportInputRef.current?.click();
  };

  const onImportLibraryHdri = () => {
    if (!isPolyhavenEnabled) {
      return;
    }

    setPolyhavenHdriDialogOpen(true);
  };

  const onImportLibraryModel = () => {
    if (!isPolyhavenEnabled) {
      return;
    }

    setPolyhavenModelDialogOpen(true);
  };

  const onImportModelFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!app || !file) return;
    if (!inferModelFileFormat(file.name)) return;

    const imported = await app.importModel(file);
    if (!imported) {
      return;
    }

    registerLocalProjectAsset({
      sourceUrl: imported.sourceUrl,
      file,
      kind: "model_source",
      targetPath: `model:${imported.entityId}`,
      entityId: imported.entityId
    });
  };

  const onImportPanoFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!app || !file) return;

    if (isHighDynamicRangeEnvironmentAssetName(file.name)) {
      try {
        const imported = await app.importPanorama(file);
        if (imported?.sourceUrl) {
          registerLocalProjectAsset({
            sourceUrl: imported.sourceUrl,
            file,
            kind: "environment_image",
            targetPath: "env:pano"
          });
        }
      } catch {
        window.alert(t("editor.import.panoLoadError"));
      }
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    try {
      const dimensions = await readImageDimensions(imageUrl);
      if (dimensions.width !== dimensions.height * 2) {
        window.alert(t("editor.import.panoRatioError"));
        return;
      }

      const imported = await app.importPanorama(file);
      if (imported?.sourceUrl) {
        registerLocalProjectAsset({
          sourceUrl: imported.sourceUrl,
          file,
          kind: "environment_image",
          targetPath: "env:pano"
        });
      }
    } catch {
      window.alert(t("editor.import.panoLoadError"));
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

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
      const uploadedAi = await uploadPendingAiGenerations(
        snapshot,
        projectId,
        loadedAiLibrary,
        pendingAiImageGenerations,
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
    if (!confirmDiscardUnsavedChanges()) {
      return;
    }

    await loadDefaultProject();
  };

  const onClearProject = async () => {
    if (!app) return;
    if (!confirmDiscardUnsavedChanges()) {
      return;
    }

    await app.dispatch({ type: "project.clear" });
    markUnsavedChanges(true);
  };

  const onDeleteAiLibraryAsset = (payload: {
    source: "loaded" | "pending";
    generationId: string;
    resultId: string;
  }) => {
    const pendingImageUrl =
      payload.source === "pending"
        ? pendingAiImageGenerations
            .find((generation) => generation.id === payload.generationId)
            ?.results.find((result) => result.id === payload.resultId)?.sourceUrl ?? null
        : null;

    if (app && pendingImageUrl) {
      clearProjectTextureReferencesByUrl(app, pendingImageUrl);
    }

    removeAiLibraryResult(payload);
    markUnsavedChanges(true);
  };

  const openProjectSelectDialog = async () => {
    setProjectListDialogOpen(true);
    await loadProjectsForDialog();
  };

  const onSelectProject = async (projectId: string) => {
    if (!app) {
      return;
    }

    if (!confirmDiscardUnsavedChanges()) {
      return;
    }

    setProjectListError(null);
    setProjectListDialogOpen(false);

    try {
      const response = await runWithSceneLoading(async () => {
        const projectResponse = await getProject(projectId);
        await app.dispatch({
          type: "project.load",
          project: prepareProjectForLoad(projectResponse.project)
        });
        return projectResponse;
      });

      applyPersistedProjectState(response.project);
      setSaveStatus(createIdleSaveStatus());
    } catch (error) {
      const message = error instanceof Error ? error.message : t("editor.project.loadFailed");
      setProjectListDialogOpen(true);
      setProjectListError(message);
    }
  };

  const onDeleteProject = async (projectId: string) => {
    const project = projects.find((item) => item.id === projectId) ?? null;
    const projectTitle = project?.title ?? t("editor.project.untitled");

    if (currentProjectId === projectId && hasUnsavedChanges) {
      if (!window.confirm(t("editor.project.confirmDiscardChanges"))) {
        return;
      }
    }

    if (!window.confirm(t("editor.project.deleteConfirm", { title: projectTitle }))) {
      return;
    }

    setProjectListError(null);
    setDeletingProjectId(projectId);

    try {
      await deleteProject(projectId);
      setProjects((current) => current.filter((item) => item.id !== projectId));

      if (currentProjectId === projectId) {
        await loadDefaultProject();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("editor.project.deleteFailed");
      setProjectListError(message);
    } finally {
      setDeletingProjectId(null);
    }
  };

  const onApplyExternalHdri = async ({ asset, file }: ExternalHdriApplyPayload) => {
    if (!app) {
      return;
    }

    await app.dispatch({
      type: "scene.envConfig.patch",
      patch: {
        panoAssetId: "",
        panoAssetName: file.fileName,
        panoUrl: file.url,
        externalSource: createExternalAssetSource(asset, file)
      },
      source: "ui"
    });
    app.setSelectedEntity(SCENE_NODE_ID);
  };

  const onApplyExternalModel = async ({ asset, file }: ExternalModelApplyPayload) => {
    if (!app) {
      return;
    }

    await app.importModelFromSource({
      sourceUrl: file.url,
      format: file.format,
      label: asset.displayName,
      externalSource: createExternalAssetSource(asset, file)
    });
  };

  return {
    aiLibraryAssetCount,
    aiLibraryDialogOpen,
    app,
    closeAiLibraryDialog: () => setAiLibraryDialogOpen(false),
    closePolyhavenHdriDialog: () => setPolyhavenHdriDialogOpen(false),
    closePolyhavenModelDialog: () => setPolyhavenModelDialogOpen(false),
    closeProjectListDialog: () => setProjectListDialogOpen(false),
    closeProjectSaveDialog: () => setProjectSaveDialogOpen(false),
    currentProjectMeta,
    deletingProjectId,
    executeSave,
    isPolyhavenEnabled,
    isProjectListLoading,
    isSaving,
    loadedAiLibrary,
    modelImportInputRef,
    onApplyExternalHdri,
    onApplyExternalModel,
    onClearProject,
    onCreateProject,
    onDeleteAiLibraryAsset,
    onDeleteProject,
    onImportLibraryHdri,
    onImportLibraryModel,
    onImportModel,
    onImportModelFile,
    onImportPano,
    onImportPanoFile,
    onSaveScene,
    onSelectProject,
    openAiLibraryDialog: () => setAiLibraryDialogOpen(true),
    openProjectSelectDialog,
    panoImportInputRef,
    pendingAiImageGenerations,
    polyhavenHdriDialogOpen,
    polyhavenModelDialogOpen,
    projectListDialogOpen,
    projectListError,
    projectSaveDialogOpen,
    projects,
    resetSaveStatus: () => setSaveStatus(createIdleSaveStatus()),
    saveStatus
  };
}
