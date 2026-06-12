import type { BindingRegistry } from "../../bindings/bindingRegistry";
import { updateLightBinding } from "../../bindings/lightBinding";
import { updateMeshBindingMaterial } from "../../bindings/meshBinding";
import type { EditorAppEvent } from "../../core/events";
import type {
  EditorMeshJSON,
  SyncSource
} from "../../core/types";
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
import { toGeneratorFrame } from "./transientEntityMetadata";
import {
  configureStudioTransientLightShadows,
  configureStudioTransientDecorationMaterial,
  configureStudioTransientMeshShadows,
  markTransientObject,
  placeTransientEntityAtSpawn
} from "./transientEntityRenderConfig";
import {
  getStudioSceneEntityMetadata,
  registerTransientEntity,
  registerTransientGroupChildren
} from "./transientEntityRegistry";
import type {
  ActiveStudioSceneSession,
  StudioTransientEntityMetadata,
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

    this.registerTransientEntity(session, entityId, role, {
      groupKind: "user",
      allowHide: true,
      allowDelete: true,
      captureDefaultSnapshot: false
    });
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

  getStudioSceneEntityMetadata(
    session: ActiveStudioSceneSession | null,
    entityId: string | null
  ) {
    return getStudioSceneEntityMetadata(session, entityId);
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
    this.registerTransientEntity(session, rootGroupId, "root", {
      groupKind: "layout",
      allowHide: false,
      allowDelete: false
    });
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
      role: StudioTransientEntityRole,
      descriptor: StudioLayoutMeshDescriptor
    ) => {
      const model = projectModel.addMesh(mesh);
      rootGroup.children.push(model.id);
      this.registry.create(model);
      this.registerTransientEntity(session, model.id, role, {
        groupKind: "layout",
        allowHide: descriptor.allowHide,
        allowDelete: descriptor.allowDelete,
        plinthKind: descriptor.plinthKind,
        decorationKind: descriptor.decorationKind
      });
      session.transientLayoutEntityIds.add(model.id);
      this.markTransientObject(model.id, role);
      this.configureStudioTransientMeshShadows(
        this.registry.get(model.id)?.object ?? null,
        role
      );
      if (role === "decoration") {
        this.configureStudioTransientDecorationMaterial(
          this.registry.get(model.id)?.object ?? null,
          descriptor.decorationKind
        );
      }
    };

    backgroundLayout.descriptors.forEach((descriptor) => {
      addMesh(
        createStudioMeshFromDescriptor({
          id: createStudioEntityId(descriptor.subRole),
          descriptor
        }),
        descriptor.role,
        descriptor
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
        "plinth",
        descriptor
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
        "decoration",
        descriptor
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
      this.registerTransientEntity(session, model.id, descriptor.role, {
        groupKind: "lighting",
        allowHide: true,
        allowDelete: true,
        lightRole: descriptor.lightRole
      });
      session.transientLightingEntityIds.add(model.id);
      this.markTransientObject(model.id, descriptor.role);
      this.configureStudioTransientLightShadows(
        binding.object,
        descriptor.lightRole,
        frame,
        backgroundLayout.bounds
      );
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
      this.registerTransientEntity(session, model.id, descriptor.role, {
        groupKind: "lighting",
        allowHide: true,
        allowDelete: true,
        modifierRole: descriptor.modifierRole
      });
      session.transientLightingEntityIds.add(model.id);
      this.markTransientObject(model.id, descriptor.role);
      this.configureStudioTransientMeshShadows(binding.object, descriptor.role);
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
    session.transientEntityMetadata.clear();
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
      session.transientEntityMetadata.delete(entityId);
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
    this.registerTransientEntity(session, model.id, descriptor.role, {
      groupKind: "layout",
      allowHide: descriptor.allowHide,
      allowDelete: descriptor.allowDelete,
      plinthKind: descriptor.plinthKind,
      decorationKind: descriptor.decorationKind
    });
    session.transientLayoutEntityIds.add(model.id);
    this.markTransientObject(model.id, descriptor.role);
    this.configureStudioTransientMeshShadows(
      this.registry.get(model.id)?.object ?? null,
      descriptor.role
    );
    if (descriptor.role === "decoration") {
      this.configureStudioTransientDecorationMaterial(
        this.registry.get(model.id)?.object ?? null,
        descriptor.decorationKind
      );
    }
    this.rebuildGroupHierarchy();
    this.emit({ type: "sceneUpdated", source, pathTraceInvalidation: "scene" });
    this.emitChanged();
    return model.id;
  }

  private registerTransientEntity(
    session: ActiveStudioSceneSession,
    entityId: string,
    role: StudioTransientEntityRole,
    metadata: Partial<Omit<StudioTransientEntityMetadata, "entityId" | "role" | "hasDefaultSnapshot" | "defaultSnapshot">> & {
      captureDefaultSnapshot?: boolean;
    } = {}
  ) {
    registerTransientEntity({
      session,
      entityId,
      role,
      getProjectModel: this.getProjectModel,
      metadata
    });
  }

  resetTransientStudioEntity(
    session: ActiveStudioSceneSession | null,
    entityId: string,
    source: SyncSource
  ) {
    if (!session || !session.transientEntityIds.has(entityId)) return false;
    const metadata = session.transientEntityMetadata.get(entityId);
    if (!metadata?.defaultSnapshot) return false;
    const projectModel = this.getProjectModel();
    const record = projectModel?.getEntityById(entityId);
    const binding = this.registry.get(entityId);
    if (!projectModel || !record || !binding) return false;

    const snapshot = metadata.defaultSnapshot;
    record.item.patchTransform(snapshot.transform);
    if ("visible" in record.item && snapshot.visible !== undefined) {
      record.item.visible = snapshot.visible;
    }

    if (record.kind === "mesh" && snapshot.material) {
      updateMeshBindingMaterial(
        binding,
        this.runtime.textureLoader,
        snapshot.material,
        () => this.runtime.invalidatePathTraceMaterials()
      );
      this.registry.syncModelTransformToObject(entityId);
    } else if (record.kind === "light" && snapshot.light) {
      updateLightBinding(binding, {
        ...snapshot.transform,
        ...snapshot.light,
        visible: snapshot.visible
      });
    } else {
      this.registry.syncModelTransformToObject(entityId);
    }

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: record.kind,
      source,
      affectsSceneTree: snapshot.visible !== undefined
    });
    this.emit({ type: "sceneUpdated", source, pathTraceInvalidation: "scene" });
    this.emitChanged();
    return true;
  }

  private markTransientObject(
    entityId: string,
    role: StudioTransientEntityRole
  ) {
    markTransientObject(this.registry, entityId, role);
  }

  private configureStudioTransientMeshShadows(
    object: Parameters<typeof configureStudioTransientMeshShadows>[0],
    role: StudioTransientEntityRole
  ) {
    configureStudioTransientMeshShadows(object, role);
  }

  private configureStudioTransientDecorationMaterial(
    object: Parameters<typeof configureStudioTransientDecorationMaterial>[0],
    decorationKind: Parameters<typeof configureStudioTransientDecorationMaterial>[1]
  ) {
    configureStudioTransientDecorationMaterial(object, decorationKind);
  }

  private configureStudioTransientLightShadows(
    object: Parameters<typeof configureStudioTransientLightShadows>[0],
    lightRole: Parameters<typeof configureStudioTransientLightShadows>[1],
    frame: StudioTargetFrame,
    bounds?: Parameters<typeof configureStudioTransientLightShadows>[3]
  ) {
    configureStudioTransientLightShadows(object, lightRole, frame, bounds);
  }

  private placeTransientEntityAtSpawn(
    session: ActiveStudioSceneSession,
    entityId: string
  ) {
    placeTransientEntityAtSpawn(this.registry, session, entityId);
  }

  private registerTransientGroupChildren(
    session: ActiveStudioSceneSession,
    groupId: string,
    role: StudioTransientEntityRole
  ) {
    registerTransientGroupChildren({
      session,
      groupId,
      role,
      getProjectModel: this.getProjectModel,
      registerEntity: (entityId, childRole) =>
        this.registerTransientEntity(session, entityId, childRole),
      markEntity: (entityId, childRole) =>
        this.markTransientObject(entityId, childRole)
    });
  }
}
