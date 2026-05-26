import * as THREE from "three";

import type { GetExternalAssetDetailResponse } from "@/lib/externalAssets/contracts";
import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import type {
  EditorLightJSON,
  EditorMeshJSON,
  EditorMeshMaterialJSON,
  EditorProjectJSON,
  StudioSceneState,
  SyncSource,
  Vec3Tuple
} from "../core/types";
import type { EditorProjectModel } from "../models";
import type { EditorRuntime } from "../runtime/editorRuntime";
import {
  DEFAULT_STUDIO_SCENE_VARIANT_ID,
  DEFAULT_STUDIO_SCENE_PRESET_ID,
  getStudioScenePreset,
  getStudioSceneVariant,
  type StudioSceneHdriStatus,
  type StudioScenePresetId,
  type StudioSceneVariantId
} from "../studioScenes";
import { isStudioScenePreviewEntity } from "../studioSceneEligibility";

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

type StudioTargetFrame = {
  center: THREE.Vector3;
  radius: number;
  footprintRadius: number;
  height: number;
  floorY: number;
};

export type StudioTransientEntityRole =
  | "root"
  | "floor"
  | "backWall"
  | "sideWall"
  | "plinth"
  | "light";

type ActiveStudioSceneSession = {
  targetEntityId: string;
  presetId: StudioScenePresetId;
  variantId: StudioSceneVariantId;
  targetScale: number;
  targetRotationY: number;
  hdriStatus: StudioSceneHdriStatus;
  hdriError: string | null;
  objectVisibilitySnapshot: StudioObjectVisibilitySnapshot;
  viewHelperSnapshot: StudioViewHelperSnapshot;
  targetTransformSnapshot: StudioTargetTransformSnapshot;
  targetFrame: StudioTargetFrame;
  defaultTargetScale: number;
  transientEntityIds: Set<string>;
  transientRootGroupId: string | null;
  transientEntityRoles: Map<string, StudioTransientEntityRole>;
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
  rebuildGroupHierarchy: () => void;
};

export function createDefaultStudioSceneState(): StudioSceneState {
  return {
    active: false,
    presetId: null,
    variantId: null,
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

const STUDIO_TARGET_FOOTPRINT_RADIUS = 0.82;
const STUDIO_TARGET_MAX_HEIGHT = 1.8;
const STUDIO_TARGET_MIN_SCALE = 0.2;
const STUDIO_TARGET_MAX_SCALE = 3;
const MIN_STUDIO_FRAME_RADIUS = 1.2;
const STUDIO_WALL_HEIGHT_MULTIPLIER = 2.4;
const STUDIO_PLINTH_BASE_RADIUS = 0.7;
const STUDIO_PLINTH_BASE_HEIGHT = 1.4;

type StudioRoomBounds = {
  center: THREE.Vector3;
  radius: number;
  width: number;
  depth: number;
  wallHeight: number;
  floorY: number;
  leftX: number;
  rightX: number;
  backZ: number;
};

function createStudioFrameFromObject(object: THREE.Object3D): StudioTargetFrame {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  if (box.isEmpty()) {
    object.getWorldPosition(center);
    return {
      center,
      radius: 1,
      footprintRadius: 0.5,
      height: 1,
      floorY: center.y - 0.5
    };
  }

  box.getCenter(center);
  box.getSize(size);
  return {
    center,
    radius: Math.max(size.x, size.y, size.z) * 0.5,
    footprintRadius: Math.max(Math.hypot(size.x, size.z) * 0.5, 0.05),
    height: Math.max(size.y, 0.1),
    floorY: box.min.y
  };
}

function computeStudioFitScale(frame: StudioTargetFrame) {
  const footprintScale = STUDIO_TARGET_FOOTPRINT_RADIUS / Math.max(frame.footprintRadius, 0.05);
  const heightScale = STUDIO_TARGET_MAX_HEIGHT / Math.max(frame.height, 0.05);
  return THREE.MathUtils.clamp(
    Math.min(footprintScale, heightScale),
    STUDIO_TARGET_MIN_SCALE,
    STUDIO_TARGET_MAX_SCALE
  );
}

function applyStudioTargetTransform(
  object: THREE.Object3D,
  snapshot: StudioTargetTransformSnapshot,
  targetFrame: StudioTargetFrame,
  scale: number,
  rotationY: number
) {
  const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);

  object.position.copy(snapshot.position);
  object.scale.copy(snapshot.scale).multiplyScalar(scale);
  object.quaternion.copy(snapshot.quaternion).multiply(rotation);
  object.updateMatrixWorld(true);

  const frame = createStudioFrameFromObject(object);
  object.position.add(
    new THREE.Vector3(
      targetFrame.center.x - frame.center.x,
      targetFrame.floorY - frame.floorY,
      targetFrame.center.z - frame.center.z
    )
  );
  object.updateMatrixWorld(true);

  return createStudioFrameFromObject(object);
}

function createStudioEntityId(prefix: string) {
  return `studio-${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

function createStudioMaterial(
  color: string,
  options: Pick<EditorMeshMaterialJSON, "metalness" | "roughness" | "emissive" | "emissiveIntensity"> = {}
): EditorMeshMaterialJSON {
  return {
    color,
    opacity: 1,
    metalness: options.metalness ?? 0,
    roughness: options.roughness ?? 0.82,
    emissive: options.emissive ?? "#000000",
    emissiveIntensity: options.emissiveIntensity ?? 1
  };
}

function createStudioRoomBounds(
  preset: ReturnType<typeof getStudioScenePreset>,
  frame: StudioTargetFrame
): StudioRoomBounds {
  const radius = Math.max(frame.radius, MIN_STUDIO_FRAME_RADIUS);
  const width = radius * 7;
  const depth = radius * 6.5;
  const wallHeight = Math.max(frame.height * STUDIO_WALL_HEIGHT_MULTIPLIER, radius * 4);
  const floorY = frame.floorY - preset.targetLift * radius;
  const center = frame.center.clone();

  return {
    center,
    radius,
    width,
    depth,
    wallHeight,
    floorY,
    leftX: center.x - width * 0.48,
    rightX: center.x + width * 0.48,
    backZ: center.z - depth * 0.48
  };
}

function createBoxStudioMesh(input: {
  id: string;
  label: string;
  color: string;
  position: Vec3Tuple;
  scale: Vec3Tuple;
  material?: Partial<EditorMeshMaterialJSON>;
}): EditorMeshJSON {
  return {
    id: input.id,
    label: input.label,
    type: 1,
    geometryName: "Box",
    material: {
      ...createStudioMaterial(input.color),
      ...input.material
    },
    position: input.position,
    quaternion: [0, 0, 0, 1],
    scale: input.scale,
    visible: true,
    locked: false
  };
}

function createPlinthMesh(input: {
  id: string;
  label: string;
  color: string;
  radius: number;
  height: number;
  position: Vec3Tuple;
  material?: Partial<EditorMeshMaterialJSON>;
}): EditorMeshJSON {
  return {
    id: input.id,
    label: input.label,
    type: 1,
    geometryName: "Cylinder",
    material: {
      ...createStudioMaterial(input.color, { roughness: 0.68 }),
      ...input.material
    },
    position: input.position,
    quaternion: [0, 0, 0, 1],
    scale: [
      input.radius / STUDIO_PLINTH_BASE_RADIUS,
      input.height / STUDIO_PLINTH_BASE_HEIGHT,
      input.radius / STUDIO_PLINTH_BASE_RADIUS
    ],
    visible: true,
    locked: false
  };
}

function createLookAtQuaternion(position: THREE.Vector3, target: THREE.Vector3) {
  const helper = new THREE.Object3D();
  helper.position.copy(position);
  helper.lookAt(target);
  return helper.quaternion;
}

function toQuaternionTuple(quaternion: THREE.Quaternion): [number, number, number, number] {
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
}

function toVec3Tuple(vector: THREE.Vector3): Vec3Tuple {
  return [vector.x, vector.y, vector.z];
}

function createStudioLight(input: {
  id: string;
  label: string;
  type: EditorLightJSON["type"];
  color: string;
  intensity: number;
  position: THREE.Vector3;
  target: THREE.Vector3;
  width?: number;
  height?: number;
  distance?: number;
  angle?: number;
  penumbra?: number;
}): EditorLightJSON {
  return {
    id: input.id,
    label: input.label,
    type: input.type,
    locked: false,
    position: toVec3Tuple(input.position),
    quaternion: toQuaternionTuple(createLookAtQuaternion(input.position, input.target)),
    scale: [1, 1, 1],
    color: input.color,
    groundColor: "#2a3548",
    intensity: input.intensity,
    distance: input.distance ?? 0,
    decay: 2,
    angle: input.angle ?? Math.PI / 3,
    penumbra: input.penumbra ?? 0,
    width: input.width ?? 1,
    height: input.height ?? 1
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
  private readonly rebuildGroupHierarchy: () => void;
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
    setSelectedEntity,
    rebuildGroupHierarchy
  }: StudioSceneSessionControllerOptions) {
    this.runtime = runtime;
    this.registry = registry;
    this.emit = emit;
    this.getProjectModel = getProjectModel;
    this.getSelectedEntityId = getSelectedEntityId;
    this.hasEntityIsolation = hasEntityIsolation;
    this.clearEntityIsolation = clearEntityIsolation;
    this.setSelectedEntity = setSelectedEntity;
    this.rebuildGroupHierarchy = rebuildGroupHierarchy;
  }

  isActive() {
    return Boolean(this.activeSession);
  }

  isTargetEntity(entityId: string) {
    return this.activeSession?.targetEntityId === entityId;
  }

  isTransientStudioEntity(entityId: string) {
    return this.activeSession?.transientEntityIds.has(entityId) ?? false;
  }

  getTransientStudioEntityRole(entityId: string) {
    return this.activeSession?.transientEntityRoles.get(entityId) ?? null;
  }

  getTransientStudioEntityIds() {
    return this.activeSession ? Array.from(this.activeSession.transientEntityIds) : [];
  }

  filterTransientEntitiesFromProjectJSON(projectJson: EditorProjectJSON): EditorProjectJSON {
    const session = this.activeSession;
    if (!session || session.transientEntityIds.size === 0) {
      return projectJson;
    }

    const transientIds = session.transientEntityIds;
    return {
      ...projectJson,
      groups: projectJson.groups
        ?.filter((group) => !transientIds.has(group.id))
        .map((group) => ({
          ...group,
          children: group.children.filter((childId) => !transientIds.has(childId))
        })),
      mesh: projectJson.mesh?.filter((mesh) => !transientIds.has(mesh.id)),
      light: projectJson.light?.filter((light) => !transientIds.has(light.id)),
      model: projectJson.model?.filter((model) => !transientIds.has(model.id))
    };
  }

  getState(): StudioSceneState {
    if (!this.activeSession) {
      return createDefaultStudioSceneState();
    }

    return {
      active: true,
      presetId: this.activeSession.presetId,
      variantId: this.activeSession.variantId,
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
      !isStudioScenePreviewEntity(projectModel, entityId) ||
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
    const targetFrame = createStudioFrameFromObject(binding.object);
    const defaultTargetScale = computeStudioFitScale(targetFrame);
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
      variantId: DEFAULT_STUDIO_SCENE_VARIANT_ID,
      targetScale: defaultTargetScale,
      targetRotationY: 0,
      hdriStatus: "loading",
      hdriError: null,
      objectVisibilitySnapshot,
      viewHelperSnapshot,
      targetTransformSnapshot,
      targetFrame,
      defaultTargetScale,
      transientEntityIds: new Set(),
      transientRootGroupId: null,
      transientEntityRoles: new Map()
    };

    const studioFrame = applyStudioTargetTransform(
      binding.object,
      targetTransformSnapshot,
      targetFrame,
      defaultTargetScale,
      0
    );
    this.createTransientStudioEntities(this.activeSession, preset, studioFrame);
    this.frameCamera(preset, studioFrame);
    this.setSelectedEntity(entityId, source);
    this.emitChanged();
    return true;
  }

  private createTransientStudioEntities(
    session: ActiveStudioSceneSession,
    preset: ReturnType<typeof getStudioScenePreset>,
    frame: StudioTargetFrame
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;

    const bounds = createStudioRoomBounds(preset, frame);
    const plinthHeight = Math.max(bounds.radius * 0.32, 0.18);
    const plinthRadius = Math.max(frame.footprintRadius * 1.16, bounds.radius * 0.72, 0.72);
    const wallThickness = Math.max(bounds.radius * 0.04, 0.05);
    const rootGroupId = createStudioEntityId("root");
    const rootGroup = projectModel.addGroup({
      id: rootGroupId,
      label: "Studio Scene",
      children: [],
      locked: false,
      visible: true,
      position: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      scale: [1, 1, 1]
    });
    this.registry.create(rootGroup);
    this.registerTransientEntity(session, rootGroupId, "root");
    session.transientRootGroupId = rootGroupId;

    const addMesh = (mesh: EditorMeshJSON, role: StudioTransientEntityRole) => {
      const model = projectModel.addMesh(mesh);
      rootGroup.children.push(model.id);
      const binding = this.registry.create(model);
      this.registerTransientEntity(session, model.id, role);
      this.markTransientObject(model.id, role);
      return binding;
    };

    const addLight = (light: EditorLightJSON) => {
      const model = projectModel.addLight(light);
      rootGroup.children.push(model.id);
      const binding = this.registry.create(model);
      this.registerTransientEntity(session, model.id, "light");
      this.markTransientObject(model.id, "light");
      return binding;
    };

    addMesh(
      createBoxStudioMesh({
        id: createStudioEntityId("floor"),
        label: "Studio Floor",
        color: preset.floorColor,
        position: [bounds.center.x, bounds.floorY - wallThickness / 2, bounds.center.z],
        scale: [bounds.width, wallThickness, bounds.depth],
        material: { roughness: 0.86 }
      }),
      "floor"
    );
    addMesh(
      createBoxStudioMesh({
        id: createStudioEntityId("back-wall"),
        label: "Studio Back Wall",
        color: preset.wallColor,
        position: [bounds.center.x, bounds.floorY + bounds.wallHeight / 2, bounds.backZ],
        scale: [bounds.width, bounds.wallHeight, wallThickness],
        material: { roughness: 0.82 }
      }),
      "backWall"
    );
    addMesh(
      createBoxStudioMesh({
        id: createStudioEntityId("left-wall"),
        label: "Studio Left Wall",
        color: preset.wallColor,
        position: [bounds.leftX, bounds.floorY + bounds.wallHeight / 2, bounds.center.z],
        scale: [wallThickness, bounds.wallHeight, bounds.depth],
        material: { roughness: 0.82 }
      }),
      "sideWall"
    );
    addMesh(
      createBoxStudioMesh({
        id: createStudioEntityId("right-wall"),
        label: "Studio Right Wall",
        color: preset.wallColor,
        position: [bounds.rightX, bounds.floorY + bounds.wallHeight / 2, bounds.center.z],
        scale: [wallThickness, bounds.wallHeight, bounds.depth],
        material: { roughness: 0.82 }
      }),
      "sideWall"
    );
    addMesh(
      createPlinthMesh({
        id: createStudioEntityId("plinth"),
        label: "Studio Plinth",
        color: preset.plinthColor,
        radius: plinthRadius,
        height: plinthHeight,
        position: [bounds.center.x, bounds.floorY + plinthHeight / 2, bounds.center.z],
        material: {
          metalness: preset.id === "darkTechStudio" ? 0.15 : 0,
          roughness: preset.id === "darkTechStudio" ? 0.45 : 0.68
        }
      }),
      "plinth"
    );

    const keyPosition = new THREE.Vector3(
      bounds.center.x + bounds.radius * preset.keyLight.position[0],
      bounds.floorY + bounds.radius * preset.keyLight.position[1],
      bounds.center.z + bounds.radius * preset.keyLight.position[2]
    );
    const keyTarget = new THREE.Vector3(
      bounds.center.x + bounds.radius * preset.keyLight.target[0],
      bounds.floorY + bounds.radius * preset.keyLight.target[1],
      bounds.center.z + bounds.radius * preset.keyLight.target[2]
    );
    const fillPosition = new THREE.Vector3(
      bounds.center.x + bounds.radius * preset.fillLight.position[0],
      bounds.floorY + bounds.radius * preset.fillLight.position[1],
      bounds.center.z + bounds.radius * preset.fillLight.position[2]
    );
    const fillTarget = new THREE.Vector3(
      bounds.center.x + bounds.radius * preset.fillLight.target[0],
      bounds.floorY + bounds.radius * preset.fillLight.target[1],
      bounds.center.z + bounds.radius * preset.fillLight.target[2]
    );
    const rimPosition = new THREE.Vector3(
      bounds.center.x + bounds.radius * preset.rimLight.position[0],
      bounds.floorY + bounds.radius * preset.rimLight.position[1],
      bounds.center.z + bounds.radius * preset.rimLight.position[2]
    );
    const rimTarget = new THREE.Vector3(
      bounds.center.x + bounds.radius * preset.rimLight.target[0],
      bounds.floorY + bounds.radius * preset.rimLight.target[1],
      bounds.center.z + bounds.radius * preset.rimLight.target[2]
    );

    addLight(
      createStudioLight({
        id: createStudioEntityId("key-light"),
        label: "Studio Key Softbox",
        type: "rectArea",
        color: preset.keyLight.color,
        intensity: preset.keyLight.intensity,
        position: keyPosition,
        target: keyTarget,
        width: (preset.keyLight.width ?? 2.5) * bounds.radius,
        height: (preset.keyLight.height ?? 2) * bounds.radius
      })
    );
    addLight(
      createStudioLight({
        id: createStudioEntityId("fill-light"),
        label: "Studio Fill Softbox",
        type: "rectArea",
        color: preset.fillLight.color,
        intensity: preset.fillLight.intensity,
        position: fillPosition,
        target: fillTarget,
        width: (preset.fillLight.width ?? 2.2) * bounds.radius,
        height: (preset.fillLight.height ?? 2) * bounds.radius
      })
    );
    addLight(
      createStudioLight({
        id: createStudioEntityId("rim-light"),
        label: "Studio Rim Light",
        type: "spot",
        color: preset.rimLight.color,
        intensity: preset.rimLight.intensity,
        position: rimPosition,
        target: rimTarget,
        distance: (preset.rimLight.distance ?? 8) * bounds.radius,
        angle: preset.rimLight.angle,
        penumbra: preset.rimLight.penumbra
      })
    );

    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();
  }

  private registerTransientEntity(
    session: ActiveStudioSceneSession,
    entityId: string,
    role: StudioTransientEntityRole
  ) {
    session.transientEntityIds.add(entityId);
    session.transientEntityRoles.set(entityId, role);
  }

  private markTransientObject(entityId: string, role: StudioTransientEntityRole) {
    const binding = this.registry.get(entityId);
    if (!binding) return;
    binding.object.userData.studioScene = true;
    binding.object.userData.studioSceneRole = role;
    binding.pickTargets?.forEach((target) => {
      target.userData.studioScene = true;
      target.userData.studioSceneRole = role;
    });
  }

  private removeTransientStudioEntities(session: ActiveStudioSceneSession) {
    const projectModel = this.getProjectModel();
    const transientIds = Array.from(session.transientEntityIds);
    const rootGroupId = session.transientRootGroupId;
    const idsForRemoval = [
      ...transientIds.filter((entityId) => entityId !== rootGroupId).reverse(),
      ...(rootGroupId ? [rootGroupId] : [])
    ];

    idsForRemoval.forEach((entityId) => {
      this.registry.remove(entityId);
      projectModel?.removeEntity(entityId);
    });

    session.transientEntityIds.clear();
    session.transientEntityRoles.clear();
    session.transientRootGroupId = null;
    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();
  }

  private frameCamera(preset: ReturnType<typeof getStudioScenePreset>, frame: StudioTargetFrame) {
    this.runtime.frameStudioCamera({
      center: frame.center,
      floorY: frame.floorY,
      height: frame.height,
      radius: frame.radius,
      fov: preset.cameraFov,
      pitch: preset.cameraPitch,
      yaw: preset.cameraYaw,
      distanceMultiplier: preset.cameraDistanceMultiplier
    });
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
    this.runtime.studioScene.applyPreset(
      preset,
      getStudioSceneVariant(session.variantId),
      createStudioFrameFromObject(binding.object)
    );
    this.emitChanged();
    void this.loadHdriForPreset(presetId);
  }

  setVariant(variantId: StudioSceneVariantId) {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    session.variantId = variantId;
    this.runtime.studioScene.applyPreset(
      getStudioScenePreset(session.presetId),
      getStudioSceneVariant(variantId),
      createStudioFrameFromObject(binding.object)
    );
    this.emitChanged();
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
        ? THREE.MathUtils.clamp(input.scale, STUDIO_TARGET_MIN_SCALE, STUDIO_TARGET_MAX_SCALE)
        : session.targetScale;
    const nextRotationY =
      typeof input.rotationY === "number" && Number.isFinite(input.rotationY)
        ? input.rotationY
        : session.targetRotationY;
    const nextFrame = applyStudioTargetTransform(
      binding.object,
      session.targetTransformSnapshot,
      session.targetFrame,
      nextScale,
      nextRotationY
    );
    session.targetScale = nextScale;
    session.targetRotationY = nextRotationY;
    this.runtime.studioScene.applyPreset(
      getStudioScenePreset(session.presetId),
      getStudioSceneVariant(session.variantId),
      nextFrame
    );
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

    const resetFrame = applyStudioTargetTransform(
      binding.object,
      session.targetTransformSnapshot,
      session.targetFrame,
      session.defaultTargetScale,
      0
    );
    session.targetScale = session.defaultTargetScale;
    session.targetRotationY = 0;
    this.runtime.studioScene.applyPreset(
      getStudioScenePreset(session.presetId),
      getStudioSceneVariant(session.variantId),
      resetFrame
    );
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

    const selectedEntityId = this.getSelectedEntityId();
    if (selectedEntityId && session.transientEntityIds.has(selectedEntityId)) {
      this.setSelectedEntity(null, source);
    }
    this.removeTransientStudioEntities(session);

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
