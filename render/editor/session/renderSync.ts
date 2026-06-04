import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import {
  SCENE_NODE_ID as SCENE_SELECTION_ID,
  type EditorProjectJSON
} from "../core/types";
import type { EditorProjectModel } from "../models";
import type { EditorRuntime } from "../runtime/editorRuntime";
import type { StudioSceneSessionController } from "./studioSceneSession";

type Emit = (event: EditorAppEvent) => void;

export function flushRuntimeStateToProjectModel({
  projectModel,
  registry,
  runtime,
  studioScene,
  deltaSeconds
}: {
  projectModel: EditorProjectModel | null;
  registry: BindingRegistry;
  runtime: EditorRuntime;
  studioScene: StudioSceneSessionController;
  deltaSeconds: number;
}) {
  if (!projectModel) return;

  if (studioScene.isActive()) {
    registry.refresh(deltaSeconds);
    studioScene.getTransientStudioEntityIds().forEach((entityId) => {
      registry.syncObjectTransformToModel(entityId);
    });
    return;
  }

  runtime.syncCameraModel(projectModel.camera);
  registry.refresh(deltaSeconds);
  registry.syncAllObjectTransformsToModel();
}

export function getSerializableProjectJSON({
  projectModel,
  studioScene,
  applyEntityIsolationVisibility
}: {
  projectModel: EditorProjectModel | null;
  studioScene: StudioSceneSessionController;
  applyEntityIsolationVisibility: (projectJson: EditorProjectJSON) => EditorProjectJSON;
}) {
  if (!projectModel) return null;

  const projectJson = projectModel.toJSON();
  return studioScene.filterTransientEntitiesFromProjectJSON(
    applyEntityIsolationVisibility(projectJson)
  );
}

export function syncRenderChangesToModel({
  projectModel,
  registry,
  runtime,
  studioScene,
  selectedEntityId,
  emit,
  deltaSeconds
}: {
  projectModel: EditorProjectModel | null;
  registry: BindingRegistry;
  runtime: EditorRuntime;
  studioScene: StudioSceneSessionController;
  selectedEntityId: string | null;
  emit: Emit;
  deltaSeconds: number;
}) {
  let sceneChanged = false;
  if (projectModel && studioScene.isActive()) {
    sceneChanged = registry.refresh(deltaSeconds) || sceneChanged;

    const renderTransformedBinding =
      selectedEntityId && studioScene.isTransientStudioEntity(selectedEntityId)
        ? registry.syncObjectTransformToModel(selectedEntityId)
        : null;

    if (renderTransformedBinding) {
      emit({
        type: "entityUpdated",
        entityId: renderTransformedBinding.model.id,
        entityKind: renderTransformedBinding.kind,
        source: "render",
        affectsSceneTree: false
      });
      sceneChanged = true;
    }

    return sceneChanged;
  }

  if (
    projectModel &&
    !studioScene.isActive() &&
    runtime.syncCameraModel(projectModel.camera)
  ) {
    emit({ type: "cameraUpdated", source: "render" });
    sceneChanged = true;
  }

  sceneChanged = registry.refresh(deltaSeconds) || sceneChanged;

  const renderTransformedBinding =
    !studioScene.isActive() && selectedEntityId && selectedEntityId !== SCENE_SELECTION_ID
      ? registry.syncObjectTransformToModel(selectedEntityId)
      : null;

  if (renderTransformedBinding) {
    emit({
      type: "entityUpdated",
      entityId: renderTransformedBinding.model.id,
      entityKind: renderTransformedBinding.kind,
      source: "render",
      affectsSceneTree: false
    });
    sceneChanged = true;
  }

  return sceneChanged;
}
