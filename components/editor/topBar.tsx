"use client";

import { useEffect } from "react";
import { Box } from "@mui/material";
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
import RenderExportProgressToast from "@/components/editor/renderExportProgressToast";
import { EDITOR_SAVE_SHORTCUT_EVENT } from "@/components/editor/keyboardShortcuts";
import { dropdownConfigs } from "@/components/editor/topBar/constants";
import TopBarActionBar from "@/components/editor/topBar/topBarActionBar";
import TopBarHistoryControls from "@/components/editor/topBar/topBarHistoryControls";
import { useEditorTheme } from "@/components/editor/editorThemeContext";
import { useRenderExport } from "@/components/editor/topBar/useRenderExport";
import { useTopBarMenu } from "@/components/editor/topBar/useTopBarMenu";
import { useTopBarProjectActions } from "@/components/editor/topBar/useTopBarProjectActions";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";

export default function TopBar() {
  const { t } = useI18n();
  const projectLoadVersion = useEditorStore((state) => state.projectLoadVersion);
  const lightingConflictNotice = useEditorStore((state) => state.lightingConflictNotice);
  const historyState = useEditorStore((state) => state.historyState);
  const isStudioSceneActive = useEditorStore((state) => state.studioScene.active);
  const dismissLightingConflictNotice = useEditorStore((state) => state.dismissLightingConflictNotice);
  const { mode: editorThemeMode, theme } = useEditorTheme();
  const { confirm, confirmationDialog, notify } = useEditorConfirmationDialog({ theme, t });
  const studioDisabledMenuIds = isStudioSceneActive ? (["project", "camera"] as const) : [];
  const actions = useTopBarProjectActions({ confirm, notify, t });
  const {
    onCancelRenderExport,
    onExportRender,
    renderExportStatus
  } = useRenderExport({
    app: actions.app,
    confirm,
    t
  });

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

  const handleUndo = () => {
    void actions.app?.undo();
  };

  const handleRedo = () => {
    void actions.app?.redo();
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
        assetType="hdri"
        onClose={actions.closePolyhavenHdriDialog}
        onApplyHdri={actions.onApplyExternalHdri}
      />

      <ExternalAssetBrowserDialog
        open={actions.polyhavenModelDialogOpen}
        assetType="model"
        onClose={actions.closePolyhavenModelDialog}
        onApplyModel={actions.onApplyExternalModel}
      />

      {confirmationDialog}

      <Box
        sx={{
          position: "absolute",
          top: 16,
          left: 0,
          right: 0,
          zIndex: 20,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          columnGap: 1,
          alignItems: "start",
          px: 2,
          pointerEvents: "none"
        }}
      >
        <Box />
        <TopBarActionBar
          aiLibraryAssetCount={actions.aiLibraryAssetCount}
          disabled={false}
          disabledMenuIds={[...studioDisabledMenuIds]}
          exportDisabled={renderExportStatus.active || !actions.app}
          saveDisabled={isStudioSceneActive}
          clearDisabled={isStudioSceneActive}
          dropdownConfigs={dropdownConfigs}
          onClearProject={actions.onClearProject}
          onExportRender={onExportRender}
          onOpenAiLibrary={actions.openAiLibraryDialog}
          onOpenMenu={menu.openMenu}
          onSaveScene={actions.onSaveScene}
          t={t}
        />
        <TopBarHistoryControls
          disabled={false}
          historyState={historyState}
          onRedo={handleRedo}
          onUndo={handleUndo}
          t={t}
          sx={{
            justifySelf: "start"
          }}
        />
      </Box>

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
        loadedLibrary={actions.loadedAiLibrary}
        pendingAssets={actions.pendingAiAssets}
        onClose={actions.closeAiLibraryDialog}
        onDeleteAsset={actions.onDeleteAiLibraryAsset}
      />

      <ProjectSaveProgressToast
        status={actions.saveStatus}
        onClose={actions.resetSaveStatus}
      />

      <RenderExportProgressToast
        status={renderExportStatus}
        onCancel={onCancelRenderExport}
      />

      <LightingConflictToast
        notice={lightingConflictNotice}
        onClose={dismissLightingConflictNotice}
        onRemoveFillLights={() => {
          actions.app?.removeEnvironmentFillLights();
        }}
      />
    </>
  );
}
