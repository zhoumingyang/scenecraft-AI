import type { EntityKind, SyncSource } from "./types";

export type EntityUpdatedEvent = {
  type: "entityUpdated";
  entityId: string;
  entityKind: EntityKind;
  source: SyncSource;
  affectsSceneTree?: boolean;
  affectsMeshList?: boolean;
};

export type CameraUpdatedEvent = {
  type: "cameraUpdated";
  source: SyncSource;
};

export type SceneUpdatedEvent = {
  type: "sceneUpdated";
  source: SyncSource;
  pathTraceInvalidation?: "scene" | "environment" | "materials" | "none";
};

export type SelectionChangedEvent = {
  type: "selectionChanged";
  selectedEntityId: string | null;
  source: SyncSource;
};

export type ProjectLoadedEvent = {
  type: "projectLoaded";
  projectId: string;
};

export type ViewStateUpdatedEvent = {
  type: "viewStateUpdated";
};

export type EditorAppEvent =
  | EntityUpdatedEvent
  | CameraUpdatedEvent
  | SceneUpdatedEvent
  | SelectionChangedEvent
  | ProjectLoadedEvent
  | ViewStateUpdatedEvent;

export type EditorAppListener = (event: EditorAppEvent) => void;
