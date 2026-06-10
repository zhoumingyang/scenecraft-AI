"use client";

import { useEffect } from "react";
import type { EditorSdk } from "@/render/editor";
import { createDefaultEditorProjectJSON } from "@/render/editor";
import { getProject } from "@/frontend/api/projects";
import { createEmptyProjectAiLibrary } from "@/lib/project/schema";
import { useEditorStore } from "@/stores/editorStore";
import { syncEditorProjectSearchParam } from "./projectPersistence";
import {
  applyGroundFallbackFromViewHelperStorage,
  restoreViewHelperVisibility
} from "./viewHelperPreferences";

type UseInitialEditorProjectLoadOptions = {
  app: EditorSdk | null;
};

export function useInitialEditorProjectLoad({
  app
}: UseInitialEditorProjectLoadOptions) {
  const setCurrentProject = useEditorStore((state) => state.setCurrentProject);
  const setProjectMeta = useEditorStore((state) => state.setProjectMeta);
  const setLoadedAiLibrary = useEditorStore((state) => state.setLoadedAiLibrary);
  const clearPendingAiAssets = useEditorStore((state) => state.clearPendingAiAssets);
  const clearLocalProjectAssets = useEditorStore((state) => state.clearLocalProjectAssets);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
  const beginSceneLoading = useEditorStore((state) => state.beginSceneLoading);
  const endSceneLoading = useEditorStore((state) => state.endSceneLoading);

  useEffect(() => {
    if (!app) return;

    let cancelled = false;

    void (async () => {
      beginSceneLoading();
      try {
        const initialProjectId = new URL(window.location.href).searchParams.get("projectId");

        if (initialProjectId) {
          try {
            const response = await getProject(initialProjectId);
            if (cancelled) return;

            const project = applyGroundFallbackFromViewHelperStorage(
              response.project.snapshot,
              response.project.id
            );
            await app.dispatch({
              type: "project.load",
              project
            });
            if (cancelled) return;

            restoreViewHelperVisibility(app, response.project.id);
            setCurrentProject(response.project.id);
            setProjectMeta(project.meta ?? null);
            setLoadedAiLibrary(response.project.aiSnapshot);
            clearPendingAiAssets();
            clearLocalProjectAssets();
            syncEditorProjectSearchParam(response.project.id);
            setSaveStatus({
              phase: "idle",
              message: null,
              updatedAt: Date.now()
            });
            return;
          } catch (error) {
            console.error("[editor] Failed to load project from URL", error);
            syncEditorProjectSearchParam(null);
          }
        }

        const defaultProject = createDefaultEditorProjectJSON();
        await app.dispatch({
          type: "project.load",
          project: defaultProject
        });
        if (cancelled) return;

        restoreViewHelperVisibility(app, null);
        setCurrentProject(null);
        setProjectMeta(defaultProject.meta ?? null);
        setLoadedAiLibrary(createEmptyProjectAiLibrary());
        clearPendingAiAssets();
        clearLocalProjectAssets();
      } finally {
        if (!cancelled) {
          endSceneLoading();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    app,
    beginSceneLoading,
    clearLocalProjectAssets,
    clearPendingAiAssets,
    endSceneLoading,
    setCurrentProject,
    setLoadedAiLibrary,
    setProjectMeta,
    setSaveStatus
  ]);
}
