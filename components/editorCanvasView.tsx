"use client";

import { useEffect, useRef } from "react";
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
import { useEditorThemePersistence } from "@/components/editor/useEditorThemePersistence";
import { useInitialEditorProjectLoad } from "@/components/editor/useInitialEditorProjectLoad";
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
  const setSelectedEntityId = useEditorStore((state) => state.setSelectedEntityId);
  const setStudioSceneState = useEditorStore((state) => state.setStudioSceneState);
  const theme = getEditorThemeTokens(editorThemeMode);

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
