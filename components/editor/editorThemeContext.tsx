"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  getEditorThemeTokens,
  type EditorThemeTokens
} from "@/components/editor/theme";
import type { EditorThemeMode } from "@/stores/editorStore";
import { useEditorStore } from "@/stores/editorStore";

type EditorThemeContextValue = {
  mode: EditorThemeMode;
  theme: EditorThemeTokens;
};

const EditorThemeContext = createContext<EditorThemeContextValue | null>(null);

export function EditorThemeProvider({ children }: { children: ReactNode }) {
  const mode = useEditorStore((state) => state.editorThemeMode);
  const theme = useMemo(() => getEditorThemeTokens(mode), [mode]);
  const value = useMemo(() => ({ mode, theme }), [mode, theme]);

  return (
    <EditorThemeContext.Provider value={value}>
      {children}
    </EditorThemeContext.Provider>
  );
}

export function useEditorTheme() {
  const value = useContext(EditorThemeContext);

  if (!value) {
    throw new Error("useEditorTheme must be used within EditorThemeProvider.");
  }

  return value;
}
