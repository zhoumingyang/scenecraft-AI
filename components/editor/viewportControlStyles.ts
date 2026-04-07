import { getEditorThemeTokens } from "@/components/editor/theme";
import type { EditorThemeMode } from "@/stores/editorStore";

export const VIEWPORT_CONTROL_HEIGHT = 31.3;

export function getViewportPillSx(mode: EditorThemeMode) {
  const theme = getEditorThemeTokens(mode);

  return {
    height: VIEWPORT_CONTROL_HEIGHT,
    borderRadius: 99,
    border: theme.pillBorder,
    background: theme.pillBg,
    color: theme.pillText,
    backdropFilter: "blur(10px)",
    boxShadow: theme.pillShadow
  } as const;
}
