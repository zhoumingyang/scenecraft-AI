import type { EditorRenderMode } from "@/render/editor/core/types";

export function shouldOfferAiRenderExportOptimization(renderMode: EditorRenderMode) {
  return renderMode === "pathTrace";
}
