import assert from "node:assert/strict";
import test from "node:test";

import { EditorAppEventHub } from "../../../../render/editor/app/events.ts";

test("does not invalidate the path trace camera twice for render-sourced camera updates", () => {
  const calls = [];
  const runtime = {
    invalidatePathTraceCamera() {
      calls.push("camera");
    },
    invalidatePathTraceEnvironment() {
      calls.push("environment");
    },
    invalidatePathTraceLights() {
      calls.push("lights");
    },
    invalidatePathTraceMaterials() {
      calls.push("materials");
    },
    invalidatePathTraceScene() {
      calls.push("scene");
    },
    requestFrame() {
      calls.push("frame");
    }
  };
  const events = new EditorAppEventHub(runtime);

  events.emit({ type: "cameraUpdated", source: "render" });

  assert.deepEqual(calls, ["frame"]);
});

test("invalidates the path trace camera for user camera updates", () => {
  const calls = [];
  const runtime = {
    invalidatePathTraceCamera() {
      calls.push("camera");
    },
    invalidatePathTraceEnvironment() {},
    invalidatePathTraceLights() {},
    invalidatePathTraceMaterials() {},
    invalidatePathTraceScene() {},
    requestFrame() {
      calls.push("frame");
    }
  };
  const events = new EditorAppEventHub(runtime);

  events.emit({ type: "cameraUpdated", source: "ui" });

  assert.deepEqual(calls, ["camera", "frame"]);
});
