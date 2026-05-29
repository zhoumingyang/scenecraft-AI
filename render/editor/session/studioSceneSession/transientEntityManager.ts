import type { BindingRegistry } from "../../bindings/bindingRegistry";
import type { EditorAppEvent } from "../../core/events";
import type { EditorMeshJSON, SyncSource, Vec3Tuple } from "../../core/types";
import type { EditorProjectModel } from "../../models";
import type { EditorRuntime } from "../../runtime/editorRuntime";
import {
  createStudioBackgroundDescriptors,
  createStudioDecorationDescriptors,
  createStudioPlinthDescriptors,
  type StudioLayoutMeshDescriptor
} from "../../studioSceneLayoutGenerator";
import {
  createStudioLightingDescriptors,
  type StudioLightingModifierDescriptor
} from "../../studioSceneLightingGenerator";
import { resolveStudioSceneStyleProfile } from "../../studioSceneProfiles";
import {
  createStudioEntityId,
  createStudioLightFromDescriptor,
  createStudioMeshFromDescriptor,
  createStudioModifierMeshFromDescriptor
} from "./factories";
import { createStudioFrameFromObject } from "./target";
import type {
  ActiveStudioSceneSession,
  StudioTargetFrame,
  StudioTransientAdoptOptions,
  StudioTransientEntityRole
} from "./types";

type StudioSceneTransientEntityManagerOptions = {
  registry: BindingRegistry;
  runtime: EditorRuntime;
  emit: (event: EditorAppEvent) => void;
  emitChanged: () => void;
  getProjectModel: () => EditorProjectModel | null;
  rebuildGroupHierarchy: () => void;
};

function toGeneratorFrame(frame: StudioTargetFrame) {
  return {
    center: [frame.center.x, frame.center.y, frame.center.z] as Vec3Tuple,
    radius: frame.radius,
    footprintRadius: frame.footprintRadius,
    height: frame.height,
    floorY: frame.floorY
  };
}

export class StudioSceneTransientEntityManager {
  private readonly registry: BindingRegistry;
  private readonly runtime: EditorRuntime;
  private readonly emit: (event: EditorAppEvent) => void;
  private readonly emitChanged: () => void;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private readonly rebuildGroupHierarchy: () => void;

  constructor(options: StudioSceneTransientEntityManagerOptions) {
    this.registry = options.registry;
    this.runtime = options.runtime;
    this.emit = options.emit;
    this.emitChanged = options.emitChanged;
    this.getProjectModel = options.getProjectModel;
    this.rebuildGroupHierarchy = options.rebuildGroupHierarchy;
  }

  adoptTransientStudioEntity(
    session: ActiveStudioSceneSession,
    entityId: string,
    role: StudioTransientEntityRole,
    options: StudioTransientAdoptOptions = {}
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return false;

    const record = projectModel.getEntityById(entityId);
    if (!record) return false;

    const attachToRoot = options.attachToRoot ?? role !== "root";
    if (
      attachToRoot &&
      session.transientRootGroupId &&
      entityId !== session.transientRootGroupId
    ) {
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

  createTransientStudioEntities(
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

  createTransientStudioLayoutEntities(
    session: ActiveStudioSceneSession,
    frame: StudioTargetFrame
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel || !session.transientRootGroupId) return;
    const rootGroup = projectModel.groups.get(session.transientRootGroupId);
    if (!rootGroup) return;

    const styleProfile = resolveStudioSceneStyleProfile(
      session.productProfile,
      session.presetId
    );
    const backgroundLayout = createStudioBackgroundDescriptors({
      styleProfile,
      variantId: session.variantId,
      productProfile: session.productProfile,
      targetFrame: toGeneratorFrame(frame)
    });

    const addMesh = (
      mesh: EditorMeshJSON,
      role: StudioTransientEntityRole
    ) => {
      const model = projectModel.addMesh(mesh);
      rootGroup.children.push(model.id);
      this.registry.create(model);
      this.registerTransientEntity(session, model.id, role);
      session.transientLayoutEntityIds.add(model.id);
      this.markTransientObject(model.id, role);
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
      targetFrame: toGeneratorFrame(frame),
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
      targetFrame: toGeneratorFrame(frame),
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

  createTransientStudioLightingEntities(
    session: ActiveStudioSceneSession,
    frame: StudioTargetFrame
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel || !session.transientRootGroupId) return;
    const rootGroup = projectModel.groups.get(session.transientRootGroupId);
    if (!rootGroup) return;

    const styleProfile = resolveStudioSceneStyleProfile(
      session.productProfile,
      session.presetId
    );
    const backgroundLayout = createStudioBackgroundDescriptors({
      styleProfile,
      variantId: session.variantId,
      productProfile: session.productProfile,
      targetFrame: toGeneratorFrame(frame)
    });

    const addLight = (
      descriptor: Parameters<typeof createStudioLightFromDescriptor>[0]["descriptor"]
    ) => {
      const model = projectModel.addLight(
        createStudioLightFromDescriptor({
          id: createStudioEntityId(descriptor.resetKey),
          descriptor
        })
      );
      rootGroup.children.push(model.id);
      const binding = this.registry.create(model);
      this.registerTransientEntity(session, model.id, descriptor.role);
      session.transientLightingEntityIds.add(model.id);
      this.markTransientObject(model.id, descriptor.role);
      binding.object.userData.studioSceneLightRole = descriptor.lightRole;
      binding.pickTargets?.forEach((target) => {
        target.userData.studioSceneLightRole = descriptor.lightRole;
      });
    };

    const addModifier = (descriptor: StudioLightingModifierDescriptor) => {
      const model = projectModel.addMesh(
        createStudioModifierMeshFromDescriptor({
          id: createStudioEntityId(descriptor.resetKey),
          descriptor
        })
      );
      rootGroup.children.push(model.id);
      const binding = this.registry.create(model);
      this.registerTransientEntity(session, model.id, descriptor.role);
      session.transientLightingEntityIds.add(model.id);
      this.markTransientObject(model.id, descriptor.role);
      binding.object.userData.studioSceneModifierRole = descriptor.modifierRole;
      binding.object.userData.studioSceneModifierVisibleInRender =
        descriptor.visibleInRender;
      binding.pickTargets?.forEach((target) => {
        target.userData.studioSceneModifierRole = descriptor.modifierRole;
        target.userData.studioSceneModifierVisibleInRender =
          descriptor.visibleInRender;
      });
    };

    const lighting = createStudioLightingDescriptors({
      styleProfile,
      productProfile: session.productProfile,
      targetFrame: toGeneratorFrame(frame),
      bounds: backgroundLayout.bounds
    });
    lighting.lights.forEach(addLight);
    lighting.modifiers.forEach(addModifier);
  }

  removeTransientStudioEntities(session: ActiveStudioSceneSession) {
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

  removeTransientStudioEntityIds(
    session: ActiveStudioSceneSession,
    entityIds: Iterable<string>
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;
    const ids = Array.from(entityIds).filter((entityId) =>
      session.transientEntityIds.has(entityId)
    );
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

  addTransientMeshDescriptor(
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

  private registerTransientEntity(
    session: ActiveStudioSceneSession,
    entityId: string,
    role: StudioTransientEntityRole
  ) {
    session.transientEntityIds.add(entityId);
    session.transientEntityRoles.set(entityId, role);
  }

  private markTransientObject(
    entityId: string,
    role: StudioTransientEntityRole
  ) {
    const binding = this.registry.get(entityId);
    if (!binding) return;
    binding.object.userData.studioScene = true;
    binding.object.userData.studioSceneRole = role;
    binding.pickTargets?.forEach((target) => {
      target.userData.studioScene = true;
      target.userData.studioSceneRole = role;
    });
  }

  private placeTransientEntityAtSpawn(
    session: ActiveStudioSceneSession,
    entityId: string
  ) {
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
        childRecord.kind === "light" && role === "userLightGroup"
          ? "userLight"
          : role;
      this.registerTransientEntity(session, childId, childRole);
      this.markTransientObject(childId, childRole);

      if (childRecord.kind === "group") {
        this.registerTransientGroupChildren(session, childId, childRole);
      }
    });
  }
}
