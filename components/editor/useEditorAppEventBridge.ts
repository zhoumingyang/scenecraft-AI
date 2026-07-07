"use client";

import { useEffect } from "react";
import type { EditorSdk } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";

type UseEditorAppEventBridgeOptions = {
  app: EditorSdk | null;
};

export function useEditorAppEventBridge({
  app
}: UseEditorAppEventBridgeOptions) {
  const setSelectedEntityIds = useEditorStore((state) => state.setSelectedEntityIds);
  const markUnsavedChanges = useEditorStore((state) => state.markUnsavedChanges);
  const syncLightingConflictNotice = useEditorStore((state) => state.syncLightingConflictNotice);
  const resetLightingConflictNotice = useEditorStore((state) => state.resetLightingConflictNotice);
  const bumpProjectVersion = useEditorStore((state) => state.bumpProjectVersion);
  const bumpEntityVersion = useEditorStore((state) => state.bumpEntityVersion);
  const bumpRenderEntityVersions = useEditorStore((state) => state.bumpRenderEntityVersions);
  const bumpSceneTreeVersion = useEditorStore((state) => state.bumpSceneTreeVersion);
  const bumpMeshListVersion = useEditorStore((state) => state.bumpMeshListVersion);
  const bumpProjectLoadVersion = useEditorStore((state) => state.bumpProjectLoadVersion);
  const bumpCameraVersion = useEditorStore((state) => state.bumpCameraVersion);
  const bumpViewStateVersion = useEditorStore((state) => state.bumpViewStateVersion);
  const setAiInspectorMode = useEditorStore((state) => state.setAiInspectorMode);
  const setHistoryState = useEditorStore((state) => state.setHistoryState);
  const setStudioSceneState = useEditorStore((state) => state.setStudioSceneState);

  useEffect(() => {
    if (!app) return;

    let frameRequestId = 0;
    let disposed = false;
    const pendingRenderEntityIds = new Set<string>();

    const syncLightingConflictState = (reset = false) => {
      if (reset) {
        resetLightingConflictNotice();
      }
      syncLightingConflictNotice(app.getLightingConflictState());
    };

    const flushRenderDrivenUpdates = () => {
      frameRequestId = 0;
      if (disposed) return;

      if (pendingRenderEntityIds.size > 0) {
        bumpRenderEntityVersions(Array.from(pendingRenderEntityIds));
        pendingRenderEntityIds.clear();
      }
    };

    const scheduleRenderDrivenUpdates = () => {
      if (frameRequestId !== 0 || disposed) return;
      frameRequestId = window.requestAnimationFrame(flushRenderDrivenUpdates);
    };

    const unsubscribe = app.subscribe((event) => {
      if (event.type === "selectionChanged") {
        setSelectedEntityIds(event.selectedEntityIds);
        if (event.selectedEntityId) {
          setAiInspectorMode("entity");
        }
        return;
      }

      if (event.type === "projectLoaded") {
        bumpProjectLoadVersion();
        bumpProjectVersion();
        bumpSceneTreeVersion();
        bumpMeshListVersion();
        bumpCameraVersion();
        bumpViewStateVersion();
        setHistoryState(app.getHistoryState());
        setStudioSceneState(app.getStudioSceneState());
        markUnsavedChanges(false);
        syncLightingConflictState(true);
        return;
      }

      if (event.type === "entityUpdated") {
        if (event.source === "render") {
          pendingRenderEntityIds.add(event.entityId);
          scheduleRenderDrivenUpdates();
        } else {
          bumpEntityVersion(event.entityId);
        }

        const affectsSceneTree = event.affectsSceneTree ?? true;
        if (affectsSceneTree) {
          bumpSceneTreeVersion();
        }

        const affectsMeshList =
          event.affectsMeshList ??
          (affectsSceneTree && event.entityKind === "mesh");
        if (affectsMeshList) {
          bumpMeshListVersion();
        }
        markUnsavedChanges(true);
        if (event.entityKind === "light") {
          syncLightingConflictState();
        }
        return;
      }

      if (event.type === "cameraUpdated") {
        if (event.source !== "render") {
          bumpCameraVersion();
        }
        markUnsavedChanges(true);
        return;
      }

      if (event.type === "sceneUpdated") {
        bumpProjectVersion();
        bumpViewStateVersion();
        markUnsavedChanges(true);
        syncLightingConflictState();
        return;
      }

      if (event.type === "viewStateUpdated") {
        bumpViewStateVersion();
        return;
      }

      if (event.type === "studioSceneChanged") {
        setStudioSceneState(event.state);
        bumpSceneTreeVersion();
      }

      if (event.type === "historyChanged") {
        setHistoryState(event.state);
      }
    });

    return () => {
      disposed = true;
      if (frameRequestId !== 0) {
        window.cancelAnimationFrame(frameRequestId);
      }
      unsubscribe();
    };
  }, [
    app,
    bumpProjectLoadVersion,
    bumpProjectVersion,
    bumpEntityVersion,
    bumpRenderEntityVersions,
    bumpSceneTreeVersion,
    bumpMeshListVersion,
    bumpCameraVersion,
    bumpViewStateVersion,
    markUnsavedChanges,
    syncLightingConflictNotice,
    resetLightingConflictNotice,
    setSelectedEntityIds,
    setAiInspectorMode,
    setHistoryState,
    setStudioSceneState
  ]);
}
