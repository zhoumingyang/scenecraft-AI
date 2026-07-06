"use client";

import { useCallback, useEffect, useRef } from "react";
import { Box } from "@mui/material";
import {
  AiImageComposer,
  AvatarMenu,
  PropertyPanel,
  SceneLoadingOverlay,
  SceneTreePanel,
  StudioSceneControls,
  TopBar,
  ViewportControls
} from "@/components/editor";
import { resolveStudioHdriUrl } from "@/components/editor/editorHdriResolver";
import { useEditorAppEventBridge } from "@/components/editor/useEditorAppEventBridge";
import { useEditorKeyboardShortcuts } from "@/components/editor/useEditorKeyboardShortcuts";
import { useEditorThemePersistence } from "@/components/editor/useEditorThemePersistence";
import { useInitialEditorProjectLoad } from "@/components/editor/useInitialEditorProjectLoad";
import { EDITOR_SAVE_SHORTCUT_EVENT } from "@/components/editor/keyboardShortcuts";
import { EditorThemeProvider, useEditorTheme } from "@/components/editor/editorThemeContext";
import { createEditorSdk } from "@/render/editor/sdk";
import { useEditorStore } from "@/stores/editorStore";

type EditorCanvasViewProps = {
  userEmail: string | null;
};

export default function EditorCanvasView({ userEmail }: EditorCanvasViewProps) {
  return (
    <EditorThemeProvider>
      <EditorCanvasViewContent userEmail={userEmail} />
    </EditorThemeProvider>
  );
}

function EditorCanvasViewContent({ userEmail }: EditorCanvasViewProps) {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const setApp = useEditorStore((state) => state.setApp);
  const setSelectedEntityId = useEditorStore((state) => state.setSelectedEntityId);
  const setStudioSceneState = useEditorStore((state) => state.setStudioSceneState);
  const selectedEntityId = useEditorStore((state) => state.selectedEntityId);
  const isStudioSceneActive = useEditorStore((state) => state.studioScene.active);
  const { mode: editorThemeMode, theme } = useEditorTheme();

  useEditorThemePersistence();

  useEffect(() => {
    if (!canvasHostRef.current) return;

    const app = createEditorSdk(canvasHostRef.current, {
      resolveStudioHdriUrl
    });
    setApp(app);
    app.start();

    return () => {
      app.dispose();
      setApp(null);
      setSelectedEntityId(null);
      setStudioSceneState({
        active: false,
        presetId: null,
        variantId: null,
        targetEntityId: null,
        productProfile: null,
        styleProfileId: null,
        styleSelectionMode: null,
        plinthKind: null,
        targetScale: 1,
        targetRotationY: 0,
        hdriStatus: "idle",
        hdriError: null
      });
    };
  }, [setApp, setSelectedEntityId, setStudioSceneState]);

  const app = useEditorStore((state) => state.app);
  useEditorAppEventBridge({ app });
  useInitialEditorProjectLoad({ app });
  const requestProjectSave = useCallback(() => {
    window.dispatchEvent(new CustomEvent(EDITOR_SAVE_SHORTCUT_EVENT));
  }, []);
  useEditorKeyboardShortcuts({
    app,
    onSaveProject: requestProjectSave,
    saveDisabled: isStudioSceneActive,
    selectedEntityId
  });

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
      <StudioSceneControls />
      <AiImageComposer />
      <SceneLoadingOverlay />
    </Box>
  );
}
