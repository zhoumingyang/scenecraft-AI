"use client";

import type { SyntheticEvent } from "react";
import { Stack } from "@mui/material";
import { useEditorStore } from "@/stores/editorStore";
import FirstPersonHeightControl from "./firstPersonHeightControl";
import ViewControl from "./viewControl";

export default function ViewportControls() {
  const app = useEditorStore((state) => state.app);
  const cameraVersion = useEditorStore((state) => state.cameraVersion);
  const viewStateVersion = useEditorStore((state) => state.viewStateVersion);
  void cameraVersion;
  const isFirstPerson = app?.isFirstPersonCamera() ?? false;

  const stopCanvasInteraction = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      onPointerDown={stopCanvasInteraction}
      onMouseDown={stopCanvasInteraction}
      onClick={stopCanvasInteraction}
      sx={{
        position: "absolute",
        right: 20,
        bottom: 72,
        zIndex: 22
      }}
    >
      <ViewControl app={app} viewStateVersion={viewStateVersion} />
      <FirstPersonHeightControl app={app} isFirstPerson={isFirstPerson} />
    </Stack>
  );
}
