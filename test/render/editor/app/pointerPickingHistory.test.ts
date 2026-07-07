import { strict as assert } from "node:assert";
import test from "node:test";

import { EditorAppPointerPicking } from "../../../../render/editor/app/pointerPicking";

test("transform gizmo drag notifies history transaction lifecycle", () => {
  const calls: string[] = [];
  const runtime = {
    isTransformGizmoHit() {
      return true;
    },
    beginTransformInteraction() {
      calls.push("begin-transform");
      return true;
    },
    isFirstPersonCamera() {
      return false;
    }
  };
  const picking = new EditorAppPointerPicking({
    runtime,
    pickEntity: () => null,
    setSelectedEntity: () => {},
    onTransformInteractionStart: () => calls.push("history-start"),
    onTransformInteractionEnd: () => calls.push("history-end")
  });

  picking.onPointerDown({
    button: 0,
    pointerId: 1,
    clientX: 10,
    clientY: 12
  } as PointerEvent);

  (picking as unknown as { onPointerUp(event: PointerEvent): void }).onPointerUp({
    pointerId: 1,
    clientX: 10,
    clientY: 12
  } as PointerEvent);

  assert.deepEqual(calls, ["history-start", "begin-transform", "history-end"]);
});

test("pointer picking passes replace mode for regular clicks", () => {
  const selections: Array<{ entityId: string | null; mode: string | undefined }> = [];
  const picking = new EditorAppPointerPicking({
    runtime: {
      isTransformGizmoHit: () => false,
      beginTransformInteraction: () => false,
      isFirstPersonCamera: () => false
    },
    pickEntity: () => "mesh-1",
    setSelectedEntity: (entityId: string | null, mode: string | undefined) => {
      selections.push({ entityId, mode });
    }
  });

  picking.onPointerDown({
    button: 0,
    pointerId: 2,
    clientX: 10,
    clientY: 12
  } as PointerEvent);

  (picking as unknown as { onPointerUp(event: PointerEvent): void }).onPointerUp({
    pointerId: 2,
    clientX: 10,
    clientY: 12,
    shiftKey: false
  } as PointerEvent);

  assert.deepEqual(selections, [{ entityId: "mesh-1", mode: "replace" }]);
});

test("pointer picking passes toggle mode for shift clicks", () => {
  const selections: Array<{ entityId: string | null; mode: string | undefined }> = [];
  const picking = new EditorAppPointerPicking({
    runtime: {
      isTransformGizmoHit: () => false,
      beginTransformInteraction: () => false,
      isFirstPersonCamera: () => false
    },
    pickEntity: () => "mesh-2",
    setSelectedEntity: (entityId: string | null, mode: string | undefined) => {
      selections.push({ entityId, mode });
    }
  });

  picking.onPointerDown({
    button: 0,
    pointerId: 3,
    clientX: 20,
    clientY: 24
  } as PointerEvent);

  (picking as unknown as { onPointerUp(event: PointerEvent): void }).onPointerUp({
    pointerId: 3,
    clientX: 20,
    clientY: 24,
    shiftKey: true
  } as PointerEvent);

  assert.deepEqual(selections, [{ entityId: "mesh-2", mode: "toggle" }]);
});

test("shift clicking empty canvas does not clear selection", () => {
  const selections: Array<{ entityId: string | null; mode: string | undefined }> = [];
  const picking = new EditorAppPointerPicking({
    runtime: {
      isTransformGizmoHit: () => false,
      beginTransformInteraction: () => false,
      isFirstPersonCamera: () => false
    },
    pickEntity: () => null,
    setSelectedEntity: (entityId: string | null, mode: string | undefined) => {
      selections.push({ entityId, mode });
    }
  });

  picking.onPointerDown({
    button: 0,
    pointerId: 4,
    clientX: 30,
    clientY: 36
  } as PointerEvent);

  (picking as unknown as { onPointerUp(event: PointerEvent): void }).onPointerUp({
    pointerId: 4,
    clientX: 30,
    clientY: 36,
    shiftKey: true
  } as PointerEvent);

  assert.deepEqual(selections, []);
});
