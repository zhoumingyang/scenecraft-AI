import type { BindingRegistry } from "../bindings/bindingRegistry";
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
  getSelectedEntityId: () => string | null;
  setSelectedEntityId: (entityId: string | null) => void;
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
  private readonly getSelectedEntityId: () => string | null;
  private readonly setSelectedEntityId: (entityId: string | null) => void;
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
    this.getSelectedEntityId = options.getSelectedEntityId;
    this.setSelectedEntityId = options.setSelectedEntityId;
    this.studioScene = options.studioScene;
    this.canUseStudioSceneEntityAction = options.canUseStudioSceneEntityAction;
  }

  pick(clientX: number, clientY: number): string | null {
    const pickedEntityId = pickEntityId({
      camera: this.runtime.camera,
      raycaster: this.runtime.raycaster,
      domElement: this.runtime.renderer.domElement,
      pickTargets: this.registry.getPickTargets(),
      clientX,
      clientY
    });

    if (pickedEntityId && this.studioScene.isTransientStudioEntity(pickedEntityId)) {
      return pickedEntityId;
    }

    return resolveCanvasPickedEntityId(this.getProjectModel(), pickedEntityId);
  }

  setSelectedEntity(entityId: string | null, source: SyncSource = "ui") {
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
      if (this.getSelectedEntityId() === entityId) return;
      this.setSelectedEntityId(entityId);
      this.runtime.attachTransformTarget(null);
      this.emit({ type: "selectionChanged", selectedEntityId: entityId, source });
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

    if (this.getSelectedEntityId() === entityId) return;
    this.setSelectedEntityId(entityId);
    const binding =
      entityId && entityId !== SCENE_SELECTION_ID ? this.registry.get(entityId) : null;
    this.runtime.attachTransformTarget(binding?.object ?? null);
    this.emit({ type: "selectionChanged", selectedEntityId: entityId, source });
  }
}
