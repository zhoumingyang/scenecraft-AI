import type * as THREE from "three";

import type { MeshCsgOperation } from "../core/commands";
import type { SyncSource } from "../core/types";
import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import type { EditorProjectModel } from "../models";
import { createDefaultMeshLabel, createMeshEntityId } from "./entityFactories";
import { rebuildProjectGroupHierarchy } from "./projectBindings";

type Emit = (event: EditorAppEvent) => void;

type CsgAnchorTransform = {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: [number, number, number];
};

function copyCsgAnchorTransform(anchor: CsgAnchorTransform): CsgAnchorTransform {
  return {
    position: [...anchor.position],
    quaternion: [...anchor.quaternion],
    scale: [...anchor.scale]
  };
}

function attachCsgMeshToAnchorParent(
  projectModel: EditorProjectModel,
  anchorEntityId: string,
  csgMeshId: string
) {
  const parentGroupId = projectModel.getParentGroupId(anchorEntityId);
  if (!parentGroupId) return;

  const parentGroup = projectModel.groups.get(parentGroupId);
  if (!parentGroup) return;

  const anchorIndex = parentGroup.children.indexOf(anchorEntityId);
  const nextChildren = parentGroup.children.filter((childId) => childId !== csgMeshId);
  const insertionIndex = anchorIndex >= 0 ? anchorIndex : nextChildren.length;
  nextChildren.splice(insertionIndex, 0, csgMeshId);
  parentGroup.children = nextChildren;
}

export type MeshCsgSessionOptions = {
  registry: BindingRegistry;
  scene: THREE.Scene;
  emit: Emit;
  getProjectModel: () => EditorProjectModel | null;
  getSelectedEntityIds: () => string[];
  setSelectedEntity: (entityId: string, source: SyncSource) => void;
  setSelectedEntities: (entityIds: string[], source: SyncSource) => void;
};

export class MeshCsgSessionController {
  private readonly registry: BindingRegistry;
  private readonly scene: THREE.Scene;
  private readonly emit: Emit;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private readonly getSelectedEntityIds: () => string[];
  private readonly setSelectedEntity: (entityId: string, source: SyncSource) => void;
  private readonly setSelectedEntities: (entityIds: string[], source: SyncSource) => void;

  constructor(options: MeshCsgSessionOptions) {
    this.registry = options.registry;
    this.scene = options.scene;
    this.emit = options.emit;
    this.getProjectModel = options.getProjectModel;
    this.getSelectedEntityIds = options.getSelectedEntityIds;
    this.setSelectedEntity = options.setSelectedEntity;
    this.setSelectedEntities = options.setSelectedEntities;
  }

  apply(operation: MeshCsgOperation, source: SyncSource) {
    const projectModel = this.getProjectModel();
    if (!projectModel) {
      throw new Error("Project model is not initialized.");
    }

    const selectedEntityIds = this.getSelectedEntityIds();
    if (selectedEntityIds.length < 2) {
      throw new Error("CSG requires at least two selected mesh entities.");
    }

    const meshRecords = selectedEntityIds.map((entityId) => {
      const record = projectModel.getEntityById(entityId);
      if (
        !record ||
        record.kind !== "mesh" ||
        projectModel.isMeshConsumedByCsg(entityId)
      ) {
        throw new Error("CSG can only be applied to mesh selections.");
      }
      if (record.item.locked) {
        throw new Error("Locked meshes cannot be used for CSG.");
      }
      return record.item;
    });
    const anchorTransform = copyCsgAnchorTransform(meshRecords[0]);

    const csgMesh = projectModel.addCsgMesh({
      id: createMeshEntityId(),
      label: createDefaultMeshLabel(`CSG ${operation}`, projectModel.csgMeshes.size),
      operation,
      operandIds: meshRecords.map((mesh) => mesh.id),
      materialMode: "sourceParts",
      materialParts: meshRecords.map((mesh) => ({
        id: `operand:${mesh.id}`,
        sourceEntityId: mesh.id,
        label: mesh.label
      })),
      position: anchorTransform.position,
      quaternion: anchorTransform.quaternion,
      scale: anchorTransform.scale
    });
    attachCsgMeshToAnchorParent(projectModel, meshRecords[0].id, csgMesh.id);

    csgMesh.operandIds.forEach((operandId) => {
      this.registry.remove(operandId);
    });
    this.registry.create(csgMesh);
    rebuildProjectGroupHierarchy({
      projectModel,
      registry: this.registry,
      scene: this.scene
    });
    this.emit({
      type: "entityUpdated",
      entityId: csgMesh.id,
      entityKind: "csgMesh",
      source,
      affectsSceneTree: true,
      affectsMeshList: true
    });
    this.setSelectedEntity(csgMesh.id, source);
    return csgMesh.id;
  }

  release(entityId: string, source: SyncSource) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return [];
    const record = projectModel.getEntityById(entityId);
    if (!record || record.kind !== "csgMesh" || record.item.locked) return [];

    const operandIds = [...record.item.operandIds];
    this.registry.remove(entityId);
    projectModel.removeEntity(entityId);

    operandIds.forEach((operandId) => {
      if (projectModel.isMeshConsumedByCsg(operandId)) return;
      const operand = projectModel.meshes.get(operandId);
      if (!operand || this.registry.get(operandId)) return;
      this.registry.create(operand);
    });

    rebuildProjectGroupHierarchy({
      projectModel,
      registry: this.registry,
      scene: this.scene
    });
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "csgMesh",
      source,
      affectsSceneTree: true,
      affectsMeshList: true
    });
    this.setSelectedEntities(operandIds, source);
    return operandIds;
  }

  deleteWithOperands(entityId: string, source: SyncSource) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return [];
    const record = projectModel.getEntityById(entityId);
    if (!record || record.kind !== "csgMesh" || record.item.locked) return [];

    const operandIds = [...record.item.operandIds];
    this.registry.remove(entityId);
    projectModel.removeEntity(entityId);

    operandIds.forEach((operandId) => {
      this.registry.remove(operandId);
      projectModel.removeEntity(operandId);
      this.emit({
        type: "entityUpdated",
        entityId: operandId,
        entityKind: "mesh",
        source,
        affectsSceneTree: true,
        affectsMeshList: true
      });
    });

    rebuildProjectGroupHierarchy({
      projectModel,
      registry: this.registry,
      scene: this.scene
    });
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "csgMesh",
      source,
      affectsSceneTree: true,
      affectsMeshList: true
    });
    this.setSelectedEntities([], source);
    return operandIds;
  }
}
