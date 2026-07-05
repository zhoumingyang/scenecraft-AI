"use client";

import { useEffect, useRef, useState } from "react";
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
import RenderExportProgressToast, {
  type RenderExportProgressStatus
} from "@/components/editor/renderExportProgressToast";
import { EDITOR_SAVE_SHORTCUT_EVENT } from "@/components/editor/keyboardShortcuts";
import { dropdownConfigs } from "@/components/editor/topBar/constants";
import TopBarActionBar from "@/components/editor/topBar/topBarActionBar";
import TopBarHistoryControls from "@/components/editor/topBar/topBarHistoryControls";
import { useTopBarMenu } from "@/components/editor/topBar/useTopBarMenu";
import { useTopBarProjectActions } from "@/components/editor/topBar/useTopBarProjectActions";
import { optimizeRenderExportImage } from "@/frontend/api/ai";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import type { EditorViewportCaptureImageMetadata } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";

const RENDER_EXPORT_MAX_IMAGE_BYTES = 700 * 1024;
const RENDER_EXPORT_MAX_DIMENSIONS = [1536, 1280, 1024, 960];
const RENDER_EXPORT_JPEG_QUALITIES = [0.9, 0.82, 0.74, 0.66, 0.58];

export default function TopBar() {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const projectLoadVersion = useEditorStore((state) => state.projectLoadVersion);
  const lightingConflictNotice = useEditorStore((state) => state.lightingConflictNotice);
  const historyState = useEditorStore((state) => state.historyState);
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

    const shouldOptimizeWithAi = await confirm({
      title: t("editor.export.aiOptimizeTitle"),
      message: t("editor.export.aiOptimizeMessage"),
      confirmLabel: t("editor.export.aiOptimizeConfirm"),
      cancelLabel: t("editor.export.aiOptimizeDirect")
    });
    const controller = new AbortController();
    renderExportControllerRef.current = controller;
    setRenderExportStatus({
      active: true,
      progress: 0,
      message: t("editor.export.preparing")
    });

    try {
      const captureMetadataRef: { current: EditorViewportCaptureImageMetadata | null } = {
        current: null
      };
      const dataUrl = await actions.app.captureViewportImageAsync("clean", {
        signal: controller.signal,
        image: {
          format: "compressed-jpeg",
          maxBytes: RENDER_EXPORT_MAX_IMAGE_BYTES,
          maxDimensions: RENDER_EXPORT_MAX_DIMENSIONS,
          qualities: RENDER_EXPORT_JPEG_QUALITIES
        },
        onImageEncoded: (metadata) => {
          captureMetadataRef.current = metadata;
        },
        onProgress: (progress) => {
          setRenderExportStatus({
            active: true,
            progress: progress.progress,
            message: t("editor.export.rendering")
          });
        }
      });

      if (!shouldOptimizeWithAi) {
        downloadDataUrl(dataUrl, createRenderExportFileName(dataUrl));
        setRenderExportStatus({
          active: false,
          progress: 0,
          message: ""
        });
        return;
      }

      const captureMetadata = captureMetadataRef.current;
      if (!captureMetadata) {
        throw new Error("Compressed render export metadata was not captured.");
      }

      setRenderExportStatus({
        active: true,
        indeterminate: true,
        progress: 1,
        message: t("editor.export.aiOptimizing")
      });

      try {
        const optimized = await optimizeRenderExportImage(
          {
            imageDataUrl: dataUrl,
            width: captureMetadata.width,
            height: captureMetadata.height
          },
          { signal: controller.signal }
        );
        downloadDataUrl(optimized.imageDataUrl, createRenderExportFileName(optimized.imageDataUrl, {
          aiOptimized: true
        }));
      } catch (optimizationError) {
        if (isRenderExportAbortError(optimizationError)) {
          throw optimizationError;
        }

        console.error("[editor] AI render export optimization failed.", optimizationError);
        downloadDataUrl(dataUrl, createRenderExportFileName(dataUrl));
      }

      setRenderExportStatus({
        active: false,
        progress: 0,
        message: ""
      });
    } catch (error) {
      if (!isRenderExportAbortError(error)) {
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
          onExportRender={handleExportRender}
          onOpenAiLibrary={actions.openAiLibraryDialog}
          onOpenMenu={menu.openMenu}
          onSaveScene={actions.onSaveScene}
          t={t}
          theme={theme}
        />
        <TopBarHistoryControls
          disabled={false}
          historyState={historyState}
          onRedo={handleRedo}
          onUndo={handleUndo}
          t={t}
          theme={theme}
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

function createRenderExportFileName(
  dataUrl: string,
  options: { aiOptimized?: boolean } = {}
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = options.aiOptimized ? "-ai" : "";
  return `scenecraft-render-${timestamp}${suffix}.${getDataUrlFileExtension(dataUrl)}`;
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

function getDataUrlFileExtension(dataUrl: string) {
  if (dataUrl.startsWith("data:image/png")) return "png";
  if (dataUrl.startsWith("data:image/webp")) return "webp";
  return "jpg";
}

function isRenderExportAbortError(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "CanceledError");
}
