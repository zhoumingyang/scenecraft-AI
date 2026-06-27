import type {
  EditorCameraJSON,
  EditorRenderMode,
  SyncSource
} from "../core/types";
import type { EditorProjectModel } from "../models";
import type { EditorRuntime } from "../runtime/editorRuntime";
import type { PathTraceDenoiseSettings } from "../runtime/pathTraceDenoise";
import type { EditorSession } from "../session/editorSession";

export type EditorViewHelperVisibility = {
  gridHelper: boolean;
  transformGizmo: boolean;
  lightHelper: boolean;
  shadow: boolean;
};

export class EditorAppViewState {
  private readonly runtime: EditorRuntime;
  private readonly session: EditorSession;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private readonly updateCamera: (
    update: Partial<EditorCameraJSON>,
    source: SyncSource
  ) => void;
  private readonly emitViewStateUpdated: () => void;

  constructor({
    runtime,
    session,
    getProjectModel,
    updateCamera,
    emitViewStateUpdated
  }: {
    runtime: EditorRuntime;
    session: EditorSession;
    getProjectModel: () => EditorProjectModel | null;
    updateCamera: (update: Partial<EditorCameraJSON>, source: SyncSource) => void;
    emitViewStateUpdated: () => void;
  }) {
    this.runtime = runtime;
    this.session = session;
    this.getProjectModel = getProjectModel;
    this.updateCamera = updateCamera;
    this.emitViewStateUpdated = emitViewStateUpdated;
  }

  getRenderMode() {
    return this.runtime.getRenderMode();
  }

  setRenderMode(mode: EditorRenderMode) {
    if (!this.runtime.setRenderMode(mode)) return;
    this.emitViewStateUpdated();
  }

  getPathTraceDenoiseEnabled() {
    return this.runtime.getPathTraceDenoiseEnabled();
  }

  getPathTraceDenoiseSettings() {
    return this.runtime.getPathTraceDenoiseSettings();
  }

  setPathTraceDenoiseEnabled(enabled: boolean) {
    if (!this.runtime.setPathTraceDenoiseEnabled(enabled)) return;
    this.emitViewStateUpdated();
  }

  setPathTraceDenoiseSettings(settings: Partial<PathTraceDenoiseSettings>) {
    if (!this.runtime.setPathTraceDenoiseSettings(settings)) return;
    this.emitViewStateUpdated();
  }

  isFirstPersonCamera() {
    return this.runtime.isFirstPersonCamera();
  }

  getFirstPersonHeight() {
    const projectModel = this.getProjectModel();
    return projectModel?.camera.position[1] ?? this.runtime.camera.position.y;
  }

  setFirstPersonHeight(height: number, source: SyncSource = "ui") {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;
    const nextHeight = Number.isFinite(height) ? height : projectModel.camera.position[1];
    this.updateCamera(
      {
        position: [
          projectModel.camera.position[0],
          nextHeight,
          projectModel.camera.position[2]
        ]
      },
      source
    );
  }

  getViewHelperVisibility() {
    return {
      gridHelper: this.runtime.getGridHelperVisible(),
      transformGizmo: this.runtime.getTransformGizmoVisible(),
      lightHelper: this.runtime.getLightHelpersVisible(),
      shadow: this.runtime.getShadowEnabled()
    } satisfies EditorViewHelperVisibility;
  }

  getActiveTransformRotationDrag() {
    return this.runtime.getActiveTransformRotationDrag();
  }

  setViewHelperVisibility(
    helper: "gridHelper" | "transformGizmo" | "lightHelper" | "shadow",
    visible: boolean
  ) {
    if (helper === "gridHelper") {
      this.session.updateGroundConfig({ visible }, "ui");
    } else if (helper === "transformGizmo") {
      this.runtime.setTransformGizmoVisible(visible);
    } else if (helper === "lightHelper") {
      this.runtime.setLightHelpersVisible(visible);
    } else {
      this.runtime.setShadowEnabled(visible);
    }
    this.emitViewStateUpdated();
  }

  setViewHelperVisibilityState(visibility: EditorViewHelperVisibility) {
    this.session.updateGroundConfig(
      {
        visible: visibility.gridHelper
      },
      "ui"
    );
    this.runtime.setTransformGizmoVisible(visibility.transformGizmo);
    this.runtime.setLightHelpersVisible(visibility.lightHelper);
    this.runtime.setShadowEnabled(visibility.shadow);
    this.emitViewStateUpdated();
  }
}
