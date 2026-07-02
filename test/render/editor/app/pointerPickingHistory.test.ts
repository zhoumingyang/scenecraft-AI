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
