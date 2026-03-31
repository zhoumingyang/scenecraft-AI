import type * as THREE from "three";

import type { EditorCommand, MeshMaterialPatch } from "./core/commands";
import type { EditorAppEvent, EditorAppListener } from "./core/events";
import type {
  EditorCameraJSON,
  EditorLightJSON,
  EditorProjectJSON,
  SyncSource,
  TransformPatch
} from "./core/types";
import { EditorRuntime } from "./runtime/editorRuntime";
import { EditorSession } from "./session/editorSession";

export class EditorApp {
  private readonly runtime: EditorRuntime;
  private readonly session: EditorSession;
  private readonly listeners = new Set<EditorAppListener>();
  private disposed = false;

  constructor(host: HTMLDivElement) {
    this.runtime = new EditorRuntime(host);
    this.session = new EditorSession(this.runtime, (event) => {
      this.emit(event);
    });
  }

  get projectModel() {
    return this.session.projectModel;
  }

  start() {
    if (this.disposed) return;
    this.runtime.start({
      onPointerDown: this.onPointerDown,
      onFrame: this.onFrame
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.session.dispose();
    this.runtime.dispose();
  }

  subscribe(listener: EditorAppListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async loadProject(projectJson: EditorProjectJSON) {
    await this.session.loadProject(projectJson);
  }

  async clearProject() {
    await this.session.clearProject();
  }

  async dispatch(command: EditorCommand) {
    await this.session.dispatch(command);
  }

  getProjectJSON(): EditorProjectJSON | null {
    return this.session.getProjectJSON();
  }

  getSelectedEntityId(): string | null {
    return this.session.getSelectedEntityId();
  }

  getRenderObject(entityId: string): THREE.Object3D | null {
    return this.session.getRenderObject(entityId);
  }

  updateEntityTransform(entityId: string, patch: TransformPatch, source: SyncSource = "ui") {
    void this.dispatch({
      type: "entity.transform",
      entityId,
      patch,
      source
    });
  }

  updateCamera(update: Partial<EditorCameraJSON>, source: SyncSource = "ui") {
    void this.dispatch({
      type: "camera.patch",
      patch: update,
      source
    });
  }

  updateMeshMaterial(
    entityId: string,
    patch: MeshMaterialPatch,
    source: SyncSource = "ui"
  ) {
    void this.dispatch({
      type: "mesh.material",
      entityId,
      patch,
      source
    });
  }

  updateLight(entityId: string, patch: Partial<EditorLightJSON>, source: SyncSource = "ui") {
    void this.dispatch({
      type: "light.patch",
      entityId,
      patch,
      source
    });
  }

  syncEntityModelFromRenderObject(entityId: string) {
    this.session.syncEntityModelFromRenderObject(entityId);
  }

  pick(clientX: number, clientY: number): string | null {
    return this.session.pick(clientX, clientY);
  }

  setSelectedEntity(entityId: string | null, source: SyncSource = "ui") {
    void this.dispatch({
      type: "selection.set",
      entityId,
      source
    });
  }

  private emit(event: EditorAppEvent) {
    this.listeners.forEach((listener) => {
      listener(event);
    });
  }

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    if (this.runtime.beginTransformInteraction(event.clientX, event.clientY)) return;
    if (this.runtime.isFirstPersonCamera()) return;
    const pickedEntityId = this.session.pick(event.clientX, event.clientY);
    void this.dispatch({
      type: "selection.set",
      entityId: pickedEntityId,
      source: "render"
    });
  };

  private onFrame = () => {
    this.session.syncRenderChangesToModel();
  };
}

export function createEditorApp(host: HTMLDivElement): EditorApp {
  return new EditorApp(host);
}
