import type { EditorCommand } from "../core/commands";

export type EditorCommandHistoryMetadata = {
  label: string;
  coalesceKey: string | null;
};

const skippedHistoryCommandTypes = new Set<EditorCommand["type"]>([
  "project.load",
  "selection.set",
  "model.animation.select",
  "model.animation.timeScale",
  "model.animation.control",
  "model.animation.skeletonVisibility"
]);

export function shouldCaptureEditorCommandHistory(command: EditorCommand) {
  return !skippedHistoryCommandTypes.has(command.type);
}

export function getEditorCommandHistoryMetadata(
  command: EditorCommand
): EditorCommandHistoryMetadata {
  return {
    label: getEditorCommandHistoryLabel(command),
    coalesceKey: null
  };
}

function getEditorCommandHistoryLabel(command: EditorCommand) {
  switch (command.type) {
    case "project.clear":
      return "Clear project";
    case "model.import":
      return "Import model";
    case "entity.remove":
      return "Delete entity";
    case "entity.duplicate":
      return "Duplicate entity";
    case "entity.lock":
      return command.locked ? "Lock entity" : "Unlock entity";
    case "entity.visible":
      return command.visible ? "Show entity" : "Hide entity";
    case "entity.transform":
      return "Transform entity";
    case "entity.label":
      return "Rename entity";
    case "camera.patch":
      return "Update camera";
    case "scene.envConfig.patch":
      return "Update scene";
    case "ground.patch":
      return "Update ground";
    case "ground.material":
      return "Update ground material";
    case "mesh.material":
      return "Update material";
    case "mesh.create":
      return "Create mesh";
    case "light.patch":
      return "Update light";
    case "light.create":
      return "Create light";
    case "lightPreset.create":
      return "Create light preset";
    case "project.load":
    case "selection.set":
    case "model.animation.select":
    case "model.animation.timeScale":
    case "model.animation.control":
    case "model.animation.skeletonVisibility":
      return "Update editor";
  }
}
