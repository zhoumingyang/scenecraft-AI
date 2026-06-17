"use client";

import { useEffect } from "react";
import DropdownMenu from "@/components/common/dropdownMenu";
import LightingConflictToast from "@/components/editor/lightingConflictToast";
import {
  ExternalAssetBrowserDialog
} from "@/components/editor/externalAssetBrowserDialog";
import ProjectAiLibraryDialog from "@/components/editor/projectAiLibraryDialog";
import ProjectSaveDialog from "@/components/editor/projectSaveDialog";
import ProjectSaveProgressToast from "@/components/editor/projectSaveProgressToast";
import ProjectSelectDialog from "@/components/editor/projectSelectDialog";
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
  const studioDisabledMenuIds = isStudioSceneActive ? (["project", "camera"] as const) : [];

  const actions = useTopBarProjectActions(t);
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

      <TopBarActionBar
        aiLibraryAssetCount={actions.aiLibraryAssetCount}
        disabled={false}
        disabledMenuIds={[...studioDisabledMenuIds]}
        saveDisabled={isStudioSceneActive}
        clearDisabled={isStudioSceneActive}
        dropdownConfigs={dropdownConfigs}
        onClearProject={actions.onClearProject}
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
