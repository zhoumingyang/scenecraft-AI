"use client";

import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import {
  AiImageComposer,
  AvatarMenu,
  PropertyPanel,
  SceneLoadingOverlay,
  SceneTreePanel,
  TopBar,
  ViewportControls
} from "@/components/editor";
import { getProject } from "@/frontend/api/projects";
import { createEmptyProjectAiLibrary } from "@/lib/project/schema";
import { createDefaultEditorProjectJSON } from "@/render/editor";
import { createEditorSdk } from "@/render/editor/sdk";
import { useEditorStore } from "@/stores/editorStore";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { syncEditorProjectSearchParam } from "@/components/editor/projectPersistence";
import {
  applyGroundFallbackFromViewHelperStorage,
  restoreViewHelperVisibility
} from "@/components/editor/viewHelperPreferences";

type EditorCanvasViewProps = {
  userEmail: string | null;
};

export default function EditorCanvasView({ userEmail }: EditorCanvasViewProps) {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const setApp = useEditorStore((state) => state.setApp);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const setEditorThemeMode = useEditorStore((state) => state.setEditorThemeMode);
  const setSelectedEntityId = useEditorStore((state) => state.setSelectedEntityId);
  const setCurrentProject = useEditorStore((state) => state.setCurrentProject);
  const setProjectMeta = useEditorStore((state) => state.setProjectMeta);
  const setLoadedAiLibrary = useEditorStore((state) => state.setLoadedAiLibrary);
  const clearPendingAiGenerations = useEditorStore((state) => state.clearPendingAiGenerations);
  const clearLocalProjectAssets = useEditorStore((state) => state.clearLocalProjectAssets);
  const markUnsavedChanges = useEditorStore((state) => state.markUnsavedChanges);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
  const syncLightingConflictNotice = useEditorStore((state) => state.syncLightingConflictNotice);
  const resetLightingConflictNotice = useEditorStore((state) => state.resetLightingConflictNotice);
  const beginSceneLoading = useEditorStore((state) => state.beginSceneLoading);
  const endSceneLoading = useEditorStore((state) => state.endSceneLoading);
  const bumpProjectVersion = useEditorStore((state) => state.bumpProjectVersion);
  const bumpEntityRenderVersion = useEditorStore((state) => state.bumpEntityRenderVersion);
  const bumpProjectLoadVersion = useEditorStore((state) => state.bumpProjectLoadVersion);
  const bumpCameraVersion = useEditorStore((state) => state.bumpCameraVersion);
  const bumpViewStateVersion = useEditorStore((state) => state.bumpViewStateVersion);
  const setAiInspectorMode = useEditorStore((state) => state.setAiInspectorMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  useEffect(() => {
    if (!canvasHostRef.current) return;

    const app = createEditorSdk(canvasHostRef.current);
    setApp(app);
    let frameRequestId = 0;
    let pendingEntityRenderVersion = false;
    let disposed = false;

    const syncLightingConflictState = (reset = false) => {
      if (reset) {
        resetLightingConflictNotice();
      }
      syncLightingConflictNotice(app.getLightingConflictState());
    };

    const flushRenderDrivenUpdates = () => {
      frameRequestId = 0;
      if (disposed) return;

      if (pendingEntityRenderVersion) {
        pendingEntityRenderVersion = false;
        bumpEntityRenderVersion();
      }
    };

    const scheduleRenderDrivenUpdates = () => {
      if (frameRequestId !== 0 || disposed) return;
      frameRequestId = window.requestAnimationFrame(flushRenderDrivenUpdates);
    };

    const unsubscribe = app.subscribe((event) => {
      if (event.type === "selectionChanged") {
        setSelectedEntityId(event.selectedEntityId);
        if (event.selectedEntityId) {
          setAiInspectorMode("entity");
        }
        return;
      }

      if (event.type === "projectLoaded") {
        bumpProjectLoadVersion();
        bumpProjectVersion();
        bumpCameraVersion();
        bumpViewStateVersion();
        markUnsavedChanges(false);
        syncLightingConflictState(true);
        return;
      }

      if (event.type === "entityUpdated") {
        if (event.source === "render") {
          pendingEntityRenderVersion = true;
          scheduleRenderDrivenUpdates();
        }
        bumpProjectVersion();
        markUnsavedChanges(true);
        if (event.entityKind === "light") {
          syncLightingConflictState();
        }
        return;
      }

      if (event.type === "cameraUpdated") {
        if (event.source !== "render") {
          bumpCameraVersion();
        }
        markUnsavedChanges(true);
        return;
      }

      if (event.type === "sceneUpdated") {
        bumpProjectVersion();
        bumpViewStateVersion();
        markUnsavedChanges(true);
        syncLightingConflictState();
        return;
      }

      if (event.type === "viewStateUpdated") {
        bumpViewStateVersion();
      }
    });

    app.start();
    void (async () => {
      beginSceneLoading();
      try {
        const initialProjectId = new URL(window.location.href).searchParams.get("projectId");

        if (initialProjectId) {
          try {
            const response = await getProject(initialProjectId);
            const project = applyGroundFallbackFromViewHelperStorage(
              response.project.snapshot,
              response.project.id
            );
            await app.dispatch({
              type: "project.load",
              project
            });
            restoreViewHelperVisibility(app, response.project.id);
            setCurrentProject(response.project.id);
            setProjectMeta(project.meta ?? null);
            setLoadedAiLibrary(response.project.aiSnapshot);
            clearPendingAiGenerations();
            clearLocalProjectAssets();
            syncEditorProjectSearchParam(response.project.id);
            setSaveStatus({
              phase: "idle",
              message: null,
              updatedAt: Date.now()
            });
            return;
          } catch (error) {
            console.error("[editor] Failed to load project from URL", error);
            syncEditorProjectSearchParam(null);
          }
        }

        const defaultProject = createDefaultEditorProjectJSON();
        await app.dispatch({
          type: "project.load",
          project: defaultProject
        });
        restoreViewHelperVisibility(app, null);
        setCurrentProject(null);
        setProjectMeta(defaultProject.meta ?? null);
        setLoadedAiLibrary(createEmptyProjectAiLibrary());
        clearPendingAiGenerations();
        clearLocalProjectAssets();
      } finally {
        endSceneLoading();
      }
    })();

    return () => {
      disposed = true;
      if (frameRequestId !== 0) {
        window.cancelAnimationFrame(frameRequestId);
      }
      unsubscribe();
      app.dispose();
      setApp(null);
      setSelectedEntityId(null);
    };
  }, [
    clearLocalProjectAssets,
    clearPendingAiGenerations,
    bumpProjectLoadVersion,
    bumpProjectVersion,
    bumpEntityRenderVersion,
    bumpCameraVersion,
    bumpViewStateVersion,
    markUnsavedChanges,
    syncLightingConflictNotice,
    resetLightingConflictNotice,
    setApp,
    setCurrentProject,
    setLoadedAiLibrary,
    setProjectMeta,
    setSaveStatus,
    setSelectedEntityId,
    setAiInspectorMode,
    beginSceneLoading,
    endSceneLoading
  ]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("editor-theme-mode");
    if (savedTheme === "dark" || savedTheme === "light") {
      setEditorThemeMode(savedTheme);
    }
  }, [setEditorThemeMode]);

  useEffect(() => {
    window.localStorage.setItem("editor-theme-mode", editorThemeMode);
  }, [editorThemeMode]);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        color: theme.pillText,
        colorScheme: editorThemeMode
      }}
    >
      <Box
        ref={canvasHostRef}
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 0
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background: `${theme.rootGlow}, ${theme.rootTint}`
        }}
      />
      <TopBar />
      <AvatarMenu userEmail={userEmail} />
      <SceneTreePanel />
      <ViewportControls />
      <PropertyPanel />
      <AiImageComposer />
      <SceneLoadingOverlay />
    </Box>
  );
}
