import type { EditorAppEvent, EditorAppListener } from "../core/events";
import type { EditorRuntime } from "../runtime/editorRuntime";

export class EditorAppEventHub {
  private readonly runtime: EditorRuntime;
  private readonly listeners = new Set<EditorAppListener>();

  constructor(runtime: EditorRuntime) {
    this.runtime = runtime;
  }

  subscribe(listener: EditorAppListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: EditorAppEvent) {
    this.invalidatePathTraceForEvent(event);
    this.runtime.requestFrame();
    this.listeners.forEach((listener) => {
      listener(event);
    });
  }

  private invalidatePathTraceForEvent(event: EditorAppEvent) {
    if (event.type === "projectLoaded") {
      this.runtime.invalidatePathTraceScene();
      return;
    }

    if (event.type === "studioSceneChanged") {
      this.runtime.invalidatePathTraceScene();
      return;
    }

    if (event.type === "cameraUpdated") {
      if (event.source === "render") return;
      this.runtime.invalidatePathTraceCamera();
      return;
    }

    if (event.type === "sceneUpdated") {
      if (!event.pathTraceInvalidation || event.pathTraceInvalidation === "scene") {
        this.runtime.invalidatePathTraceScene();
        return;
      }

      if (event.pathTraceInvalidation === "environment") {
        this.runtime.invalidatePathTraceEnvironment();
        return;
      }

      if (event.pathTraceInvalidation === "materials") {
        this.runtime.invalidatePathTraceMaterials();
      }
      return;
    }

    if (event.type !== "entityUpdated") return;

    if (event.entityKind === "light") {
      this.runtime.invalidatePathTraceLights();
      return;
    }

    this.runtime.invalidatePathTraceScene();
  }
}
