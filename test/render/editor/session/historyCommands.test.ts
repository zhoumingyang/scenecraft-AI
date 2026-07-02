import { strict as assert } from "node:assert";
import test from "node:test";

import {
  getEditorCommandHistoryMetadata,
  shouldCaptureEditorCommandHistory
} from "../../../../render/editor/session/historyCommands";
import type { EditorCommand } from "../../../../render/editor/core/commands";

function command(type: EditorCommand["type"], payload: Record<string, unknown> = {}) {
  return {
    type,
    ...payload
  } as EditorCommand;
}

test("captures project-mutating editor commands", () => {
  assert.equal(shouldCaptureEditorCommandHistory(command("project.clear")), true);
  assert.equal(
    shouldCaptureEditorCommandHistory(command("entity.transform", { entityId: "mesh-1", patch: {} })),
    true
  );
  assert.equal(
    shouldCaptureEditorCommandHistory(command("mesh.material", { entityId: "mesh-1", patch: {} })),
    true
  );
  assert.equal(
    getEditorCommandHistoryMetadata(command("light.create", { lightType: 2 })).label,
    "Create light"
  );
});

test("skips non-project history commands", () => {
  assert.equal(shouldCaptureEditorCommandHistory(command("project.load", { project: {} })), false);
  assert.equal(shouldCaptureEditorCommandHistory(command("selection.set", { entityId: "mesh-1" })), false);
  assert.equal(
    shouldCaptureEditorCommandHistory(command("model.animation.control", { entityId: "model-1", action: "play" })),
    false
  );
  assert.equal(
    shouldCaptureEditorCommandHistory(command("model.animation.select", { entityId: "model-1", animationId: "idle" })),
    false
  );
  assert.equal(
    shouldCaptureEditorCommandHistory(command("model.animation.timeScale", { entityId: "model-1", timeScale: 1.2 })),
    false
  );
});

