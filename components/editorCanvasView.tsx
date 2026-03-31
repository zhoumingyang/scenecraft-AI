"use client";

import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { AvatarMenu, SceneTreePanel, TopBar } from "@/components/editor";
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
        return;
      }

      if (event.type === "entityUpdated" || event.type === "cameraUpdated") {
        bumpProjectVersion();
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
  }, [bumpProjectLoadVersion, bumpProjectVersion, setApp, setSelectedEntityId]);

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
    </Box>
  );
}
