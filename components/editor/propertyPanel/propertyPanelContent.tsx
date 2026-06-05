"use client";

import { Box } from "@mui/material";
import AiImagePropertyPanel from "@/components/editor/aiImagePropertyPanel";
import { EntityInspectorContent } from "./entityInspectorContent";
import type { PropertyPanelContentProps } from "./types";

export function PropertyPanelContent(props: PropertyPanelContentProps) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        maxHeight: "100%",
        overflowY: "auto",
        pr: 0.25
      }}
    >
      {props.inspectorMode === "ai" ? <AiImagePropertyPanel /> : <EntityInspectorContent {...props} />}
    </Box>
  );
}
