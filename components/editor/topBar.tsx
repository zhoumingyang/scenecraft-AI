"use client";

import { useEffect, useRef, useState } from "react";
import DropdownMenu from "@/components/common/dropdownMenu";
import LightingConflictToast from "@/components/editor/lightingConflictToast";
import { useEditorConfirmationDialog } from "@/components/editor/editorConfirmationDialog";
import {
  ExternalAssetBrowserDialog
} from "@/components/editor/externalAssetBrowserDialog";
import ProjectAiLibraryDialog from "@/components/editor/projectAiLibraryDialog";
import ProjectSaveDialog from "@/components/editor/projectSaveDialog";
import ProjectSaveProgressToast from "@/components/editor/projectSaveProgressToast";
import ProjectSelectDialog from "@/components/editor/projectSelectDialog";
import RenderExportProgressToast, {
  type RenderExportProgressStatus
} from "@/components/editor/renderExportProgressToast";
import { EDITOR_SAVE_SHORTCUT_EVENT } from "@/components/editor/keyboardShortcuts";
import { dropdownConfigs } from "@/components/editor/topBar/constants";
import TopBarActionBar from "@/components/editor/topBar/topBarActionBar";
import { useTopBarMenu } from "@/components/editor/topBar/useTopBarMenu";
import { useTopBarProjectActions } from "@/components/editor/topBar/useTopBarProjectActions";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";

export default function TopBar() {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const projectLoadVersion = useEditorStore((state) => state.projectLoadVersion);
  const lightingConflictNotice = useEditorStore((state) => state.lightingConflictNotice);
  const isStudioSceneActive = useEditorStore((state) => state.studioScene.active);
  const dismissLightingConflictNotice = useEditorStore((state) => state.dismissLightingConflictNotice);
  const theme = getEditorThemeTokens(editorThemeMode);
  const { confirm, confirmationDialog, notify } = useEditorConfirmationDialog({ theme, t });
  const studioDisabledMenuIds = isStudioSceneActive ? (["project", "camera"] as const) : [];
  const renderExportControllerRef = useRef<AbortController | null>(null);
  const [renderExportStatus, setRenderExportStatus] = useState<RenderExportProgressStatus>({
    active: false,
    progress: 0,
    message: ""
  });

  const actions = useTopBarProjectActions({ confirm, notify, t });
  useEffect(() => {
    const handleSaveShortcut = () => {
      if (isStudioSceneActive) return;
      actions.onSaveScene();
    };

    window.addEventListener(EDITOR_SAVE_SHORTCUT_EVENT, handleSaveShortcut);

    return () => {
      window.removeEventListener(EDITOR_SAVE_SHORTCUT_EVENT, handleSaveShortcut);
    };
  }, [actions.onSaveScene, isStudioSceneActive]);

  useEffect(() => {
    return () => {
      renderExportControllerRef.current?.abort();
    };
  }, []);

  const menu = useTopBarMenu({
    app: actions.app,
    disabled: false,
    disabledMenuIds: [...studioDisabledMenuIds],
    isPolyhavenEnabled: actions.isPolyhavenEnabled,
    onCreateProject: actions.onCreateProject,
    onImportLibraryHdri: actions.onImportLibraryHdri,
    onImportLibraryModel: actions.onImportLibraryModel,
    onImportModel: actions.onImportModel,
    onImportPano: actions.onImportPano,
    onOpenProjectSelectDialog: actions.openProjectSelectDialog,
    projectLoadVersion,
    t
  });

  const handleExportRender = async () => {
    if (!actions.app || renderExportStatus.active) return;

    const controller = new AbortController();
    renderExportControllerRef.current = controller;
    setRenderExportStatus({
      active: true,
      progress: 0,
      message: t("editor.export.preparing")
    });

    try {
      const dataUrl = await actions.app.captureViewportImageAsync("clean", {
        signal: controller.signal,
        onProgress: (progress) => {
          setRenderExportStatus({
            active: true,
            progress: progress.progress,
            message: t("editor.export.rendering")
          });
        }
      });
      downloadDataUrl(dataUrl, createRenderExportFileName());
      setRenderExportStatus({
        active: false,
        progress: 0,
        message: ""
      });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        console.error("[editor] Render export failed.", error);
        await notify({ message: t("editor.export.failed") });
      }
      setRenderExportStatus({
        active: false,
        progress: 0,
        message: ""
      });
    } finally {
      if (renderExportControllerRef.current === controller) {
        renderExportControllerRef.current = null;
      }
    }
  };

  const handleCancelRenderExport = () => {
    renderExportControllerRef.current?.abort();
  };

  return (
    <>
      <input
        ref={actions.modelImportInputRef}
        type="file"
        accept=".gltf,.glb,.fbx,.obj,.vrm"
        onChange={actions.onImportModelFile}
        style={{ display: "none" }}
      />
      <input
        ref={actions.panoImportInputRef}
        type="file"
        accept="image/*,.hdr,.exr"
        onChange={actions.onImportPanoFile}
        style={{ display: "none" }}
      />

      <ExternalAssetBrowserDialog
        open={actions.polyhavenHdriDialogOpen}
        theme={theme}
        assetType="hdri"
        onClose={actions.closePolyhavenHdriDialog}
        onApplyHdri={actions.onApplyExternalHdri}
      />

      <ExternalAssetBrowserDialog
        open={actions.polyhavenModelDialogOpen}
        theme={theme}
        assetType="model"
        onClose={actions.closePolyhavenModelDialog}
        onApplyModel={actions.onApplyExternalModel}
      />

      {confirmationDialog}

      <TopBarActionBar
        aiLibraryAssetCount={actions.aiLibraryAssetCount}
        disabled={false}
        disabledMenuIds={[...studioDisabledMenuIds]}
        exportDisabled={renderExportStatus.active || !actions.app}
        saveDisabled={isStudioSceneActive}
        clearDisabled={isStudioSceneActive}
        dropdownConfigs={dropdownConfigs}
        onClearProject={actions.onClearProject}
        onExportRender={handleExportRender}
        onOpenAiLibrary={actions.openAiLibraryDialog}
        onOpenMenu={menu.openMenu}
        onSaveScene={actions.onSaveScene}
        t={t}
        theme={theme}
      />

      <DropdownMenu
        anchorEl={menu.anchorEl}
        open={Boolean(menu.anchorEl)}
        onClose={menu.closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        items={menu.activeItems}
        themeMode={editorThemeMode}
      />

      <ProjectSaveDialog
        open={actions.projectSaveDialogOpen}
        initialMeta={actions.currentProjectMeta}
        theme={theme}
        isSaving={actions.isSaving}
        onClose={actions.closeProjectSaveDialog}
        onConfirm={(meta) => {
          void actions.executeSave(meta);
        }}
      />

      <ProjectSelectDialog
        open={actions.projectListDialogOpen}
        projects={actions.projects}
        isLoading={actions.isProjectListLoading}
        deletingProjectId={actions.deletingProjectId}
        errorMessage={actions.projectListError}
        theme={theme}
        onClose={actions.closeProjectListDialog}
        onSelectProject={(projectId) => {
          void actions.onSelectProject(projectId);
        }}
        onDeleteProject={(projectId) => {
          void actions.onDeleteProject(projectId);
        }}
      />

      <ProjectAiLibraryDialog
        open={actions.aiLibraryDialogOpen}
        theme={theme}
        loadedLibrary={actions.loadedAiLibrary}
        pendingAssets={actions.pendingAiAssets}
        onClose={actions.closeAiLibraryDialog}
        onDeleteAsset={actions.onDeleteAiLibraryAsset}
      />

      <ProjectSaveProgressToast
        status={actions.saveStatus}
        theme={theme}
        onClose={actions.resetSaveStatus}
      />

      <RenderExportProgressToast
        status={renderExportStatus}
        theme={theme}
        onCancel={handleCancelRenderExport}
      />

      <LightingConflictToast
        notice={lightingConflictNotice}
        theme={theme}
        onClose={dismissLightingConflictNotice}
        onRemoveFillLights={() => {
          actions.app?.removeEnvironmentFillLights();
        }}
      />
    </>
  );
}

function createRenderExportFileName() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `scenecraft-render-${timestamp}.png`;
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
