import type * as THREE from "three";

import type { ExternalAssetSourceJSON } from "@/lib/externalAssets/types";
import type { Ai3DPlan } from "./ai3d/plan";
import type { EditorCommand, MeshMaterialPatch } from "./core/commands";
import type { EditorAppEvent, EditorAppListener } from "./core/events";
import type {
  EditorCameraJSON,
  EditorEnvConfigJSON,
  EditorGroundConfigJSON,
  EditorLightJSON,
  EditorRenderMode,
  EditorViewportCaptureOptions,
  LightingConflictState,
  EditorPostProcessPassId,
  EditorPostProcessingPassParamsMap,
  EditorProjectJSON,
  StudioSceneState,
  EditorViewportCaptureMode,
  SyncSource,
  TransformPatch,
  Vec3Tuple
} from "./core/types";
import type { EditorHistoryState } from "./session/historySession";
import { EditorRuntime } from "./runtime/editorRuntime";
import { EditorSession } from "./session/editorSession";
import type { StudioScenePresetId, StudioSceneVariantId } from "./studioScenes";
import type {
  StudioHdriResolveInput,
  StudioHdriResolveResult,
  StudioSceneEntityAction,
  StudioSceneEnterOptions,
  StudioScenePostProcessingPatch
} from "./session/studioSceneSession";
import type { StudioDecorationKind, StudioPlinthKind } from "./studioSceneLayoutGenerator";
import { EditorAppEnvironmentAssets } from "./app/environmentAssets";
import { EditorAppEventHub } from "./app/events";
import { getEditorMeshList, type EditorMeshListItem } from "./app/meshList";
import { EditorAppPointerPicking } from "./app/pointerPicking";
import {
  EditorAppViewState,
  type EditorViewHelperVisibility
} from "./app/viewState";
import type { PathTraceDenoiseSettings } from "./runtime/pathTraceDenoise";

export type { EditorMeshListItem };
export type { EditorViewHelperVisibility };

export type { LightingConflictState };

export type EditorAppOptions = {
  resolveStudioHdriUrl?: (input: StudioHdriResolveInput) => Promise<StudioHdriResolveResult | null>;
};

export class EditorApp {
  private readonly runtime: EditorRuntime;
  private readonly session: EditorSession;
  private readonly events: EditorAppEventHub;
  private readonly environmentAssets: EditorAppEnvironmentAssets;
  private readonly pointerPicking: EditorAppPointerPicking;
  private readonly viewState: EditorAppViewState;
  private disposed = false;

  constructor(host: HTMLDivElement, options: EditorAppOptions = {}) {
    this.runtime = new EditorRuntime(host);
    this.events = new EditorAppEventHub(this.runtime);
    this.session = new EditorSession(this.runtime, (event) => {
      this.emit(event);
    }, {
      resolveStudioHdriUrl: options.resolveStudioHdriUrl
    });
    this.environmentAssets = new EditorAppEnvironmentAssets({
      session: this.session,
      getProjectModel: () => this.projectModel
    });
    this.pointerPicking = new EditorAppPointerPicking({
      runtime: this.runtime,
      pickEntity: (clientX, clientY) => this.session.pick(clientX, clientY),
      setSelectedEntity: (entityId) => {
        void this.dispatch({
          type: "selection.set",
          entityId,
          source: "render"
        });
      }
    });
    this.viewState = new EditorAppViewState({
      runtime: this.runtime,
      session: this.session,
      getProjectModel: () => this.projectModel,
      updateCamera: (update, source) => this.updateCamera(update, source),
      emitViewStateUpdated: () => this.emit({ type: "viewStateUpdated" })
    });
  }

  get projectModel() {
    return this.session.projectModel;
  }

  start() {
    if (this.disposed) return;
    this.runtime.start({
      onPointerDown: this.pointerPicking.onPointerDown,
      onFrame: this.onFrame
    });
    this.pointerPicking.addWindowListeners();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.pointerPicking.removeWindowListeners();
    this.environmentAssets.dispose();
    this.session.dispose();
    this.runtime.dispose();
  }

  subscribe(listener: EditorAppListener): () => void {
    return this.events.subscribe(listener);
  }

  async loadProject(projectJson: EditorProjectJSON) {
    this.environmentAssets.beforeLoadProject(projectJson);
    await this.session.loadProject(projectJson);
  }

  async clearProject() {
    this.environmentAssets.beforeClearProject();
    await this.session.clearProject();
  }

  async dispatch(command: EditorCommand) {
    if (command.type === "project.load") {
      await this.loadProject(command.project);
      return;
    }

    if (command.type === "project.clear") {
      this.environmentAssets.beforeClearProject();
      await this.session.dispatch(command);
      return;
    }

    if (
      command.type === "scene.envConfig.patch" &&
      command.patch.panoUrl !== undefined
    ) {
      this.environmentAssets.beforeSceneEnvConfigPatch(command.patch);
    }

    await this.session.dispatch(command);
  }

  previewAi3DPlan(plan: Ai3DPlan) {
    this.session.previewAi3DPlan(plan);
    this.runtime.invalidatePathTraceScene();
  }

  clearAi3DPreview() {
    this.session.clearAi3DPreview();
    this.runtime.invalidatePathTraceScene();
  }

  captureAi3DPreviewImages() {
    return this.session.captureAi3DPreviewImages();
  }

  async applyAi3DPlan(plan: Ai3DPlan, source: SyncSource = "ui") {
    await this.session.applyAi3DPlan(plan, source);
  }

  flushRuntimeStateToProjectModel(deltaSeconds = 0) {
    this.session.flushRuntimeStateToProjectModel(deltaSeconds);
  }

  getProjectJSON(): EditorProjectJSON | null {
    return this.session.getProjectJSON();
  }

  getSelectedEntityId(): string | null {
    return this.session.getSelectedEntityId();
  }

  getHistoryState(): EditorHistoryState {
    return this.session.getHistoryState();
  }

  canUndoRedo() {
    const state = this.getHistoryState();
    return {
      canUndo: state.canUndo,
      canRedo: state.canRedo
    };
  }

  undo() {
    return this.session.undo();
  }

  redo() {
    return this.session.redo();
  }

  getGroundConfig() {
    return this.session.getGroundConfig();
  }

  getIsolatedEntityId(): string | null {
    return this.session.getIsolatedEntityId();
  }

  getStudioSceneState(): StudioSceneState {
    return this.session.getStudioSceneState();
  }

  isStudioSceneEntityInteractive(entityId: string) {
    return this.session.isStudioSceneEntityInteractive(entityId);
  }

  canUseStudioSceneEntityAction(entityId: string, action: StudioSceneEntityAction) {
    return this.session.canUseStudioSceneEntityAction(entityId, action);
  }

  getRenderObject(entityId: string): THREE.Object3D | null {
    return this.session.getRenderObject(entityId);
  }

  getMeshList(): EditorMeshListItem[] {
    return getEditorMeshList(this.projectModel);
  }

  getLightingConflictState(): LightingConflictState {
    return this.session.getLightingConflictState();
  }

  removeEnvironmentFillLights(source: SyncSource = "ui") {
    return this.session.removeEnvironmentFillLights(source);
  }

  getRenderMode() {
    return this.viewState.getRenderMode();
  }

  setRenderMode(mode: EditorRenderMode) {
    this.viewState.setRenderMode(mode);
  }

  getPathTraceDenoiseEnabled() {
    return this.viewState.getPathTraceDenoiseEnabled();
  }

  getPathTraceDenoiseSettings() {
    return this.viewState.getPathTraceDenoiseSettings();
  }

  getPathTraceSampleStatus() {
    return this.viewState.getPathTraceSampleStatus();
  }

  setPathTraceDenoiseEnabled(enabled: boolean) {
    this.viewState.setPathTraceDenoiseEnabled(enabled);
  }

  setPathTraceDenoiseSettings(settings: Partial<PathTraceDenoiseSettings>) {
    this.viewState.setPathTraceDenoiseSettings(settings);
  }

  isFirstPersonCamera() {
    return this.viewState.isFirstPersonCamera();
  }

  getFirstPersonHeight() {
    return this.viewState.getFirstPersonHeight();
  }

  setFirstPersonHeight(height: number, source: SyncSource = "ui") {
    this.viewState.setFirstPersonHeight(height, source);
  }

  getViewHelperVisibility() {
    return this.viewState.getViewHelperVisibility();
  }

  getActiveTransformRotationDrag() {
    return this.viewState.getActiveTransformRotationDrag();
  }

  setViewHelperVisibility(
    helper: "gridHelper" | "transformGizmo" | "lightHelper" | "shadow",
    visible: boolean
  ) {
    this.viewState.setViewHelperVisibility(helper, visible);
  }

  setViewHelperVisibilityState(visibility: EditorViewHelperVisibility) {
    this.viewState.setViewHelperVisibilityState(visibility);
  }

  async importPanorama(file: File) {
    return this.environmentAssets.importPanorama(file);
  }

  async importModel(file: File, source: SyncSource = "ui") {
    return this.session.importModel(file, source);
  }

  async importModelFromSource(
    input: {
      sourceUrl: string;
      format: "gltf" | "fbx";
      label: string;
      externalSource: ExternalAssetSourceJSON;
    },
    source: SyncSource = "ui"
  ) {
    return this.session.importModelFromSource(input, source);
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

  duplicateEntity(
    entityId: string,
    source: SyncSource = "ui",
    options: { positionOffset?: Vec3Tuple } = {}
  ) {
    void this.dispatch({
      type: "entity.duplicate",
      entityId,
      source,
      positionOffset: options.positionOffset
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

  async enterStudioScene(
    entityId: string,
    options: StudioSceneEnterOptions,
    source: SyncSource = "ui"
  ) {
    return this.session.enterStudioScene(entityId, options, source);
  }

  suggestStudioProductProfile(entityId: string) {
    return this.session.suggestStudioProductProfile(entityId);
  }

  setStudioScenePreset(presetId: StudioScenePresetId) {
    this.session.setStudioScenePreset(presetId);
  }

  autoMatchStudioSceneStyle() {
    this.session.autoMatchStudioSceneStyle();
  }

  getTransientStudioEntityRole(entityId: string | null) {
    return this.session.getTransientStudioEntityRole(entityId);
  }

  getStudioSceneEntityMetadata(entityId: string | null) {
    return this.session.getStudioSceneEntityMetadata(entityId);
  }

  resetStudioSceneEntity(entityId: string) {
    return this.session.resetStudioSceneEntity(entityId);
  }

  setStudioScenePlinthKind(plinthKind: StudioPlinthKind) {
    this.session.setStudioScenePlinthKind(plinthKind);
  }

  resetStudioSceneGeneratedLayout() {
    this.session.resetStudioSceneGeneratedLayout();
  }

  resetStudioSceneLighting() {
    this.session.resetStudioSceneLighting();
  }

  getStudioScenePostProcessingState() {
    return this.session.getStudioScenePostProcessingState();
  }

  updateStudioScenePostProcessing(patch: StudioScenePostProcessingPatch) {
    return this.session.updateStudioScenePostProcessing(patch);
  }

  resetStudioScenePostProcessing() {
    return this.session.resetStudioScenePostProcessing();
  }

  addStudioSceneDecoration(kind: StudioDecorationKind) {
    return this.session.addStudioSceneDecoration(kind);
  }

  replaceStudioSceneDecoration(entityId: string, kind: StudioDecorationKind) {
    return this.session.replaceStudioSceneDecoration(entityId, kind);
  }

  setStudioSceneVariant(variantId: StudioSceneVariantId) {
    this.session.setStudioSceneVariant(variantId);
  }

  updateStudioSceneTargetTransform(input: { scale?: number; rotationY?: number }) {
    this.session.updateStudioSceneTargetTransform(input);
  }

  resetStudioSceneTargetTransform() {
    this.session.resetStudioSceneTargetTransform();
  }

  exitStudioScene(source: SyncSource = "ui") {
    this.session.exitStudioScene(source);
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

  updateGroundConfig(patch: Partial<EditorGroundConfigJSON>, source: SyncSource = "ui") {
    void this.dispatch({
      type: "ground.patch",
      patch,
      source
    });
  }

  updateGroundMaterial(patch: MeshMaterialPatch, source: SyncSource = "ui") {
    void this.dispatch({
      type: "ground.material",
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

  setModelSkeletonVisible(entityId: string, visible: boolean, source: SyncSource = "ui") {
    void this.dispatch({
      type: "model.animation.skeletonVisibility",
      entityId,
      visible,
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

  captureViewportImageAsync(
    mode: EditorViewportCaptureMode = "clean",
    options: EditorViewportCaptureOptions = {}
  ) {
    return this.runtime.captureViewportImageAsync(mode, options);
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
    this.events.emit(event);
  }

  private onFrame = (deltaSeconds: number) => {
    return this.session.syncRenderChangesToModel(deltaSeconds);
  };
}

export function createEditorApp(host: HTMLDivElement, options: EditorAppOptions = {}): EditorApp {
  return new EditorApp(host, options);
}
