import * as THREE from "three";

import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import type {
  EditorLightJSON,
  EditorMeshJSON,
  EditorMeshMaterialJSON,
  EditorProjectJSON,
  ResolvedEditorEnvConfigJSON,
  StudioSceneState,
  SyncSource,
  Vec3Tuple
} from "../core/types";
import type { EditorProjectModel } from "../models";
import type { EditorRuntime } from "../runtime/editorRuntime";
import {
  DEFAULT_STUDIO_SCENE_VARIANT_ID,
  getStudioScenePreset,
  type StudioSceneHdriStatus,
  type StudioScenePresetId,
  type StudioSceneVariantId
} from "../studioScenes";
import { isStudioScenePreviewEntity } from "../studioSceneEligibility";
import {
  createStudioEnvPatchFromStyleProfile,
  inferStudioProductProfile,
  resolveStudioSceneStyleProfile,
  type PbrSurfaceConfig,
  type StudioProductProfile,
  type StudioSceneStyleProfileId,
  type StudioSceneStyleSelectionMode
} from "../studioSceneProfiles";
import { mergeEditorPostProcessingConfig } from "../postProcessing";

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
  | "light"
  | "userMesh"
  | "userLight"
  | "userLightGroup"
  | "userModel";

type StudioTransientAdoptOptions = {
  childRole?: StudioTransientEntityRole;
  attachToRoot?: boolean;
  placeAtSpawn?: boolean;
};

export type StudioSceneEntityAction =
  | "select"
  | "transform"
  | "material"
  | "light"
  | "delete"
  | "duplicate"
  | "rename"
  | "lock"
  | "visibility";

type ActiveStudioSceneSession = {
  targetEntityId: string;
  presetId: StudioScenePresetId;
  variantId: StudioSceneVariantId;
  productProfile: StudioProductProfile;
  styleProfileId: StudioSceneStyleProfileId;
  styleSelectionMode: StudioSceneStyleSelectionMode;
  targetScale: number;
  targetRotationY: number;
  hdriStatus: StudioSceneHdriStatus;
  hdriError: string | null;
  objectVisibilitySnapshot: StudioObjectVisibilitySnapshot;
  viewHelperSnapshot: StudioViewHelperSnapshot;
  targetTransformSnapshot: StudioTargetTransformSnapshot;
  sceneEnvConfigSnapshot: ResolvedEditorEnvConfigJSON;
  targetFrame: StudioTargetFrame;
  defaultTargetScale: number;
  visibleOriginalEntityIds: Set<string>;
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
    productProfile: null,
    styleProfileId: null,
    styleSelectionMode: null,
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

function cloneResolvedEnvConfig(envConfig: ResolvedEditorEnvConfigJSON): ResolvedEditorEnvConfigJSON {
  return structuredClone(envConfig) as ResolvedEditorEnvConfigJSON;
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

function createStudioMaterialFromSurface(surface: PbrSurfaceConfig): EditorMeshMaterialJSON {
  return createStudioMaterial(surface.color, {
    roughness: surface.roughness,
    metalness: surface.metalness,
    emissive: surface.emissive,
    emissiveIntensity: surface.emissiveIntensity
  });
}

function createStudioRoomBounds(
  preset: ReturnType<typeof getStudioScenePreset>,
  frame: StudioTargetFrame
): StudioRoomBounds {
  const radius = Math.max(frame.radius, MIN_STUDIO_FRAME_RADIUS);
  const width = radius * preset.layout.background.widthMultiplier;
  const depth = radius * preset.layout.background.depthMultiplier;
  const wallHeight = Math.max(
    frame.height * STUDIO_WALL_HEIGHT_MULTIPLIER,
    radius * preset.layout.background.heightMultiplier
  );
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

  isStudioSceneEntityInteractive(entityId: string) {
    const session = this.activeSession;
    if (!session) return true;
    return session.transientEntityIds.has(entityId) || session.visibleOriginalEntityIds.has(entityId);
  }

  canUseStudioSceneEntityAction(entityId: string, action: StudioSceneEntityAction) {
    const session = this.activeSession;
    if (!session) return true;

    if (session.visibleOriginalEntityIds.has(entityId)) {
      return action === "select";
    }

    if (!session.transientEntityIds.has(entityId)) {
      return false;
    }

    const role = session.transientEntityRoles.get(entityId);
    if (role === "root") {
      return action === "select" || action === "transform";
    }

    if (role === "plinth") {
      return action === "select" || action === "transform" || action === "material" || action === "rename" || action === "lock";
    }

    if (role === "floor" || role === "backWall" || role === "sideWall") {
      return action === "select" || action === "transform" || action === "material" || action === "rename" || action === "lock" || action === "visibility";
    }

    if (role === "light") {
      return action === "select" || action === "transform" || action === "light" || action === "rename" || action === "lock" || action === "visibility";
    }

    if (role === "userLight") {
      return action === "select" || action === "transform" || action === "light" || action === "delete" || action === "rename" || action === "lock" || action === "visibility";
    }

    return action !== "duplicate";
  }

  getTransientStudioEntityRole(entityId: string) {
    return this.activeSession?.transientEntityRoles.get(entityId) ?? null;
  }

  getTransientStudioEntityIds() {
    return this.activeSession ? Array.from(this.activeSession.transientEntityIds) : [];
  }

  adoptTransientStudioEntity(
    entityId: string,
    role: StudioTransientEntityRole,
    options: StudioTransientAdoptOptions = {}
  ) {
    const session = this.activeSession;
    const projectModel = this.getProjectModel();
    if (!session || !projectModel) return false;

    const record = projectModel.getEntityById(entityId);
    if (!record) return false;

    const attachToRoot = options.attachToRoot ?? role !== "root";
    if (attachToRoot && session.transientRootGroupId && entityId !== session.transientRootGroupId) {
      projectModel.groups.forEach((group) => {
        group.children = group.children.filter((childId) => childId !== entityId);
      });
      const rootGroup = projectModel.groups.get(session.transientRootGroupId);
      if (rootGroup && !rootGroup.children.includes(entityId)) {
        rootGroup.children.push(entityId);
      }
    }

    this.registerTransientEntity(session, entityId, role);
    this.markTransientObject(entityId, role);
    if (options.placeAtSpawn) {
      this.placeTransientEntityAtSpawn(session, entityId);
    }

    if (record.kind === "group") {
      const childRole = options.childRole ?? role;
      this.registerTransientGroupChildren(session, entityId, childRole);
    }

    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();
    this.emitChanged();
    return true;
  }

  filterTransientEntitiesFromProjectJSON(projectJson: EditorProjectJSON): EditorProjectJSON {
    const session = this.activeSession;
    if (!session || session.transientEntityIds.size === 0) {
      return projectJson;
    }

    const transientIds = session.transientEntityIds;
    return {
      ...projectJson,
      envConfig: cloneResolvedEnvConfig(session.sceneEnvConfigSnapshot),
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
      productProfile: this.activeSession.productProfile,
      styleProfileId: this.activeSession.styleProfileId,
      styleSelectionMode: this.activeSession.styleSelectionMode,
      targetScale: this.activeSession.targetScale,
      targetRotationY: this.activeSession.targetRotationY,
      hdriStatus: this.activeSession.hdriStatus,
      hdriError: this.activeSession.hdriError
    };
  }

  async enter(
    entityId: string,
    presetId: StudioScenePresetId | null = null,
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

    const productProfile = inferStudioProductProfile(projectModel, this.registry, entityId);
    const styleProfile = resolveStudioSceneStyleProfile(productProfile, presetId);
    const resolvedPresetId = styleProfile.id;
    const preset = getStudioScenePreset(resolvedPresetId);
    const objectVisibilitySnapshot = this.captureObjectVisibilitySnapshot();
    const viewHelperSnapshot = this.captureViewHelperSnapshot();
    const targetTransformSnapshot = cloneObjectTransform(binding.object);
    const sceneEnvConfigSnapshot = cloneResolvedEnvConfig(projectModel.envConfig);
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
    this.runtime.setTransformGizmoVisible(true);
    this.runtime.setLightHelpersVisible(false);
    this.runtime.setShadowEnabled(true);

    this.activeSession = {
      targetEntityId: entityId,
      presetId: resolvedPresetId,
      variantId: DEFAULT_STUDIO_SCENE_VARIANT_ID,
      productProfile,
      styleProfileId: resolvedPresetId,
      styleSelectionMode: presetId ? "manual" : "auto",
      targetScale: defaultTargetScale,
      targetRotationY: 0,
      hdriStatus: "idle",
      hdriError: null,
      objectVisibilitySnapshot,
      viewHelperSnapshot,
      targetTransformSnapshot,
      sceneEnvConfigSnapshot,
      targetFrame,
      defaultTargetScale,
      visibleOriginalEntityIds: keepVisibleIds,
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
    this.applyStyleProfileToSceneEnv(styleProfile, source);
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
    const plinthHeight = Math.max(bounds.radius * preset.layout.plinth.heightRatio, 0.18);
    const plinthRadius = Math.max(
      frame.footprintRadius * preset.layout.plinth.fitPaddingRatio,
      preset.layout.plinth.minRadius
    );
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
    this.markTransientObject(rootGroupId, "root");
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
        color: preset.materials.surfaces.floor.color,
        position: [bounds.center.x, bounds.floorY - wallThickness / 2, bounds.center.z],
        scale: [bounds.width, wallThickness, bounds.depth],
        material: createStudioMaterialFromSurface(preset.materials.surfaces.floor)
      }),
      "floor"
    );
    addMesh(
      createBoxStudioMesh({
        id: createStudioEntityId("back-wall"),
        label: "Studio Back Wall",
        color: preset.materials.surfaces.wall.color,
        position: [bounds.center.x, bounds.floorY + bounds.wallHeight / 2, bounds.backZ],
        scale: [bounds.width, bounds.wallHeight, wallThickness],
        material: createStudioMaterialFromSurface(preset.materials.surfaces.wall)
      }),
      "backWall"
    );
    addMesh(
      createBoxStudioMesh({
        id: createStudioEntityId("left-wall"),
        label: "Studio Left Wall",
        color: preset.materials.surfaces.wall.color,
        position: [bounds.leftX, bounds.floorY + bounds.wallHeight / 2, bounds.center.z],
        scale: [wallThickness, bounds.wallHeight, bounds.depth],
        material: createStudioMaterialFromSurface(preset.materials.surfaces.wall)
      }),
      "sideWall"
    );
    addMesh(
      createBoxStudioMesh({
        id: createStudioEntityId("right-wall"),
        label: "Studio Right Wall",
        color: preset.materials.surfaces.wall.color,
        position: [bounds.rightX, bounds.floorY + bounds.wallHeight / 2, bounds.center.z],
        scale: [wallThickness, bounds.wallHeight, bounds.depth],
        material: createStudioMaterialFromSurface(preset.materials.surfaces.wall)
      }),
      "sideWall"
    );
    addMesh(
      createPlinthMesh({
        id: createStudioEntityId("plinth"),
        label: "Studio Plinth",
        color: preset.materials.surfaces.plinth.color,
        radius: plinthRadius,
        height: plinthHeight,
        position: [bounds.center.x, bounds.floorY + plinthHeight / 2, bounds.center.z],
        material: createStudioMaterialFromSurface(preset.materials.surfaces.plinth)
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

  private placeTransientEntityAtSpawn(session: ActiveStudioSceneSession, entityId: string) {
    const targetBinding = this.registry.get(session.targetEntityId);
    const binding = this.registry.get(entityId);
    if (!targetBinding || !binding) return;

    const frame = createStudioFrameFromObject(targetBinding.object);
    const offset = Math.max(frame.radius * 0.7, 0.7);
    binding.model.patchTransform({
      position: [
        frame.center.x,
        frame.floorY + Math.max(frame.radius * 0.35, 0.3),
        frame.center.z + offset
      ]
    });
    this.registry.syncModelTransformToObject(entityId);
  }

  private registerTransientGroupChildren(
    session: ActiveStudioSceneSession,
    groupId: string,
    role: StudioTransientEntityRole
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;

    projectModel.listDirectChildren(groupId).forEach((childId) => {
      const childRecord = projectModel.getEntityById(childId);
      if (!childRecord) return;

      const childRole =
        childRecord.kind === "light" && role === "userLightGroup" ? "userLight" : role;
      this.registerTransientEntity(session, childId, childRole);
      this.markTransientObject(childId, childRole);

      if (childRecord.kind === "group") {
        this.registerTransientGroupChildren(session, childId, childRole);
      }
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

  private applyStyleProfileToSceneEnv(
    styleProfile: ReturnType<typeof resolveStudioSceneStyleProfile>,
    source: SyncSource
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;

    const patch = createStudioEnvPatchFromStyleProfile(styleProfile);
    projectModel.envConfig = {
      ...projectModel.envConfig,
      ...patch,
      postProcessing: patch.postProcessing
        ? mergeEditorPostProcessingConfig(projectModel.envConfig.postProcessing, patch.postProcessing)
        : projectModel.envConfig.postProcessing,
      ground: {
        ...projectModel.envConfig.ground,
        visible: false,
        mode: "plane"
      }
    };
    this.runtime.applyEnvConfig(projectModel.envConfig);
    this.emit({ type: "sceneUpdated", source, pathTraceInvalidation: "environment" });
  }

  private rebuildTransientStudioEntities(
    session: ActiveStudioSceneSession,
    preset: ReturnType<typeof getStudioScenePreset>,
    frame: StudioTargetFrame
  ) {
    const selectedEntityId = this.getSelectedEntityId();
    if (selectedEntityId && session.transientEntityIds.has(selectedEntityId)) {
      this.setSelectedEntity(null, "ui");
    }
    this.removeTransientStudioEntities(session);
    this.createTransientStudioEntities(session, preset, frame);
    this.frameCamera(preset, frame);
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
    session.styleProfileId = presetId;
    session.styleSelectionMode = "manual";
    session.hdriStatus = "idle";
    session.hdriError = null;
    this.applyStyleProfileToSceneEnv(
      resolveStudioSceneStyleProfile(session.productProfile, presetId),
      "ui"
    );
    this.rebuildTransientStudioEntities(session, preset, createStudioFrameFromObject(binding.object));
    this.emitChanged();
  }

  autoMatchStyle() {
    const session = this.activeSession;
    if (!session) return;
    const projectModel = this.getProjectModel();
    const binding = this.registry.get(session.targetEntityId);
    if (!projectModel || !binding) {
      this.exit("ui");
      return;
    }

    const productProfile = inferStudioProductProfile(projectModel, this.registry, session.targetEntityId);
    const styleProfile = resolveStudioSceneStyleProfile(productProfile);
    const preset = getStudioScenePreset(styleProfile.id);

    session.productProfile = productProfile;
    session.presetId = styleProfile.id;
    session.styleProfileId = styleProfile.id;
    session.styleSelectionMode = "auto";
    session.hdriStatus = "idle";
    session.hdriError = null;
    this.applyStyleProfileToSceneEnv(styleProfile, "ui");
    this.rebuildTransientStudioEntities(session, preset, createStudioFrameFromObject(binding.object));
    this.emitChanged();
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
    this.rebuildTransientStudioEntities(session, getStudioScenePreset(session.presetId), nextFrame);
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
    this.rebuildTransientStudioEntities(session, getStudioScenePreset(session.presetId), resetFrame);
    this.emitChanged();
  }

  exit(source: SyncSource = "ui") {
    this.clear(source, true);
  }

  clear(source: SyncSource, emitEvent: boolean) {
    const session = this.activeSession;
    if (!session) return;

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
    this.runtime.setGridHelperVisible(session.viewHelperSnapshot.gridHelper);
    this.runtime.setTransformGizmoVisible(session.viewHelperSnapshot.transformGizmo);
    this.runtime.setLightHelpersVisible(session.viewHelperSnapshot.lightHelper);
    this.runtime.setShadowEnabled(session.viewHelperSnapshot.shadow);

    const projectModel = this.getProjectModel();
    if (projectModel) {
      projectModel.envConfig = cloneResolvedEnvConfig(session.sceneEnvConfigSnapshot);
      if (projectModel.envConfig.panoUrl) {
        void this.runtime
          .setEnvironmentFromUrl(
            projectModel.envConfig.panoUrl,
            projectModel.envConfig.panoAssetName || projectModel.envConfig.panoUrl
          )
          .finally(() => {
            this.runtime.applyEnvConfig(projectModel.envConfig);
            this.emit({ type: "sceneUpdated", source, pathTraceInvalidation: "environment" });
            this.emit({ type: "viewStateUpdated" });
          });
      } else {
        this.runtime.clearEnvironment();
      }
      this.runtime.applyEnvConfig(projectModel.envConfig);
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
