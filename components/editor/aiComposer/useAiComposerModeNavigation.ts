"use client";

import type { useI18n } from "@/lib/i18n";
import {
  GROUND_HELPER_NODE_ID,
  SCENE_NODE_ID,
  type EditorApp
} from "@/render/editor";
import type { AiMode, AiTextureTarget, EditorStoreState } from "@/stores/editorStore";

type UseAiComposerModeNavigationOptions = {
  app: EditorApp | null;
  lastAiClearedEntityId: string | null;
  selectedEntityId: string | null;
  setAiInspectorMode: EditorStoreState["setAiInspectorMode"];
  setAiMode: EditorStoreState["setAiMode"];
  setAiTextureState: EditorStoreState["setAiTextureState"];
  setLastAiClearedEntityId: EditorStoreState["setLastAiClearedEntityId"];
  t: ReturnType<typeof useI18n>["t"];
};

export function useAiComposerModeNavigation({
  app,
  lastAiClearedEntityId,
  selectedEntityId,
  setAiInspectorMode,
  setAiMode,
  setAiTextureState,
  setLastAiClearedEntityId,
  t
}: UseAiComposerModeNavigationOptions) {
  const rememberAndClearSelection = () => {
    const currentSelectedEntityId = app?.getSelectedEntityId() ?? selectedEntityId;
    if (currentSelectedEntityId) {
      setLastAiClearedEntityId(currentSelectedEntityId);
    }
    app?.setSelectedEntity(null);
  };

  const resolveTextureTarget = (entityId: string | null): AiTextureTarget | null => {
    const project = app?.projectModel;
    if (!project || !entityId) return null;

    if (entityId === GROUND_HELPER_NODE_ID) {
      if (!project.envConfig.ground.visible || project.envConfig.ground.mode !== "plane") {
        return null;
      }

      return {
        kind: "ground",
        label: t("editor.view.gridHelper")
      };
    }

    const record = project.getEntityById(entityId);
    if (!record || record.kind !== "mesh") {
      return null;
    }

    return {
      kind: "mesh",
      id: record.item.id,
      label: record.item.label || t("editor.sceneTree.meshes")
    };
  };

  const focusAiMode = () => {
    setAiMode("image");
    setAiInspectorMode("ai");
    rememberAndClearSelection();
  };

  const focusAi3dMode = () => {
    setAiMode("3d");
    setAiInspectorMode("entity");
    rememberAndClearSelection();
  };

  const focusTextureMode = () => {
    const rememberedTarget = resolveTextureTarget(lastAiClearedEntityId);
    const currentTarget = resolveTextureTarget(app?.getSelectedEntityId() ?? selectedEntityId);
    const nextTarget = rememberedTarget ?? currentTarget;

    setAiMode("texture");
    setAiInspectorMode("entity");
    setAiTextureState({
      target: nextTarget,
      errorMessage: null
    });

    if (nextTarget?.kind === "mesh" && nextTarget.id) {
      app?.setSelectedEntity(nextTarget.id);
      return;
    }

    if (nextTarget?.kind === "ground") {
      app?.setSelectedEntity(GROUND_HELPER_NODE_ID);
      return;
    }

    app?.setSelectedEntity(null);
  };

  const focusPanoramaMode = () => {
    setAiMode("panorama");
    setAiInspectorMode("entity");
    app?.setSelectedEntity(SCENE_NODE_ID);
  };

  const focusAssetsMode = () => {
    setAiMode("assets");
    setAiInspectorMode("entity");
  };

  const handleModeChange = (mode: AiMode) => {
    if (mode === "image") {
      focusAiMode();
      return;
    }

    if (mode === "texture") {
      focusTextureMode();
      return;
    }

    if (mode === "panorama") {
      focusPanoramaMode();
      return;
    }

    if (mode === "assets") {
      focusAssetsMode();
      return;
    }

    focusAi3dMode();
  };

  return {
    focusAiMode,
    focusAi3dMode,
    focusTextureMode,
    focusPanoramaMode,
    focusAssetsMode,
    handleModeChange
  };
}
