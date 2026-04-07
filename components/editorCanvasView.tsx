"use client";

import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import {
  AiImageComposer,
  AvatarMenu,
  PropertyPanel,
  SceneTreePanel,
  TopBar,
  ViewportControls
} from "@/components/editor";
import { createDefaultEditorProjectJSON } from "@/render/editor";
import { createEditorSdk } from "@/render/editor/sdk";
import { useEditorStore } from "@/stores/editorStore";
import { getEditorThemeTokens } from "@/components/editor/theme";

type EditorCanvasViewProps = {
  userEmail: string | null;
};

export default function EditorCanvasView({ userEmail }: EditorCanvasViewProps) {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const setApp = useEditorStore((state) => state.setApp);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const setEditorThemeMode = useEditorStore((state) => state.setEditorThemeMode);
  const setSelectedEntityId = useEditorStore((state) => state.setSelectedEntityId);
  const bumpProjectVersion = useEditorStore((state) => state.bumpProjectVersion);
  const bumpProjectLoadVersion = useEditorStore((state) => state.bumpProjectLoadVersion);
  const bumpCameraVersion = useEditorStore((state) => state.bumpCameraVersion);
  const bumpViewStateVersion = useEditorStore((state) => state.bumpViewStateVersion);
  const setAiInspectorMode = useEditorStore((state) => state.setAiInspectorMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  useEffect(() => {
    if (!canvasHostRef.current) return;

    const app = createEditorSdk(canvasHostRef.current);
    setApp(app);

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
        return;
      }

      if (event.type === "entityUpdated") {
        bumpProjectVersion();
        return;
      }

      if (event.type === "cameraUpdated") {
        if (event.source !== "render") {
          bumpCameraVersion();
        }
        return;
      }

      if (event.type === "sceneUpdated") {
        bumpProjectVersion();
        bumpViewStateVersion();
        return;
      }

      if (event.type === "viewStateUpdated") {
        bumpViewStateVersion();
      }
    });

    app.start();
    void app.dispatch({
      type: "project.load",
      project: createDefaultEditorProjectJSON()
    });

    return () => {
      unsubscribe();
      app.dispose();
      setApp(null);
      setSelectedEntityId(null);
    };
  }, [
    bumpProjectLoadVersion,
    bumpProjectVersion,
    bumpCameraVersion,
    bumpViewStateVersion,
    setApp,
    setSelectedEntityId,
    setAiInspectorMode
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
    </Box>
  );
}
