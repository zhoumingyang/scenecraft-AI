import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { SelectionMode } from "../core/commands";
import type { EditorAppEvent } from "../core/events";
import {
  GROUND_HELPER_NODE_ID,
  SCENE_NODE_ID as SCENE_SELECTION_ID,
  type SyncSource
} from "../core/types";
import { pickEntityId } from "../interaction/picker";
import type { EditorProjectModel } from "../models";
import type { EditorRuntime } from "../runtime/editorRuntime";
import type {
  StudioSceneEntityAction,
  StudioSceneSessionController
} from "./studioSceneSession";

type Emit = (event: EditorAppEvent) => void;

type EditorSelectionSessionControllerOptions = {
  runtime: EditorRuntime;
  registry: BindingRegistry;
  emit: Emit;
  getProjectModel: () => EditorProjectModel | null;
  getSelectedEntityIds: () => string[];
  setSelectedEntityIds: (entityIds: string[]) => void;
  studioScene: StudioSceneSessionController;
  canUseStudioSceneEntityAction: (
    entityId: string,
    action: StudioSceneEntityAction
  ) => boolean;
};

function resolveCanvasPickedEntityId(
  projectModel: EditorProjectModel | null,
  entityId: string | null
) {
  if (!projectModel || !entityId) return entityId;

  let resolvedEntityId = entityId;
  let parentGroupId = projectModel.getParentGroupId(resolvedEntityId);

  while (parentGroupId) {
    resolvedEntityId = parentGroupId;
    parentGroupId = projectModel.getParentGroupId(resolvedEntityId);
  }

  return resolvedEntityId;
}

export class EditorSelectionSessionController {
  private readonly runtime: EditorRuntime;
  private readonly registry: BindingRegistry;
  private readonly emit: Emit;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private readonly getSelectedEntityIds: () => string[];
  private readonly setSelectedEntityIds: (entityIds: string[]) => void;
  private readonly studioScene: StudioSceneSessionController;
  private readonly canUseStudioSceneEntityAction: (
    entityId: string,
    action: StudioSceneEntityAction
  ) => boolean;

  constructor(options: EditorSelectionSessionControllerOptions) {
    this.runtime = options.runtime;
    this.registry = options.registry;
    this.emit = options.emit;
    this.getProjectModel = options.getProjectModel;
    this.getSelectedEntityIds = options.getSelectedEntityIds;
    this.setSelectedEntityIds = options.setSelectedEntityIds;
    this.studioScene = options.studioScene;
    this.canUseStudioSceneEntityAction = options.canUseStudioSceneEntityAction;
  }

  pick(clientX: number, clientY: number): string | null {
    const projectModel = this.getProjectModel();
    const pickedEntityId = pickEntityId({
      camera: this.runtime.camera,
      raycaster: this.runtime.raycaster,
      domElement: this.runtime.renderer.domElement,
      pickTargets: this.registry.getPickTargets(),
      clientX,
      clientY,
      isEntityPickable: (entityId) => {
        const binding = this.registry.get(entityId);
        if (!binding || binding.model.locked) return false;
        if (
          this.studioScene.isActive() &&
          !this.studioScene.isStudioSceneEntityInteractive(entityId)
        ) {
          return false;
        }
        return projectModel?.isEntityEffectivelyVisible(entityId) ?? true;
      }
    });

    if (pickedEntityId && this.studioScene.isTransientStudioEntity(pickedEntityId)) {
      return pickedEntityId;
    }

    return resolveCanvasPickedEntityId(projectModel, pickedEntityId);
  }

  setSelectedEntity(
    entityId: string | null,
    source: SyncSource = "ui",
    mode: SelectionMode = "replace"
  ) {
    if (mode === "toggle" && !entityId) return;

    if (
      this.studioScene.isActive() &&
      entityId &&
      !this.canUseStudioSceneEntityAction(entityId, "select")
    ) {
      return;
    }

    if (entityId === GROUND_HELPER_NODE_ID) {
      const projectModel = this.getProjectModel();
      if (!projectModel?.envConfig.ground.visible) return;
      this.applySelection([entityId], source);
      return;
    }

    if (entityId && entityId !== SCENE_SELECTION_ID) {
      if (
        this.studioScene.isActive() &&
        !this.studioScene.isStudioSceneEntityInteractive(entityId)
      ) {
        return;
      }
      const binding = this.registry.get(entityId);
      const projectModel = this.getProjectModel();
      if (!binding || binding.model.locked || !projectModel?.isEntityEffectivelyVisible(entityId)) {
        return;
      }
    }

    if (mode === "toggle" && entityId && entityId !== SCENE_SELECTION_ID) {
      const currentIds = this.getSelectedEntityIds().filter((id) =>
        id !== SCENE_SELECTION_ID && id !== GROUND_HELPER_NODE_ID
      );
      const nextIds = currentIds.includes(entityId)
        ? currentIds.filter((id) => id !== entityId)
        : [...currentIds, entityId];
      this.applySelection(nextIds, source);
      return;
    }

    this.applySelection(entityId ? [entityId] : [], source);
  }

  private applySelection(entityIds: string[], source: SyncSource) {
    const normalizedEntityIds = Array.from(new Set(entityIds));
    if (areEntityIdListsEqual(this.getSelectedEntityIds(), normalizedEntityIds)) return;

    this.setSelectedEntityIds(normalizedEntityIds);
    const selectedEntityId = getSingleSelectedEntityId(normalizedEntityIds);
    const selectedObjects = normalizedEntityIds
      .filter((entityId) => entityId !== SCENE_SELECTION_ID && entityId !== GROUND_HELPER_NODE_ID)
      .map((entityId) => this.registry.get(entityId)?.object ?? null)
      .filter((object): object is NonNullable<typeof object> => Boolean(object));

    this.runtime.attachTransformTarget(
      selectedEntityId && selectedObjects.length === 1 ? selectedObjects[0] : null
    );
    this.runtime.setOutlineSelection(selectedObjects);
    this.emit({
      type: "selectionChanged",
      selectedEntityId,
      selectedEntityIds: normalizedEntityIds,
      source
    });
  }
}

function getSingleSelectedEntityId(entityIds: string[]) {
  return entityIds.length === 1 ? entityIds[0] : null;
}

function areEntityIdListsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
}
