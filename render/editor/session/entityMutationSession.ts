import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import type { SyncSource, TransformPatch } from "../core/types";
import type { EditorProjectModel } from "../models";
import type { EditorRuntime } from "../runtime/editorRuntime";
import {
  cloneEditorEntity,
  type EntityDuplicateOptions
} from "./entityDuplicator";

type Emit = (event: EditorAppEvent) => void;

export class EntityMutationSessionController {
  private readonly runtime: EditorRuntime;
  private readonly registry: BindingRegistry;
  private readonly emit: Emit;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private readonly getSelectedEntityId: () => string | null;
  private readonly setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
  private readonly rebuildGroupHierarchy: () => void;
  private readonly clearEntityIsolation: (source: SyncSource) => void;
  private readonly exitStudioSceneIfTarget: (entityId: string, source: SyncSource) => void;

  constructor(options: {
    runtime: EditorRuntime;
    registry: BindingRegistry;
    emit: Emit;
    getProjectModel: () => EditorProjectModel | null;
    getSelectedEntityId: () => string | null;
    setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
    rebuildGroupHierarchy: () => void;
    clearEntityIsolation: (source: SyncSource) => void;
    exitStudioSceneIfTarget: (entityId: string, source: SyncSource) => void;
  }) {
    this.runtime = options.runtime;
    this.registry = options.registry;
    this.emit = options.emit;
    this.getProjectModel = options.getProjectModel;
    this.getSelectedEntityId = options.getSelectedEntityId;
    this.setSelectedEntity = options.setSelectedEntity;
    this.rebuildGroupHierarchy = options.rebuildGroupHierarchy;
    this.clearEntityIsolation = options.clearEntityIsolation;
    this.exitStudioSceneIfTarget = options.exitStudioSceneIfTarget;
  }

  updateTransform(entityId: string, patch: TransformPatch, source: SyncSource = "ui") {
    const binding = this.registry.get(entityId);
    if (!binding || binding.model.locked) return;

    binding.model.patchTransform(patch);
    this.registry.syncModelTransformToObject(entityId);
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: binding.kind,
      source,
      affectsSceneTree: false
    });
  }

  updateLabel(entityId: string, label: string, source: SyncSource = "ui") {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;
    const record = projectModel.getEntityById(entityId);
    if (!record) return;

    record.item.patchLabel(label);
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: record.kind,
      source
    });
  }

  remove(entityId: string, source: SyncSource = "ui") {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;
    this.exitStudioSceneIfTarget(entityId, source);
    this.clearEntityIsolation(source);
    const binding = this.registry.get(entityId);
    if (!binding || binding.model.locked || !projectModel.isEntityEffectivelyVisible(entityId)) return;

    if (binding.kind === "group") {
      const childIds = projectModel.listDirectChildren(entityId);
      const shouldRemoveChildren =
        childIds.length > 0 &&
        childIds.every((childId) => projectModel.getEntityById(childId)?.kind === "light");

      if (shouldRemoveChildren) {
        childIds.forEach((childId) => {
          projectModel.removeEntity(childId);
          this.registry.remove(childId);
          this.emit({
            type: "entityUpdated",
            entityId: childId,
            entityKind: "light",
            source
          });
        });
      } else {
        const parentGroupId = projectModel.getParentGroupId(entityId);
        childIds.forEach((childId) => {
          this.registry.attach(childId, parentGroupId, this.runtime.scene);
        });
      }
    }

    const removedKind = projectModel.removeEntity(entityId);
    if (!removedKind) return;
    this.registry.remove(entityId);
    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();

    if (this.getSelectedEntityId() === entityId) {
      this.setSelectedEntity(null, source);
    }

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: removedKind,
      source
    });
  }

  duplicate(
    entityId: string,
    source: SyncSource = "ui",
    duplicateOptions?: EntityDuplicateOptions
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;
    this.clearEntityIsolation(source);
    const record = projectModel.getEntityById(entityId);
    if (!record || record.item.locked || !projectModel.isEntityEffectivelyVisible(entityId)) return;

    const duplicate = cloneEditorEntity({
      projectModel,
      registry: this.registry,
      entityId,
      source,
      emit: this.emit,
      duplicateOptions
    });
    if (!duplicate) return;

    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();
    this.setSelectedEntity(duplicate.id, source);
  }

  setLocked(entityId: string, locked: boolean, source: SyncSource = "ui") {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;
    const record = projectModel.getEntityById(entityId);
    if (!record || record.item.locked === locked || !projectModel.isEntityEffectivelyVisible(entityId)) return;

    record.item.locked = locked;
    if (locked && this.getSelectedEntityId() === entityId) {
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
