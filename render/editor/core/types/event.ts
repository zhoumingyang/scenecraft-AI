import type { EditorHistoryState } from "../../session/historySession";
import type { EntityKind, SyncSource } from "./shared";
import type { StudioSceneState } from "./state";

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
  selectedEntityIds: string[];
  source: SyncSource;
};

export type ProjectLoadedEvent = {
  type: "projectLoaded";
  projectId: string;
};

export type ViewStateUpdatedEvent = {
  type: "viewStateUpdated";
};

export type StudioSceneChangedEvent = {
  type: "studioSceneChanged";
  state: StudioSceneState;
};

export type HistoryChangedEvent = {
  type: "historyChanged";
  state: EditorHistoryState;
};

export type EditorAppEvent =
  | EntityUpdatedEvent
  | CameraUpdatedEvent
  | SceneUpdatedEvent
  | SelectionChangedEvent
  | ProjectLoadedEvent
  | ViewStateUpdatedEvent
  | StudioSceneChangedEvent
  | HistoryChangedEvent;

export type EditorAppListener = (event: EditorAppEvent) => void;
