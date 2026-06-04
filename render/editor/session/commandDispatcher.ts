import type { EditorCommand } from "../core/commands";
import type { EditorLightJSON, SyncSource } from "../core/types";
import type { StudioSceneEntityAction } from "./studioSceneSession";

export type EditorCommandHandlers = {
  loadProject: Extract<EditorCommand, { type: "project.load" }>["project"] extends infer T
    ? (project: T) => Promise<void>
    : never;
  clearProject: () => Promise<void>;
  importModel: (file: File, source: SyncSource) => Promise<unknown>;
  setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
  removeEntity: (entityId: string, source: SyncSource) => void;
  duplicateEntity: (entityId: string, source: SyncSource) => void;
  setEntityLocked: (entityId: string, locked: boolean, source: SyncSource) => void;
  setEntityVisible: (entityId: string, visible: boolean, source: SyncSource) => void;
  updateEntityTransform: (
    entityId: string,
    patch: Extract<EditorCommand, { type: "entity.transform" }>["patch"],
    source: SyncSource
  ) => void;
  updateEntityLabel: (entityId: string, label: string, source: SyncSource) => void;
  updateCamera: (
    patch: Extract<EditorCommand, { type: "camera.patch" }>["patch"],
    source: SyncSource
  ) => void;
  updateSceneEnvConfig: (
    patch: Extract<EditorCommand, { type: "scene.envConfig.patch" }>["patch"],
    source: SyncSource
  ) => Promise<void>;
  updateGroundConfig: (
    patch: Extract<EditorCommand, { type: "ground.patch" }>["patch"],
    source: SyncSource
  ) => void;
  updateGroundMaterial: (
    patch: Extract<EditorCommand, { type: "ground.material" }>["patch"],
    source: SyncSource
  ) => void;
  updateMeshMaterial: (
    entityId: string,
    patch: Extract<EditorCommand, { type: "mesh.material" }>["patch"],
    source: SyncSource
  ) => void;
  createMesh: (geometryName: string, source: SyncSource) => Promise<void>;
  updateLight: (
    entityId: string,
    patch: Extract<EditorCommand, { type: "light.patch" }>["patch"],
    source: SyncSource
  ) => void;
  createLight: (lightType: EditorLightJSON["type"], source: SyncSource) => void;
  createLightPreset: (
    presetId: Extract<EditorCommand, { type: "lightPreset.create" }>["presetId"],
    source: SyncSource
  ) => Promise<void>;
  isStudioSceneActive: () => boolean;
  canUseStudioSceneEntityAction: (
    entityId: string,
    action: StudioSceneEntityAction
  ) => boolean;
  selectModelAnimation: (
    entityId: string,
    animationId: string,
    source: SyncSource
  ) => void;
  updateModelAnimationTimeScale: (
    entityId: string,
    timeScale: number,
    source: SyncSource
  ) => void;
  controlModelAnimation: (
    entityId: string,
    action: Extract<EditorCommand, { type: "model.animation.control" }>["action"],
    source: SyncSource
  ) => void;
};

function canUseModelAnimationCommand(handlers: EditorCommandHandlers, entityId: string) {
  return (
    !handlers.isStudioSceneActive() ||
    handlers.canUseStudioSceneEntityAction(entityId, "select")
  );
}

function getCommandSource(command: EditorCommand): SyncSource {
  return "source" in command ? command.source ?? "ui" : "ui";
}

export async function dispatchEditorCommand(
  handlers: EditorCommandHandlers,
  command: EditorCommand
) {
  const source = getCommandSource(command);

  switch (command.type) {
    case "project.load":
      await handlers.loadProject(command.project);
      return;
    case "project.clear":
      await handlers.clearProject();
      return;
    case "model.import":
      await handlers.importModel(command.file, source);
      return;
    case "selection.set":
      handlers.setSelectedEntity(command.entityId, source);
      return;
    case "entity.remove":
      handlers.removeEntity(command.entityId, source);
      return;
    case "entity.duplicate":
      handlers.duplicateEntity(command.entityId, source);
      return;
    case "entity.lock":
      handlers.setEntityLocked(command.entityId, command.locked, source);
      return;
    case "entity.visible":
      handlers.setEntityVisible(command.entityId, command.visible, source);
      return;
    case "entity.transform":
      handlers.updateEntityTransform(command.entityId, command.patch, source);
      return;
    case "entity.label":
      handlers.updateEntityLabel(command.entityId, command.label, source);
      return;
    case "camera.patch":
      handlers.updateCamera(command.patch, source);
      return;
    case "scene.envConfig.patch":
      await handlers.updateSceneEnvConfig(command.patch, source);
      return;
    case "ground.patch":
      handlers.updateGroundConfig(command.patch, source);
      return;
    case "ground.material":
      handlers.updateGroundMaterial(command.patch, source);
      return;
    case "mesh.material":
      handlers.updateMeshMaterial(command.entityId, command.patch, source);
      return;
    case "mesh.create":
      await handlers.createMesh(command.geometryName, source);
      return;
    case "light.patch":
      handlers.updateLight(command.entityId, command.patch, source);
      return;
    case "light.create":
      handlers.createLight(command.lightType, source);
      return;
    case "lightPreset.create":
      await handlers.createLightPreset(command.presetId, source);
      return;
    case "model.animation.select":
      if (!canUseModelAnimationCommand(handlers, command.entityId)) return;
      handlers.selectModelAnimation(command.entityId, command.animationId, source);
      return;
    case "model.animation.timeScale":
      if (!canUseModelAnimationCommand(handlers, command.entityId)) return;
      handlers.updateModelAnimationTimeScale(command.entityId, command.timeScale, source);
      return;
    case "model.animation.control":
      if (!canUseModelAnimationCommand(handlers, command.entityId)) return;
      handlers.controlModelAnimation(command.entityId, command.action, source);
      return;
  }
}
