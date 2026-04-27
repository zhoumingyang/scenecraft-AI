import type * as THREE from "three";

import type { Ai3DPlan } from "./ai3d/plan";
import type { EditorCommand, MeshMaterialPatch } from "./core/commands";
import type { EditorAppEvent, EditorAppListener } from "./core/events";
import type {
  EditorCameraJSON,
  EditorEnvConfigJSON,
  EditorLightJSON,
  EditorPostProcessPassId,
  EditorPostProcessingPassParamsMap,
  EditorProjectJSON,
  EditorViewportCaptureMode,
  SyncSource,
  TransformPatch
} from "./core/types";
import { EditorRuntime } from "./runtime/editorRuntime";
import { EditorSession } from "./session/editorSession";
import { PICK_POINTER_MOVE_THRESHOLD_PX } from "./constants/input";
import { SCENE_NODE_ID as SCENE_SELECTION_ID } from "./constants/scene";

export type EditorMeshListItem = {
  id: string;
  label: string;
};

function formatTitleCase(value: string) {
  if (!value) return "Mesh";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type PendingPick = {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

export class EditorApp {
  private readonly runtime: EditorRuntime;
  private readonly session: EditorSession;
  private readonly listeners = new Set<EditorAppListener>();
  private disposed = false;
  private pendingPick: PendingPick | null = null;
  private environmentUrl: string | null = null;

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
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerCancel);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerCancel);
    this.pendingPick = null;
    this.revokeEnvironmentUrl();
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

  previewAi3DPlan(plan: Ai3DPlan) {
    this.session.previewAi3DPlan(plan);
  }

  clearAi3DPreview() {
    this.session.clearAi3DPreview();
  }

  captureAi3DPreviewImages() {
    return this.session.captureAi3DPreviewImages();
  }

  async applyAi3DPlan(plan: Ai3DPlan, source: SyncSource = "ui") {
    await this.session.applyAi3DPlan(plan, source);
  }

  getProjectJSON(): EditorProjectJSON | null {
    return this.session.getProjectJSON();
  }

  getSelectedEntityId(): string | null {
    return this.session.getSelectedEntityId();
  }

  getIsolatedEntityId(): string | null {
    return this.session.getIsolatedEntityId();
  }

  getRenderObject(entityId: string): THREE.Object3D | null {
    return this.session.getRenderObject(entityId);
  }

  getMeshList(): EditorMeshListItem[] {
    const meshes = this.projectModel?.meshes;
    if (!meshes) return [];
    return Array.from(meshes.values()).map((mesh, index) => ({
      id: mesh.id,
      label: mesh.label || `${formatTitleCase(mesh.geometryName)} ${index + 1}`
    }));
  }

  isFirstPersonCamera() {
    return this.runtime.isFirstPersonCamera();
  }

  getFirstPersonHeight() {
    return this.projectModel?.camera.position[1] ?? this.runtime.camera.position.y;
  }

  setFirstPersonHeight(height: number, source: SyncSource = "ui") {
    if (!this.projectModel) return;
    const nextHeight = Number.isFinite(height) ? height : this.projectModel.camera.position[1];
    this.updateCamera(
      {
        position: [
          this.projectModel.camera.position[0],
          nextHeight,
          this.projectModel.camera.position[2]
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
    };
  }

  getActiveTransformRotationDrag() {
    return this.runtime.getActiveTransformRotationDrag();
  }

  setViewHelperVisibility(
    helper: "gridHelper" | "transformGizmo" | "lightHelper" | "shadow",
    visible: boolean
  ) {
    if (helper === "gridHelper") {
      this.runtime.setGridHelperVisible(visible);
    } else if (helper === "transformGizmo") {
      this.runtime.setTransformGizmoVisible(visible);
    } else if (helper === "lightHelper") {
      this.runtime.setLightHelpersVisible(visible);
    } else {
      this.runtime.setShadowEnabled(visible);
    }
    this.emit({ type: "viewStateUpdated" });
  }

  async importPanorama(file: File) {
    if (!this.projectModel) return;
    const nextUrl = URL.createObjectURL(file);
    try {
      await this.session.updateSceneEnvConfig(
        {
          panoUrl: nextUrl
        },
        "ui",
        { panoAssetName: file.name }
      );
      this.revokeEnvironmentUrl();
      this.environmentUrl = nextUrl;
      this.setSelectedEntity(SCENE_SELECTION_ID, "ui");
      return {
        sourceUrl: nextUrl
      };
    } catch (error) {
      URL.revokeObjectURL(nextUrl);
      throw error;
    }
  }

  async importModel(file: File, source: SyncSource = "ui") {
    return this.session.importModel(file, source);
  }

  updateEntityTransform(entityId: string, patch: TransformPatch, source: SyncSource = "ui") {
    void this.dispatch({
      type: "entity.transform",
      entityId,
      patch,
      source
    });
  }

  updateEntityLabel(entityId: string, label: string, source: SyncSource = "ui") {
    void this.dispatch({
      type: "entity.label",
      entityId,
      label,
      source
    });
  }

  removeEntity(entityId: string, source: SyncSource = "ui") {
    void this.dispatch({
      type: "entity.remove",
      entityId,
      source
    });
  }

  duplicateEntity(entityId: string, source: SyncSource = "ui") {
    void this.dispatch({
      type: "entity.duplicate",
      entityId,
      source
    });
  }

  setEntityLocked(entityId: string, locked: boolean, source: SyncSource = "ui") {
    void this.dispatch({
      type: "entity.lock",
      entityId,
      locked,
      source
    });
  }

  setEntityVisible(entityId: string, visible: boolean, source: SyncSource = "ui") {
    void this.dispatch({
      type: "entity.visible",
      entityId,
      visible,
      source
    });
  }

  toggleEntityIsolation(entityId: string, source: SyncSource = "ui") {
    this.session.toggleEntityIsolation(entityId, source);
  }

  updateCamera(update: Partial<EditorCameraJSON>, source: SyncSource = "ui") {
    void this.dispatch({
      type: "camera.patch",
      patch: update,
      source
    });
  }

  updateSceneEnvConfig(patch: Partial<EditorEnvConfigJSON>, source: SyncSource = "ui") {
    void this.dispatch({
      type: "scene.envConfig.patch",
      patch,
      source
    });
  }

  updateScenePostProcessEnabled(
    passId: EditorPostProcessPassId,
    enabled: boolean,
    source: SyncSource = "ui"
  ) {
    this.updateSceneEnvConfig(
      {
        postProcessing: {
          passes: {
            [passId]: {
              enabled
            }
          }
        }
      },
      source
    );
  }

  updateScenePostProcessParams<T extends EditorPostProcessPassId>(
    passId: T,
    patch: Partial<EditorPostProcessingPassParamsMap[T]>,
    source: SyncSource = "ui"
  ) {
    this.updateSceneEnvConfig(
      {
        postProcessing: {
          passes: {
            [passId]: {
              params: patch
            }
          }
        }
      },
      source
    );
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

  selectModelAnimation(entityId: string, animationId: string, source: SyncSource = "ui") {
    void this.dispatch({
      type: "model.animation.select",
      entityId,
      animationId,
      source
    });
  }

  setModelAnimationTimeScale(entityId: string, timeScale: number, source: SyncSource = "ui") {
    void this.dispatch({
      type: "model.animation.timeScale",
      entityId,
      timeScale,
      source
    });
  }

  controlModelAnimation(
    entityId: string,
    action: "play" | "pause" | "stop" | "step",
    source: SyncSource = "ui"
  ) {
    void this.dispatch({
      type: "model.animation.control",
      entityId,
      action,
      source
    });
  }

  syncEntityModelFromRenderObject(entityId: string) {
    this.session.syncEntityModelFromRenderObject(entityId);
  }

  pick(clientX: number, clientY: number): string | null {
    return this.session.pick(clientX, clientY);
  }

  captureViewportImage(mode: EditorViewportCaptureMode = "clean") {
    return this.runtime.captureViewportImage(mode);
  }

  setOutlineEntity(entityId: string | null) {
    if (!entityId) {
      this.runtime.setOutlineSelection([]);
      return;
    }

    const object = this.getRenderObject(entityId);
    this.runtime.setOutlineSelection(object ? [object] : []);
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
    this.pendingPick = null;
    if (this.runtime.beginTransformInteraction(event.clientX, event.clientY)) return;
    if (this.runtime.isFirstPersonCamera()) return;

    this.pendingPick = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.pendingPick || this.pendingPick.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - this.pendingPick.startX;
    const deltaY = event.clientY - this.pendingPick.startY;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    if (distanceSquared <= PICK_POINTER_MOVE_THRESHOLD_PX * PICK_POINTER_MOVE_THRESHOLD_PX) return;
    this.pendingPick.moved = true;
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.pendingPick || this.pendingPick.pointerId !== event.pointerId) return;
    const shouldPick = !this.pendingPick.moved;
    this.pendingPick = null;
    if (!shouldPick) return;

    const pickedEntityId = this.session.pick(event.clientX, event.clientY);
    void this.dispatch({
      type: "selection.set",
      entityId: pickedEntityId,
      source: "render"
    });
  };

  private onPointerCancel = (event: PointerEvent) => {
    if (!this.pendingPick || this.pendingPick.pointerId !== event.pointerId) return;
    this.pendingPick = null;
  };

  private onFrame = (deltaSeconds: number) => {
    this.session.syncRenderChangesToModel(deltaSeconds);
  };

  private revokeEnvironmentUrl() {
    if (!this.environmentUrl) return;
    if (this.environmentUrl.startsWith("blob:")) {
      URL.revokeObjectURL(this.environmentUrl);
    }
    this.environmentUrl = null;
  }
}

export function createEditorApp(host: HTMLDivElement): EditorApp {
  return new EditorApp(host);
}
