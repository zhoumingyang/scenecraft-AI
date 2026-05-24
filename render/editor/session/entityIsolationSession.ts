import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import type { EditorProjectJSON, SyncSource } from "../core/types";
import type { EditorProjectModel } from "../models";

type Emit = (event: EditorAppEvent) => void;
type EntityVisibilitySnapshot = Map<string, boolean>;

export class EntityIsolationSessionController {
  private readonly registry: BindingRegistry;
  private readonly emit: Emit;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private readonly getSelectedEntityId: () => string | null;
  private readonly setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
  private isolatedEntityId: string | null = null;
  private visibilitySnapshot: EntityVisibilitySnapshot | null = null;

  constructor(options: {
    registry: BindingRegistry;
    emit: Emit;
    getProjectModel: () => EditorProjectModel | null;
    getSelectedEntityId: () => string | null;
    setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
  }) {
    this.registry = options.registry;
    this.emit = options.emit;
    this.getProjectModel = options.getProjectModel;
    this.getSelectedEntityId = options.getSelectedEntityId;
    this.setSelectedEntity = options.setSelectedEntity;
  }

  getIsolatedEntityId() {
    return this.isolatedEntityId;
  }

  hasIsolation() {
    return Boolean(this.visibilitySnapshot);
  }

  reset() {
    this.isolatedEntityId = null;
    this.visibilitySnapshot = null;
  }

  applyVisibilityToProjectJSON(projectJson: EditorProjectJSON) {
    if (!this.visibilitySnapshot) {
      return projectJson;
    }

    projectJson.groups = (projectJson.groups || []).map((group) => ({
      ...group,
      visible: this.visibilitySnapshot?.get(group.id) ?? group.visible
    }));
    projectJson.model = (projectJson.model || []).map((model) => ({
      ...model,
      visible: this.visibilitySnapshot?.get(model.id) ?? model.visible
    }));
    projectJson.mesh = (projectJson.mesh || []).map((mesh) => ({
      ...mesh,
      visible: this.visibilitySnapshot?.get(mesh.id) ?? mesh.visible
    }));

    return projectJson;
  }

  toggle(entityId: string, source: SyncSource = "ui") {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;
    const record = projectModel.getEntityById(entityId);
    if (!record || record.kind === "light" || record.item.locked) return;

    if (this.isolatedEntityId === entityId) {
      this.clear(source);
      return;
    }

    if (this.visibilitySnapshot) {
      this.clear(source);
    }

    const snapshot = this.captureEntityVisibilitySnapshot(projectModel);
    const keepVisibleIds = this.collectIsolationVisibleIds(projectModel, entityId);

    snapshot.forEach((visible, targetEntityId) => {
      const nextVisible = keepVisibleIds.has(targetEntityId) ? visible : false;
      this.applyEntityVisibleState(targetEntityId, nextVisible, source);
    });

    this.isolatedEntityId = entityId;
    this.visibilitySnapshot = snapshot;
    this.emit({ type: "viewStateUpdated" });
  }

  setVisible(entityId: string, visible: boolean, source: SyncSource = "ui") {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;
    if (this.visibilitySnapshot) {
      this.clear(source);
    }
    const record = projectModel.getEntityById(entityId);
    if (!record || record.item.locked || record.kind === "light") return;
    this.applyEntityVisibleState(entityId, visible, source);
  }

  clear(source: SyncSource) {
    const snapshot = this.visibilitySnapshot;
    if (!snapshot) return;

    this.isolatedEntityId = null;
    this.visibilitySnapshot = null;

    snapshot.forEach((visible, entityId) => {
      this.applyEntityVisibleState(entityId, visible, source);
    });

    this.emit({ type: "viewStateUpdated" });
  }

  private captureEntityVisibilitySnapshot(projectModel: EditorProjectModel): EntityVisibilitySnapshot {
    const snapshot: EntityVisibilitySnapshot = new Map();

    projectModel.groups.forEach((group) => {
      snapshot.set(group.id, group.visible);
    });
    projectModel.models.forEach((model) => {
      snapshot.set(model.id, model.visible);
    });
    projectModel.meshes.forEach((mesh) => {
      snapshot.set(mesh.id, mesh.visible);
    });

    return snapshot;
  }

  private collectIsolationVisibleIds(projectModel: EditorProjectModel, entityId: string) {
    const keepVisibleIds = new Set<string>([entityId]);

    let currentEntityId = entityId;
    let parentGroupId = projectModel.getParentGroupId(currentEntityId);
    while (parentGroupId) {
      keepVisibleIds.add(parentGroupId);
      currentEntityId = parentGroupId;
      parentGroupId = projectModel.getParentGroupId(currentEntityId);
    }

    const record = projectModel.getEntityById(entityId);
    if (record?.kind === "group") {
      this.collectGroupDescendantIds(projectModel, entityId, keepVisibleIds);
    }

    return keepVisibleIds;
  }

  private collectGroupDescendantIds(
    projectModel: EditorProjectModel,
    groupId: string,
    keepVisibleIds: Set<string>
  ) {
    projectModel.listDirectChildren(groupId).forEach((childId) => {
      const childRecord = projectModel.getEntityById(childId);
      if (!childRecord || childRecord.kind === "light") return;

      keepVisibleIds.add(childId);
      if (childRecord.kind === "group") {
        this.collectGroupDescendantIds(projectModel, childId, keepVisibleIds);
      }
    });
  }

  private applyEntityVisibleState(entityId: string, visible: boolean, source: SyncSource) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;
    const record = projectModel.getEntityById(entityId);
    if (!record || record.kind === "light" || record.item.visible === visible) return;

    record.item.visible = visible;
    const binding = this.registry.get(entityId);
    binding?.applyState?.();

    const selectedEntityId = this.getSelectedEntityId();
    if (selectedEntityId && !projectModel.isEntityEffectivelyVisible(selectedEntityId)) {
      this.setSelectedEntity(null, source);
    }

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: record.kind,
      source
    });
  }
}
