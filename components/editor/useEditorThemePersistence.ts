"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/stores/editorStore";

export function useEditorThemePersistence() {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const setEditorThemeMode = useEditorStore((state) => state.setEditorThemeMode);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("editor-theme-mode");
    if (savedTheme === "dark" || savedTheme === "light") {
      setEditorThemeMode(savedTheme);
    }
  }, [setEditorThemeMode]);

  useEffect(() => {
    window.localStorage.setItem("editor-theme-mode", editorThemeMode);
  }, [editorThemeMode]);
}
