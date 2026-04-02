import type { EntityKind, SyncSource } from "./types";

export type EntityUpdatedEvent = {
  type: "entityUpdated";
  entityId: string;
  entityKind: EntityKind;
  source: SyncSource;
};

export type CameraUpdatedEvent = {
  type: "cameraUpdated";
  source: SyncSource;
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
  | SelectionChangedEvent
  | ProjectLoadedEvent
  | ViewStateUpdatedEvent;

export type EditorAppListener = (event: EditorAppEvent) => void;
