import * as THREE from "three";

import type { GetExternalAssetDetailResponse } from "@/lib/externalAssets/contracts";
import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import type { StudioSceneState, SyncSource } from "../core/types";
import type { EditorProjectModel } from "../models";
import type { EditorRuntime } from "../runtime/editorRuntime";
import {
  DEFAULT_STUDIO_SCENE_PRESET_ID,
  getStudioScenePreset,
  type StudioSceneHdriStatus,
  type StudioScenePresetId
} from "../studioScenes";

type StudioObjectVisibilitySnapshot = Array<{
  entityId: string;
  visible: boolean;
}>;

type StudioViewHelperSnapshot = {
  gridHelper: boolean;
  transformGizmo: boolean;
  lightHelper: boolean;
  shadow: boolean;
};

type StudioTargetTransformSnapshot = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
};

type ActiveStudioSceneSession = {
  targetEntityId: string;
  presetId: StudioScenePresetId;
  targetScale: number;
  targetRotationY: number;
  hdriStatus: StudioSceneHdriStatus;
  hdriError: string | null;
  objectVisibilitySnapshot: StudioObjectVisibilitySnapshot;
  viewHelperSnapshot: StudioViewHelperSnapshot;
  targetTransformSnapshot: StudioTargetTransformSnapshot;
};

type StudioSceneSessionControllerOptions = {
  runtime: EditorRuntime;
  registry: BindingRegistry;
  emit: (event: EditorAppEvent) => void;
  getProjectModel: () => EditorProjectModel | null;
  getSelectedEntityId: () => string | null;
  hasEntityIsolation: () => boolean;
  clearEntityIsolation: (source: SyncSource) => void;
  setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
};

export function createDefaultStudioSceneState(): StudioSceneState {
  return {
    active: false,
    presetId: null,
    targetEntityId: null,
    targetScale: 1,
    targetRotationY: 0,
    hdriStatus: "idle",
    hdriError: null
  };
}

function cloneObjectTransform(object: THREE.Object3D): StudioTargetTransformSnapshot {
  return {
    position: object.position.clone(),
    quaternion: object.quaternion.clone(),
    scale: object.scale.clone()
  };
}

function restoreObjectTransform(object: THREE.Object3D, snapshot: StudioTargetTransformSnapshot) {
  object.position.copy(snapshot.position);
  object.quaternion.copy(snapshot.quaternion);
  object.scale.copy(snapshot.scale);
  object.updateMatrixWorld(true);
}

function createStudioFrameFromObject(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  if (box.isEmpty()) {
    object.getWorldPosition(center);
    return {
      center,
      radius: 1,
      height: 1,
      floorY: center.y - 0.5
    };
  }

  box.getCenter(center);
  box.getSize(size);
  return {
    center,
    radius: Math.max(size.x, size.y, size.z) * 0.5,
    height: Math.max(size.y, 0.1),
    floorY: box.min.y
  };
}

function selectPreferredHdriFile(
  detail: GetExternalAssetDetailResponse["asset"],
  preferredResolution: string,
  preferredFormat: string
) {
  if (detail.assetType !== "hdri") return null;
  const preferred = detail.fileOptions.find(
    (file) =>
      file.resolution.toLowerCase() === preferredResolution.toLowerCase() &&
      file.format.toLowerCase() === preferredFormat.toLowerCase()
  );
  if (preferred) return preferred;

  return (
    detail.fileOptions.find(
      (file) => file.format.toLowerCase() === preferredFormat.toLowerCase()
    ) ??
    detail.fileOptions[0] ??
    null
  );
}

export class StudioSceneSessionController {
  private readonly runtime: EditorRuntime;
  private readonly registry: BindingRegistry;
  private readonly emit: (event: EditorAppEvent) => void;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private readonly getSelectedEntityId: () => string | null;
  private readonly hasEntityIsolation: () => boolean;
  private readonly clearEntityIsolation: (source: SyncSource) => void;
  private readonly setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
  private activeSession: ActiveStudioSceneSession | null = null;
  private hdriRequestId = 0;

  constructor({
    runtime,
    registry,
    emit,
    getProjectModel,
    getSelectedEntityId,
    hasEntityIsolation,
    clearEntityIsolation,
    setSelectedEntity
  }: StudioSceneSessionControllerOptions) {
    this.runtime = runtime;
    this.registry = registry;
    this.emit = emit;
    this.getProjectModel = getProjectModel;
    this.getSelectedEntityId = getSelectedEntityId;
    this.hasEntityIsolation = hasEntityIsolation;
    this.clearEntityIsolation = clearEntityIsolation;
    this.setSelectedEntity = setSelectedEntity;
  }

  isActive() {
    return Boolean(this.activeSession);
  }

  isTargetEntity(entityId: string) {
    return this.activeSession?.targetEntityId === entityId;
  }

  getState(): StudioSceneState {
    if (!this.activeSession) {
      return createDefaultStudioSceneState();
    }

    return {
      active: true,
      presetId: this.activeSession.presetId,
      targetEntityId: this.activeSession.targetEntityId,
      targetScale: this.activeSession.targetScale,
      targetRotationY: this.activeSession.targetRotationY,
      hdriStatus: this.activeSession.hdriStatus,
      hdriError: this.activeSession.hdriError
    };
  }

  async enter(
    entityId: string,
    presetId: StudioScenePresetId = DEFAULT_STUDIO_SCENE_PRESET_ID,
    source: SyncSource = "ui"
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return false;
    const record = projectModel.getEntityById(entityId);
    const binding = this.registry.get(entityId);
    if (
      !record ||
      !binding ||
      record.kind === "light" ||
      record.item.locked ||
      !projectModel.isEntityEffectivelyVisible(entityId)
    ) {
      return false;
    }

    if (this.activeSession) {
      this.exit(source);
    }

    if (this.hasEntityIsolation()) {
      this.clearEntityIsolation(source);
    }

    const preset = getStudioScenePreset(presetId);
    const objectVisibilitySnapshot = this.captureObjectVisibilitySnapshot();
    const viewHelperSnapshot = this.captureViewHelperSnapshot();
    const targetTransformSnapshot = cloneObjectTransform(binding.object);
    const keepVisibleIds = this.collectVisibleIds(entityId);

    this.registry.list().forEach((entry) => {
      entry.object.visible =
        entry.kind === "light"
          ? false
          : keepVisibleIds.has(entry.model.id) &&
            (objectVisibilitySnapshot.find((item) => item.entityId === entry.model.id)?.visible ?? true);
    });

    this.runtime.setGridHelperVisible(false);
    this.runtime.setTransformGizmoVisible(false);
    this.runtime.setLightHelpersVisible(false);
    this.runtime.setShadowEnabled(true);

    this.activeSession = {
      targetEntityId: entityId,
      presetId,
      targetScale: 1,
      targetRotationY: 0,
      hdriStatus: "loading",
      hdriError: null,
      objectVisibilitySnapshot,
      viewHelperSnapshot,
      targetTransformSnapshot
    };

    this.runtime.studioScene.activate(preset, createStudioFrameFromObject(binding.object));
    this.setSelectedEntity(entityId, source);
    this.emitChanged();
    void this.loadHdriForPreset(presetId);
    return true;
  }

  setPreset(presetId: StudioScenePresetId) {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    const preset = getStudioScenePreset(presetId);
    session.presetId = presetId;
    session.hdriStatus = "loading";
    session.hdriError = null;
    this.runtime.studioScene.applyPreset(preset, createStudioFrameFromObject(binding.object));
    this.emitChanged();
    void this.loadHdriForPreset(presetId);
  }

  updateTargetTransform(input: {
    scale?: number;
    rotationY?: number;
  }) {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    const nextScale =
      typeof input.scale === "number" && Number.isFinite(input.scale)
        ? THREE.MathUtils.clamp(input.scale, 0.2, 3)
        : session.targetScale;
    const nextRotationY =
      typeof input.rotationY === "number" && Number.isFinite(input.rotationY)
        ? input.rotationY
        : session.targetRotationY;
    const rotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      nextRotationY
    );

    binding.object.position.copy(session.targetTransformSnapshot.position);
    binding.object.scale.copy(session.targetTransformSnapshot.scale).multiplyScalar(nextScale);
    binding.object.quaternion.copy(session.targetTransformSnapshot.quaternion).multiply(rotation);
    binding.object.updateMatrixWorld(true);
    session.targetScale = nextScale;
    session.targetRotationY = nextRotationY;
    this.emitChanged();
  }

  resetTargetTransform() {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    restoreObjectTransform(binding.object, session.targetTransformSnapshot);
    session.targetScale = 1;
    session.targetRotationY = 0;
    this.emitChanged();
  }

  exit(source: SyncSource = "ui") {
    this.clear(source, true);
  }

  clear(source: SyncSource, emitEvent: boolean) {
    const session = this.activeSession;
    if (!session) return;

    this.hdriRequestId += 1;
    const binding = this.registry.get(session.targetEntityId);
    if (binding) {
      restoreObjectTransform(binding.object, session.targetTransformSnapshot);
      this.registry.syncModelTransformToObject(session.targetEntityId);
    }

    session.objectVisibilitySnapshot.forEach(({ entityId, visible }) => {
      const entry = this.registry.get(entityId);
      if (entry) {
        entry.object.visible = visible;
      }
    });
    this.runtime.studioScene.deactivate();
    this.runtime.setGridHelperVisible(session.viewHelperSnapshot.gridHelper);
    this.runtime.setTransformGizmoVisible(session.viewHelperSnapshot.transformGizmo);
    this.runtime.setLightHelpersVisible(session.viewHelperSnapshot.lightHelper);
    this.runtime.setShadowEnabled(session.viewHelperSnapshot.shadow);

    const projectModel = this.getProjectModel();
    if (projectModel) {
      this.runtime.applyCameraModel(projectModel.camera);
    }

    this.activeSession = null;
    if (emitEvent) {
      this.emit({
        type: "studioSceneChanged",
        state: createDefaultStudioSceneState()
      });
      this.emit({ type: "viewStateUpdated" });
    }

    if (source === "ui" && this.getSelectedEntityId() === session.targetEntityId) {
      this.setSelectedEntity(session.targetEntityId, source);
    }
  }

  private async loadHdriForPreset(presetId: StudioScenePresetId) {
    const requestId = ++this.hdriRequestId;
    const session = this.activeSession;
    if (!session || session.presetId !== presetId) return;
    const preset = getStudioScenePreset(presetId);

    try {
      const response = await fetch(`/api/polyhaven/assets/${encodeURIComponent(preset.hdri.assetId)}?type=hdri`, {
        headers: {
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`HDRI detail request failed: ${response.status}`);
      }
      const payload = (await response.json()) as GetExternalAssetDetailResponse;
      const file = selectPreferredHdriFile(
        payload.asset,
        preset.hdri.preferredResolution,
        preset.hdri.preferredFormat
      );
      if (!file) {
        throw new Error("No HDRI file was returned for this studio preset.");
      }
      await this.runtime.studioScene.loadHdri(file.url, file.fileName);
      if (
        requestId !== this.hdriRequestId ||
        !this.activeSession ||
        this.activeSession.presetId !== presetId
      ) {
        return;
      }
      const runtimeState = this.runtime.studioScene.getState();
      this.activeSession.hdriStatus = runtimeState.hdriStatus;
      this.activeSession.hdriError = runtimeState.hdriError;
      this.emitChanged();
    } catch (error) {
      if (
        requestId !== this.hdriRequestId ||
        !this.activeSession ||
        this.activeSession.presetId !== presetId
      ) {
        return;
      }
      this.runtime.studioScene.clearHdri();
      this.activeSession.hdriStatus = "error";
      this.activeSession.hdriError =
        error instanceof Error ? error.message : "Failed to load studio HDRI.";
      this.emitChanged();
    }
  }

  private emitChanged() {
    this.emit({
      type: "studioSceneChanged",
      state: this.getState()
    });
    this.emit({ type: "viewStateUpdated" });
  }

  private captureObjectVisibilitySnapshot(): StudioObjectVisibilitySnapshot {
    return this.registry.list().map((binding) => ({
      entityId: binding.model.id,
      visible: binding.object.visible
    }));
  }

  private captureViewHelperSnapshot(): StudioViewHelperSnapshot {
    return {
      gridHelper: this.runtime.getGridHelperVisible(),
      transformGizmo: this.runtime.getTransformGizmoVisible(),
      lightHelper: this.runtime.getLightHelpersVisible(),
      shadow: this.runtime.getShadowEnabled()
    };
  }

  private collectVisibleIds(entityId: string) {
    const keepVisibleIds = new Set<string>([entityId]);
    const projectModel = this.getProjectModel();
    if (!projectModel) return keepVisibleIds;

    let currentEntityId = entityId;
    let parentGroupId = projectModel.getParentGroupId(currentEntityId);
    while (parentGroupId) {
      keepVisibleIds.add(parentGroupId);
      currentEntityId = parentGroupId;
      parentGroupId = projectModel.getParentGroupId(currentEntityId);
    }

    const record = projectModel.getEntityById(entityId);
    if (record?.kind === "group") {
      this.collectGroupDescendantIds(entityId, keepVisibleIds);
    }

    return keepVisibleIds;
  }

  private collectGroupDescendantIds(groupId: string, keepVisibleIds: Set<string>) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;
    projectModel.listDirectChildren(groupId).forEach((childId) => {
      const childRecord = projectModel.getEntityById(childId);
      if (!childRecord || childRecord.kind === "light") return;
      keepVisibleIds.add(childId);
      if (childRecord.kind === "group") {
        this.collectGroupDescendantIds(childId, keepVisibleIds);
      }
    });
  }
}
