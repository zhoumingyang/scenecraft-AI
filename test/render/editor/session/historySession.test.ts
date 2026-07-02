import { strict as assert } from "node:assert";
import test from "node:test";

import {
  EditorHistorySession,
  type EditorHistorySnapshot
} from "../../../../render/editor/session/historySession";

function snapshot(label: string): EditorHistorySnapshot {
  return {
    project: {
      id: `project-${label}`,
      camera: {},
      envConfig: {},
      groups: [],
      model: [],
      mesh: [],
      light: []
    },
    selectedEntityId: label === "empty" ? null : `entity-${label}`
  };
}

test("history captures undo and redo snapshots with labels", () => {
  const history = new EditorHistorySession();

  history.capture("Create mesh", snapshot("empty"), snapshot("mesh"));

  assert.deepEqual(history.getState(), {
    canUndo: true,
    canRedo: false,
    undoLabel: "Create mesh",
    redoLabel: null
  });

  const undo = history.undo();
  assert.equal(undo?.direction, "undo");
  assert.equal(undo?.label, "Create mesh");
  assert.deepEqual(undo?.snapshot, snapshot("empty"));
  assert.deepEqual(history.getState(), {
    canUndo: false,
    canRedo: true,
    undoLabel: null,
    redoLabel: "Create mesh"
  });

  const redo = history.redo();
  assert.equal(redo?.direction, "redo");
  assert.equal(redo?.label, "Create mesh");
  assert.deepEqual(redo?.snapshot, snapshot("mesh"));
});

test("history ignores unchanged snapshots and clears redo after new edits", () => {
  const history = new EditorHistorySession();

  history.capture("No change", snapshot("empty"), snapshot("empty"));
  assert.equal(history.getState().canUndo, false);

  history.capture("Create mesh", snapshot("empty"), snapshot("mesh"));
  assert.ok(history.undo());
  assert.equal(history.getState().canRedo, true);

  history.capture("Create light", snapshot("empty"), snapshot("light"));
  assert.deepEqual(history.getState(), {
    canUndo: true,
    canRedo: false,
    undoLabel: "Create light",
    redoLabel: null
  });
});

test("history enforces maximum stack size and supports restore guard", () => {
  const history = new EditorHistorySession({ maxEntries: 2 });

  history.capture("First", snapshot("empty"), snapshot("one"));
  history.capture("Second", snapshot("one"), snapshot("two"));
  history.capture("Third", snapshot("two"), snapshot("three"));

  assert.equal(history.undo()?.label, "Third");
  assert.equal(history.undo()?.label, "Second");
  assert.equal(history.undo(), null);

  assert.equal(history.isRestoring(), false);
  const value = history.withRestoreGuard(() => {
    assert.equal(history.isRestoring(), true);
    return 42;
  });
  assert.equal(value, 42);
  assert.equal(history.isRestoring(), false);
});
