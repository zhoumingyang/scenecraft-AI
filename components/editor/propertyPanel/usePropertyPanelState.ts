"use client";

import { useMemo } from "react";
import type { useI18n } from "@/lib/i18n";
import {
  GROUND_HELPER_NODE_ID,
  isStudioScenePreviewEntity,
  SCENE_NODE_ID,
  type EditorProjectModel
} from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import { getLightTypeLabel } from "@/components/editor/propertyPanelSections/util";
import {
  CLOSED_AI_LIBRARY,
  CLOSED_PENDING_AI_ASSETS,
  CLOSED_SELECTED_ENTITY_IDS
} from "./constants";

export type PropertyPanelEntityRecord =
  | {
      kind: "scene";
      envConfig: EditorProjectModel["envConfig"];
    }
  | {
      kind: "gridHelper";
      item: EditorProjectModel["envConfig"]["ground"];
    }
  | NonNullable<ReturnType<EditorProjectModel["getEntityById"]>>;

type Translate = ReturnType<typeof useI18n>["t"];

function getPanelTitle(
  inspectorMode: "entity" | "ai",
  isMultiSelection: boolean,
  entityRecord: PropertyPanelEntityRecord | null,
  t: Translate
) {
  if (inspectorMode === "ai") return t("editor.ai.panelTitle");
  if (isMultiSelection) return t("editor.properties.multiSelection");
  if (!entityRecord) return t("editor.properties.none");
  if (entityRecord.kind === "scene") return t("editor.sceneTree.scene");
  if (entityRecord.kind === "group") return t("editor.sceneTree.group");
  if (entityRecord.kind === "model") return t("editor.sceneTree.model");
  if (entityRecord.kind === "csgMesh") return t("editor.properties.csgMesh");
  if (entityRecord.kind === "mesh") return t("editor.sceneTree.meshes");
  if (entityRecord.kind === "gridHelper") return t("editor.view.gridHelper");
  return getLightTypeLabel(entityRecord.item.lightType, t);
}

export function usePropertyPanelState(open: boolean, t: Translate) {
  const app = useEditorStore((state) => (open ? state.app : null));
  const selectedEntityId = useEditorStore((state) => (open ? state.selectedEntityId : null));
  const selectedEntityIds = useEditorStore((state) =>
    open ? state.selectedEntityIds : CLOSED_SELECTED_ENTITY_IDS
  );
  const isMultiSelection = selectedEntityIds.length > 1;
  const viewStateVersion = useEditorStore((state) => (open ? state.viewStateVersion : 0));
  const selectedEntityVersion = useEditorStore((state) =>
    open && selectedEntityId && !isMultiSelection ? state.entityVersions[selectedEntityId] ?? 0 : 0
  );
  const sceneTreeVersion = useEditorStore((state) => (open ? state.sceneTreeVersion : 0));
  const inspectorMode = useEditorStore((state) => (open ? state.aiImage.inspectorMode : "entity"));
  const aiMode = useEditorStore((state) => (open ? state.aiMode : "image"));
  const aiTexture = useEditorStore((state) => (open ? state.aiTexture : null));
  const loadedAiLibrary = useEditorStore((state) =>
    open ? state.loadedAiLibrary : CLOSED_AI_LIBRARY
  );
  const pendingAiAssets = useEditorStore((state) =>
    open ? state.pendingAiAssets : CLOSED_PENDING_AI_ASSETS
  );
  const studioScene = useEditorStore((state) => (open ? state.studioScene : null));

  const entityRecord = useMemo<PropertyPanelEntityRecord | null>(() => {
    if (!open) return null;
    if (isMultiSelection) return null;
    const project = app?.projectModel;
    if (!project || !selectedEntityId) return null;
    if (selectedEntityId === SCENE_NODE_ID) {
      return {
        kind: "scene",
        envConfig: project.envConfig
      };
    }

    if (selectedEntityId === GROUND_HELPER_NODE_ID) {
      if (!project.envConfig.ground.visible) return null;
      return {
        kind: "gridHelper",
        item: project.envConfig.ground
      };
    }

    const record = project.getEntityById(selectedEntityId);
    return record ? { ...record } : null;
  }, [
    app,
    isMultiSelection,
    open,
    sceneTreeVersion,
    selectedEntityId,
    selectedEntityVersion,
    viewStateVersion
  ]);

  const panelTitle = getPanelTitle(inspectorMode, isMultiSelection, entityRecord, t);
  const isolatedEntityId = useMemo(
    () => (open ? app?.getIsolatedEntityId() ?? null : null),
    [app, open, viewStateVersion]
  );
  const isStudioSceneActive = Boolean(studioScene?.active);
  const canIsolateCurrentEntity =
    inspectorMode !== "ai" &&
    !isStudioSceneActive &&
    Boolean(
      entityRecord &&
        (entityRecord.kind === "group" ||
          entityRecord.kind === "model" ||
          entityRecord.kind === "mesh")
    );
  const currentIsolatableEntityId =
    entityRecord &&
    (entityRecord.kind === "group" || entityRecord.kind === "model" || entityRecord.kind === "mesh")
      ? entityRecord.item.id
      : null;
  const isCurrentEntityIsolated = Boolean(
    canIsolateCurrentEntity &&
      currentIsolatableEntityId &&
      isolatedEntityId === currentIsolatableEntityId
  );
  const canPreviewCurrentEntityInStudio =
    inspectorMode !== "ai" &&
    !isStudioSceneActive &&
    Boolean(
      app?.projectModel &&
        currentIsolatableEntityId &&
        isStudioScenePreviewEntity(app.projectModel, currentIsolatableEntityId)
    );
  const isCurrentEntityInStudio = Boolean(
    studioScene?.active &&
      currentIsolatableEntityId &&
      studioScene.targetEntityId === currentIsolatableEntityId
  );
  const studioEntityMetadata = useMemo(
    () =>
      studioScene?.active && !isMultiSelection
        ? app?.getStudioSceneEntityMetadata(selectedEntityId) ?? null
        : null,
    [app, isMultiSelection, selectedEntityId, studioScene?.active, viewStateVersion]
  );
  const studioPostProcessingState = useMemo(
    () =>
      studioScene?.active && !isMultiSelection && selectedEntityId === SCENE_NODE_ID
        ? app?.getStudioScenePostProcessingState() ?? null
        : null,
    [app, isMultiSelection, selectedEntityId, studioScene?.active, viewStateVersion]
  );
  const selectedCsgOperandEntityIds = useMemo(() => {
    if (!open || selectedEntityIds.length <= 1) return CLOSED_SELECTED_ENTITY_IDS;
    const project = app?.projectModel;
    if (!project) return CLOSED_SELECTED_ENTITY_IDS;
    return selectedEntityIds.filter((entityId) => {
      const record = project.getEntityById(entityId);
      return (
        (record?.kind === "mesh" || record?.kind === "csgMesh") &&
        !project.isEntityConsumedByCsg(entityId)
      );
    });
  }, [app, open, sceneTreeVersion, selectedEntityIds, viewStateVersion]);
  const isCsgOperandMultiSelection =
    isMultiSelection && selectedCsgOperandEntityIds.length === selectedEntityIds.length;

  return {
    app,
    selectedEntityId,
    selectedEntityIds,
    selectedCsgOperandEntityIds,
    isCsgOperandMultiSelection,
    isMultiSelection,
    inspectorMode,
    aiMode,
    aiTexture,
    loadedAiLibrary,
    pendingAiAssets,
    studioScene,
    entityRecord,
    panelTitle,
    studioEntityMetadata,
    studioPostProcessingState,
    canIsolateCurrentEntity,
    currentIsolatableEntityId,
    isCurrentEntityIsolated,
    canPreviewCurrentEntityInStudio,
    isCurrentEntityInStudio
  };
}
