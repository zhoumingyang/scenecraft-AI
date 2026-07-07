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

test("history snapshots clone selected entity id lists", () => {
  const history = new EditorHistorySession();
  const before = {
    ...snapshot("empty"),
    selectedEntityIds: []
  };
  const selectedEntityIds = ["mesh-1", "mesh-2"];
  const after = {
    ...snapshot("mesh"),
    selectedEntityId: null,
    selectedEntityIds
  };

  history.capture("Multi-select", before, after);
  selectedEntityIds.push("mesh-3");

  const redo = history.redo();
  assert.equal(redo, null);

  const undo = history.undo();
  assert.deepEqual(undo?.snapshot.selectedEntityIds, []);

  const restored = history.redo();
  assert.deepEqual(restored?.snapshot.selectedEntityIds, ["mesh-1", "mesh-2"]);
});

test("history coalesces repeated edits only inside the configured time window", () => {
  let now = 1000;
  const history = new EditorHistorySession({
    coalesceWindowMs: 250,
    now: () => now
  });

  history.capture("Move once", snapshot("empty"), snapshot("one"), {
    coalesceKey: "entity.transform:mesh-1"
  });
  now += 100;
  history.capture("Move twice", snapshot("one"), snapshot("two"), {
    coalesceKey: "entity.transform:mesh-1"
  });

  const undoCoalesced = history.undo();
  assert.equal(undoCoalesced?.label, "Move twice");
  assert.deepEqual(undoCoalesced?.snapshot, snapshot("empty"));
  assert.equal(history.undo(), null);

  history.redo();
  now += 300;
  history.capture("Move later", snapshot("two"), snapshot("three"), {
    coalesceKey: "entity.transform:mesh-1"
  });

  assert.equal(history.undo()?.label, "Move later");
  assert.equal(history.undo()?.label, "Move twice");
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

test("history reports blob asset urls retained by undo and redo stacks", () => {
  const history = new EditorHistorySession();
  const before = snapshot("empty");
  const after = snapshot("mesh");
  after.project.model = [
    {
      id: "model-1",
      source: "blob:model-url"
    }
  ];
  after.project.envConfig = {
    panoUrl: "blob:pano-url"
  };

  history.capture("Import assets", before, after);

  assert.equal(history.hasReferencedAssetUrl("blob:model-url"), true);
  assert.equal(history.hasReferencedAssetUrl("blob:pano-url"), true);
  assert.equal(history.hasReferencedAssetUrl("blob:missing"), false);

  history.clear();

  assert.equal(history.hasReferencedAssetUrl("blob:model-url"), false);
  assert.equal(history.hasReferencedAssetUrl("blob:pano-url"), false);
});
