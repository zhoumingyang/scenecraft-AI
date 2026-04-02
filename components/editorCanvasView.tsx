"use client";

import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { AvatarMenu, PropertyPanel, SceneTreePanel, TopBar, ViewportControls } from "@/components/editor";
import { createDefaultEditorProjectJSON } from "@/render/editor";
import { createEditorSdk } from "@/render/editor/sdk";
import { useEditorStore } from "@/stores/editorStore";

type EditorCanvasViewProps = {
  userEmail: string | null;
};

export default function EditorCanvasView({ userEmail }: EditorCanvasViewProps) {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const setApp = useEditorStore((state) => state.setApp);
  const setSelectedEntityId = useEditorStore((state) => state.setSelectedEntityId);
  const bumpProjectVersion = useEditorStore((state) => state.bumpProjectVersion);
  const bumpProjectLoadVersion = useEditorStore((state) => state.bumpProjectLoadVersion);
  const bumpCameraVersion = useEditorStore((state) => state.bumpCameraVersion);
  const bumpViewStateVersion = useEditorStore((state) => state.bumpViewStateVersion);

  useEffect(() => {
    if (!canvasHostRef.current) return;

    const app = createEditorSdk(canvasHostRef.current);
    setApp(app);

    const unsubscribe = app.subscribe((event) => {
      if (event.type === "selectionChanged") {
        setSelectedEntityId(event.selectedEntityId);
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
    setSelectedEntityId
  ]);

  return (
    <Box sx={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Box
        ref={canvasHostRef}
        sx={{
          position: "absolute",
          inset: 0
        }}
      />
      <TopBar />
      <AvatarMenu userEmail={userEmail} />
      <SceneTreePanel />
      <ViewportControls />
      <PropertyPanel />
    </Box>
  );
}
