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
  resolveStudioSceneStyleProfile,
  type StudioProductProfile,
  type StudioSceneStyleProfileId,
  type StudioSceneStyleSelectionMode
} from "../studioSceneProfiles";
import { mergeEditorPostProcessingConfig } from "../postProcessing";
import {
  createStudioBackgroundDescriptors,
  createStudioDecorationDescriptorForKind,
  createStudioDecorationDescriptors,
  createStudioPlinthDescriptors,
  getStudioDecorationScale,
  resolveStudioPlinthKind,
  type StudioLayoutMeshDescriptor,
  type StudioDecorationKind,
  type StudioPlinthKind
} from "../studioSceneLayoutGenerator";
import {
  createStudioLightingDescriptors,
  type StudioLightingLightDescriptor,
  type StudioLightingModifierDescriptor
} from "../studioSceneLightingGenerator";

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
  | "layoutGroup"
  | "background"
  | "cove"
  | "floor"
  | "backWall"
  | "sideWall"
  | "plinth"
  | "decoration"
  | "light"
  | "studioLight"
  | "keyLight"
  | "keyShadowLight"
  | "fillLight"
  | "rimLight"
  | "topLight"
  | "accentLight"
  | "lightModifier"
  | "reflector"
  | "negativeFill"
  | "stripPanel"
  | "userMesh"
  | "userLight"
  | "userLightGroup"
  | "userModel";

type StudioTransientAdoptOptions = {
  childRole?: StudioTransientEntityRole;
  attachToRoot?: boolean;
  placeAtSpawn?: boolean;
};

export type StudioSceneEnterOptions = {
  productProfile: StudioProductProfile;
  styleProfileId?: StudioScenePresetId | null;
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

export type StudioHdriResolveInput = {
  provider: "polyhaven" | "local" | "none";
  assetId?: string;
  url?: string;
};

export type StudioHdriResolveResult = {
  url: string;
  assetName?: string;
};

type ActiveStudioSceneSession = {
  targetEntityId: string;
  presetId: StudioScenePresetId;
  variantId: StudioSceneVariantId;
  productProfile: StudioProductProfile;
  styleProfileId: StudioSceneStyleProfileId;
  styleSelectionMode: StudioSceneStyleSelectionMode;
  plinthKind: StudioPlinthKind;
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
  transientLayoutEntityIds: Set<string>;
  transientLightingEntityIds: Set<string>;
  transientRootGroupId: string | null;
  transientEntityRoles: Map<string, StudioTransientEntityRole>;
};

type StudioSceneSessionControllerOptions = {
  runtime: EditorRuntime;
  registry: BindingRegistry;
  emit: (event: EditorAppEvent) => void;
  resolveStudioHdriUrl?: (input: StudioHdriResolveInput) => Promise<StudioHdriResolveResult | null>;
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
    plinthKind: null,
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

function createStudioMeshFromDescriptor(input: {
  id: string;
  descriptor: StudioLayoutMeshDescriptor;
}): EditorMeshJSON {
  const material: EditorMeshMaterialJSON = {
    color: input.descriptor.material.color,
    opacity: input.descriptor.material.opacity,
    metalness: input.descriptor.material.metalness,
    roughness: input.descriptor.material.roughness,
    emissive: input.descriptor.material.emissive,
    emissiveIntensity: input.descriptor.material.emissiveIntensity
  };
  return {
    id: input.id,
    label: input.descriptor.label,
    ...(input.descriptor.geometry.mode === "custom"
      ? input.descriptor.geometry.geometry
      : {
          type: 1,
          geometryName: input.descriptor.geometry.geometryName
        }),
    material,
    position: input.descriptor.position,
    quaternion: input.descriptor.quaternion,
    scale: input.descriptor.scale,
    visible: input.descriptor.visible,
    locked: input.descriptor.locked
  };
}

function createStudioLightFromDescriptor(input: {
  id: string;
  descriptor: StudioLightingLightDescriptor;
}): EditorLightJSON {
  return {
    id: input.id,
    ...input.descriptor.light
  };
}

function createStudioModifierMeshFromDescriptor(input: {
  id: string;
  descriptor: StudioLightingModifierDescriptor;
}): EditorMeshJSON {
  return {
    id: input.id,
    ...input.descriptor.mesh
  };
}

export class StudioSceneSessionController {
  private readonly runtime: EditorRuntime;
  private readonly registry: BindingRegistry;
  private readonly emit: (event: EditorAppEvent) => void;
  private readonly resolveStudioHdriUrl?: (input: StudioHdriResolveInput) => Promise<StudioHdriResolveResult | null>;
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
    resolveStudioHdriUrl,
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
    this.resolveStudioHdriUrl = resolveStudioHdriUrl;
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

    if (role === "decoration") {
      return action === "select" || action === "transform" || action === "material" || action === "delete" || action === "rename" || action === "lock" || action === "visibility";
    }

    if (role === "floor" || role === "backWall" || role === "sideWall" || role === "cove" || role === "background") {
      return action === "select" || action === "transform" || action === "material" || action === "rename" || action === "lock" || action === "visibility";
    }

    if (role === "light") {
      return action === "select" || action === "transform" || action === "light" || action === "rename" || action === "lock" || action === "visibility";
    }

    if (
      role === "studioLight" ||
      role === "keyLight" ||
      role === "keyShadowLight" ||
      role === "fillLight" ||
      role === "rimLight" ||
      role === "topLight" ||
      role === "accentLight"
    ) {
      return action === "select" || action === "transform" || action === "light" || action === "delete" || action === "rename" || action === "lock" || action === "visibility";
    }

    if (
      role === "lightModifier" ||
      role === "reflector" ||
      role === "negativeFill" ||
      role === "stripPanel"
    ) {
      return action === "select" || action === "transform" || action === "material" || action === "delete" || action === "rename" || action === "lock" || action === "visibility";
    }

    if (role === "userLight") {
      return action === "select" || action === "transform" || action === "light" || action === "delete" || action === "rename" || action === "lock" || action === "visibility";
    }

    return action !== "duplicate";
  }

  getTransientStudioEntityRole(entityId: string) {
    return this.activeSession?.transientEntityRoles.get(entityId) ?? null;
  }

  getSelectedStudioEntityRole(entityId: string | null) {
    return entityId ? this.getTransientStudioEntityRole(entityId) : null;
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
      plinthKind: this.activeSession.plinthKind,
      targetScale: this.activeSession.targetScale,
      targetRotationY: this.activeSession.targetRotationY,
      hdriStatus: this.activeSession.hdriStatus,
      hdriError: this.activeSession.hdriError
    };
  }

  async enter(
    entityId: string,
    options: StudioSceneEnterOptions,
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

    const productProfile = options.productProfile;
    const styleProfile = resolveStudioSceneStyleProfile(productProfile, options.styleProfileId ?? null);
    const resolvedPresetId = styleProfile.id;
    const preset = getStudioScenePreset(resolvedPresetId);
    const plinthKind = resolveStudioPlinthKind(styleProfile.layout.plinth.type, DEFAULT_STUDIO_SCENE_VARIANT_ID);
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
      styleSelectionMode: options.styleProfileId ? "manual" : "auto",
      plinthKind,
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
      transientLayoutEntityIds: new Set(),
      transientLightingEntityIds: new Set(),
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
    void this.applyStudioIbl(this.activeSession, styleProfile, source);
    this.createTransientStudioEntities(this.activeSession, studioFrame);
    this.frameCamera(preset, studioFrame);
    this.setSelectedEntity(entityId, source);
    this.emitChanged();
    return true;
  }

  private createTransientStudioEntities(
    session: ActiveStudioSceneSession,
    frame: StudioTargetFrame
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;

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
    this.createTransientStudioLayoutEntities(session, frame);
    this.createTransientStudioLightingEntities(session, frame);
    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();
  }

  private createTransientStudioLayoutEntities(
    session: ActiveStudioSceneSession,
    frame: StudioTargetFrame
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel || !session.transientRootGroupId) return;
    const rootGroup = projectModel.groups.get(session.transientRootGroupId);
    if (!rootGroup) return;

    const styleProfile = resolveStudioSceneStyleProfile(session.productProfile, session.presetId);
    const backgroundLayout = createStudioBackgroundDescriptors({
      styleProfile,
      variantId: session.variantId,
      productProfile: session.productProfile,
      targetFrame: {
        center: [frame.center.x, frame.center.y, frame.center.z],
        radius: frame.radius,
        footprintRadius: frame.footprintRadius,
        height: frame.height,
        floorY: frame.floorY
      }
    });

    const addMesh = (mesh: EditorMeshJSON, role: StudioTransientEntityRole) => {
      const model = projectModel.addMesh(mesh);
      rootGroup.children.push(model.id);
      const binding = this.registry.create(model);
      this.registerTransientEntity(session, model.id, role);
      session.transientLayoutEntityIds.add(model.id);
      this.markTransientObject(model.id, role);
      return binding;
    };

    backgroundLayout.descriptors.forEach((descriptor) => {
      addMesh(
        createStudioMeshFromDescriptor({
          id: createStudioEntityId(descriptor.subRole),
          descriptor
        }),
        descriptor.role
      );
    });
    const plinthLayout = createStudioPlinthDescriptors({
      styleProfile,
      variantId: session.variantId,
      targetFrame: {
        center: [frame.center.x, frame.center.y, frame.center.z],
        radius: frame.radius,
        footprintRadius: frame.footprintRadius,
        height: frame.height,
        floorY: frame.floorY
      },
      bounds: backgroundLayout.bounds,
      plinthKind: session.plinthKind
    });
    plinthLayout.descriptors.forEach((descriptor) => {
      addMesh(
        createStudioMeshFromDescriptor({
          id: createStudioEntityId(descriptor.resetKey),
          descriptor
        }),
        "plinth"
      );
    });
    createStudioDecorationDescriptors({
      styleProfile,
      variantId: session.variantId,
      productProfile: session.productProfile,
      targetFrame: {
        center: [frame.center.x, frame.center.y, frame.center.z],
        radius: frame.radius,
        footprintRadius: frame.footprintRadius,
        height: frame.height,
        floorY: frame.floorY
      },
      bounds: backgroundLayout.bounds,
      plinthTopY: plinthLayout.topY
    }).forEach((descriptor) => {
      addMesh(
        createStudioMeshFromDescriptor({
          id: createStudioEntityId(descriptor.resetKey),
          descriptor
        }),
        "decoration"
      );
    });
  }

  private createTransientStudioLightingEntities(
    session: ActiveStudioSceneSession,
    frame: StudioTargetFrame
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel || !session.transientRootGroupId) return;
    const rootGroup = projectModel.groups.get(session.transientRootGroupId);
    if (!rootGroup) return;

    const styleProfile = resolveStudioSceneStyleProfile(session.productProfile, session.presetId);
    const backgroundLayout = createStudioBackgroundDescriptors({
      styleProfile,
      variantId: session.variantId,
      productProfile: session.productProfile,
      targetFrame: {
        center: [frame.center.x, frame.center.y, frame.center.z],
        radius: frame.radius,
        footprintRadius: frame.footprintRadius,
        height: frame.height,
        floorY: frame.floorY
      }
    });

    const addLight = (light: EditorLightJSON, descriptor: StudioLightingLightDescriptor) => {
      const model = projectModel.addLight(light);
      rootGroup.children.push(model.id);
      const binding = this.registry.create(model);
      this.registerTransientEntity(session, model.id, descriptor.role);
      session.transientLightingEntityIds.add(model.id);
      this.markTransientObject(model.id, descriptor.role);
      binding.object.userData.studioSceneLightRole = descriptor.lightRole;
      binding.pickTargets?.forEach((target) => {
        target.userData.studioSceneLightRole = descriptor.lightRole;
      });
      return binding;
    };

    const addModifier = (mesh: EditorMeshJSON, descriptor: StudioLightingModifierDescriptor) => {
      const model = projectModel.addMesh(mesh);
      rootGroup.children.push(model.id);
      const binding = this.registry.create(model);
      this.registerTransientEntity(session, model.id, descriptor.role);
      session.transientLightingEntityIds.add(model.id);
      this.markTransientObject(model.id, descriptor.role);
      binding.object.userData.studioSceneModifierRole = descriptor.modifierRole;
      binding.object.userData.studioSceneModifierVisibleInRender = descriptor.visibleInRender;
      binding.pickTargets?.forEach((target) => {
        target.userData.studioSceneModifierRole = descriptor.modifierRole;
        target.userData.studioSceneModifierVisibleInRender = descriptor.visibleInRender;
      });
      return binding;
    };

    const lighting = createStudioLightingDescriptors({
      styleProfile,
      productProfile: session.productProfile,
      targetFrame: {
        center: [frame.center.x, frame.center.y, frame.center.z],
        radius: frame.radius,
        footprintRadius: frame.footprintRadius,
        height: frame.height,
        floorY: frame.floorY
      },
      bounds: backgroundLayout.bounds
    });
    lighting.lights.forEach((descriptor) => {
      addLight(
        createStudioLightFromDescriptor({
          id: createStudioEntityId(descriptor.resetKey),
          descriptor
        }),
        descriptor
      );
    });
    lighting.modifiers.forEach((descriptor) => {
      addModifier(
        createStudioModifierMeshFromDescriptor({
          id: createStudioEntityId(descriptor.resetKey),
          descriptor
        }),
        descriptor
      );
    });
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

  private addTransientMeshDescriptor(
    session: ActiveStudioSceneSession,
    descriptor: StudioLayoutMeshDescriptor,
    source: SyncSource
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel || !session.transientRootGroupId) return null;
    const rootGroup = projectModel.groups.get(session.transientRootGroupId);
    if (!rootGroup) return null;

    const model = projectModel.addMesh(
      createStudioMeshFromDescriptor({
        id: createStudioEntityId(descriptor.resetKey),
        descriptor
      })
    );
    rootGroup.children.push(model.id);
    this.registry.create(model);
    this.registerTransientEntity(session, model.id, descriptor.role);
    this.markTransientObject(model.id, descriptor.role);
    this.rebuildGroupHierarchy();
    this.emit({ type: "sceneUpdated", source, pathTraceInvalidation: "scene" });
    this.emitChanged();
    return model.id;
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
    session.transientLayoutEntityIds.clear();
    session.transientLightingEntityIds.clear();
    session.transientEntityRoles.clear();
    session.transientRootGroupId = null;
    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();
  }

  private removeTransientStudioEntityIds(
    session: ActiveStudioSceneSession,
    entityIds: Iterable<string>
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;
    const ids = Array.from(entityIds).filter((entityId) => session.transientEntityIds.has(entityId));
    if (ids.length === 0) return;

    projectModel.groups.forEach((group) => {
      group.children = group.children.filter((childId) => !ids.includes(childId));
    });

    ids.reverse().forEach((entityId) => {
      this.registry.remove(entityId);
      projectModel.removeEntity(entityId);
      session.transientEntityIds.delete(entityId);
      session.transientLayoutEntityIds.delete(entityId);
      session.transientLightingEntityIds.delete(entityId);
      session.transientEntityRoles.delete(entityId);
    });
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

  private async applyStudioIbl(
    session: ActiveStudioSceneSession,
    styleProfile: ReturnType<typeof resolveStudioSceneStyleProfile>,
    source: SyncSource
  ) {
    const projectModel = this.getProjectModel();
    const ibl = styleProfile.lighting.ibl;
    const requestId = ++this.hdriRequestId;

    if (!projectModel || !ibl.enabled || ibl.provider === "none") {
      session.hdriStatus = "idle";
      session.hdriError = null;
      this.emitChanged();
      return;
    }

    session.hdriStatus = "loading";
    session.hdriError = null;
    this.emitChanged();

    try {
      const resolved =
        ibl.url && ibl.url.trim().length > 0
          ? { url: ibl.url, assetName: ibl.assetId ?? ibl.url }
          : this.resolveStudioHdriUrl
            ? await this.resolveStudioHdriUrl({
                provider: ibl.provider,
                assetId: ibl.assetId,
                url: ibl.url
              })
            : null;

      if (!resolved?.url) {
        throw new Error("No HDRI URL could be resolved for the selected studio style.");
      }

      if (requestId !== this.hdriRequestId || this.activeSession !== session) return;

      await this.runtime.setEnvironmentFromUrl(resolved.url, resolved.assetName ?? resolved.url);
      if (requestId !== this.hdriRequestId || this.activeSession !== session) return;

      this.runtime.applyEnvConfig(projectModel.envConfig);
      session.hdriStatus = "ready";
      session.hdriError = null;
      this.emit({ type: "sceneUpdated", source, pathTraceInvalidation: "environment" });
      this.emitChanged();
    } catch (error) {
      if (requestId !== this.hdriRequestId || this.activeSession !== session) return;
      session.hdriStatus = "error";
      session.hdriError = error instanceof Error ? error.message : "Failed to load studio HDRI.";
      this.emitChanged();
    }
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
    this.createTransientStudioEntities(session, frame);
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
    const styleProfile = resolveStudioSceneStyleProfile(session.productProfile, presetId);
    session.presetId = presetId;
    session.styleProfileId = presetId;
    session.styleSelectionMode = "manual";
    session.plinthKind = resolveStudioPlinthKind(styleProfile.layout.plinth.type, session.variantId);
    session.hdriStatus = "idle";
    session.hdriError = null;
    this.applyStyleProfileToSceneEnv(styleProfile, "ui");
    void this.applyStudioIbl(session, styleProfile, "ui");
    this.rebuildTransientStudioEntities(session, preset, createStudioFrameFromObject(binding.object));
    this.emitChanged();
  }

  autoMatchStyle() {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    const styleProfile = resolveStudioSceneStyleProfile(session.productProfile);
    const preset = getStudioScenePreset(styleProfile.id);

    session.presetId = styleProfile.id;
    session.styleProfileId = styleProfile.id;
    session.styleSelectionMode = "auto";
    session.plinthKind = resolveStudioPlinthKind(styleProfile.layout.plinth.type, session.variantId);
    session.hdriStatus = "idle";
    session.hdriError = null;
    this.applyStyleProfileToSceneEnv(styleProfile, "ui");
    void this.applyStudioIbl(session, styleProfile, "ui");
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
    session.plinthKind = resolveStudioPlinthKind(getStudioScenePreset(session.presetId).layout.plinth.type, variantId);
    this.rebuildTransientStudioEntities(session, getStudioScenePreset(session.presetId), createStudioFrameFromObject(binding.object));
    this.emitChanged();
  }

  setPlinthKind(plinthKind: StudioPlinthKind) {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    session.plinthKind = plinthKind;
    this.rebuildTransientStudioEntities(session, getStudioScenePreset(session.presetId), createStudioFrameFromObject(binding.object));
    this.emitChanged();
  }

  resetGeneratedLayout() {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    session.plinthKind = resolveStudioPlinthKind(getStudioScenePreset(session.presetId).layout.plinth.type, session.variantId);
    const selectedEntityId = this.getSelectedEntityId();
    if (selectedEntityId && session.transientLayoutEntityIds.has(selectedEntityId)) {
      this.setSelectedEntity(null, "ui");
    }
    this.removeTransientStudioEntityIds(session, session.transientLayoutEntityIds);
    this.createTransientStudioLayoutEntities(session, createStudioFrameFromObject(binding.object));
    this.rebuildGroupHierarchy();
    this.emit({ type: "sceneUpdated", source: "ui", pathTraceInvalidation: "scene" });
    this.emitChanged();
  }

  resetLighting() {
    const session = this.activeSession;
    if (!session) return;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return;
    }

    const selectedEntityId = this.getSelectedEntityId();
    if (selectedEntityId && session.transientLightingEntityIds.has(selectedEntityId)) {
      this.setSelectedEntity(null, "ui");
    }
    this.removeTransientStudioEntityIds(session, session.transientLightingEntityIds);
    this.createTransientStudioLightingEntities(session, createStudioFrameFromObject(binding.object));
    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();
    this.emit({ type: "sceneUpdated", source: "ui", pathTraceInvalidation: "scene" });
    this.emitChanged();
  }

  setTransientEntityVisible(entityId: string, visible: boolean, source: SyncSource = "ui") {
    const session = this.activeSession;
    const projectModel = this.getProjectModel();
    if (!session || !projectModel || !session.transientEntityIds.has(entityId)) return false;
    if (!this.canUseStudioSceneEntityAction(entityId, "visibility")) return false;

    const record = projectModel.getEntityById(entityId);
    const binding = this.registry.get(entityId);
    if (!record || !binding) return false;

    if (record.kind !== "light" && "visible" in record.item) {
      record.item.visible = visible;
      binding.applyState?.();
    } else {
      binding.object.visible = visible;
    }

    const selectedEntityId = this.getSelectedEntityId();
    if (selectedEntityId === entityId && !visible) {
      this.setSelectedEntity(null, source);
    }

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: record.kind,
      source
    });
    this.emit({ type: "viewStateUpdated" });
    return true;
  }

  addDecoration(kind: StudioDecorationKind) {
    const session = this.activeSession;
    if (!session) return null;
    const binding = this.registry.get(session.targetEntityId);
    if (!binding) {
      this.exit("ui");
      return null;
    }
    const decorationCount = Array.from(session.transientEntityRoles.values()).filter((role) => role === "decoration").length;
    if (decorationCount >= 5) return null;

    const frame = createStudioFrameFromObject(binding.object);
    const styleProfile = resolveStudioSceneStyleProfile(session.productProfile, session.presetId);
    const backgroundLayout = createStudioBackgroundDescriptors({
      styleProfile,
      variantId: session.variantId,
      productProfile: session.productProfile,
      targetFrame: {
        center: [frame.center.x, frame.center.y, frame.center.z],
        radius: frame.radius,
        footprintRadius: frame.footprintRadius,
        height: frame.height,
        floorY: frame.floorY
      }
    });
    const bounds = backgroundLayout.bounds;
    const position: Vec3Tuple = [
      bounds.center[0] + bounds.radius * (decorationCount % 2 === 0 ? -1.25 : 1.25),
      frame.floorY + bounds.radius * (0.48 + decorationCount * 0.08),
      bounds.backZ + bounds.radius * (0.32 + decorationCount * 0.1)
    ];
    const descriptor = createStudioDecorationDescriptorForKind({
      styleProfile,
      kind,
      index: decorationCount,
      position,
      scale: getStudioDecorationScale(kind, bounds.radius)
    });
    return this.addTransientMeshDescriptor(session, descriptor, "ui");
  }

  replaceDecoration(entityId: string, kind: StudioDecorationKind) {
    const session = this.activeSession;
    const projectModel = this.getProjectModel();
    if (!session || !projectModel || this.getTransientStudioEntityRole(entityId) !== "decoration") return false;
    const binding = this.registry.get(entityId);
    const record = projectModel.getEntityById(entityId);
    if (!binding || !record || record.kind !== "mesh") return false;

    this.registry.syncObjectTransformToModel(entityId);
    const styleProfile = resolveStudioSceneStyleProfile(session.productProfile, session.presetId);
    const descriptor = createStudioDecorationDescriptorForKind({
      styleProfile,
      kind,
      index: 0,
      position: record.item.position,
      scale: record.item.scale
    });

    this.registry.remove(entityId);
    projectModel.removeEntity(entityId);
    session.transientEntityIds.delete(entityId);
    session.transientEntityRoles.delete(entityId);
    const nextId = this.addTransientMeshDescriptor(session, descriptor, "ui");
    if (nextId) this.setSelectedEntity(nextId, "ui");
    return Boolean(nextId);
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
