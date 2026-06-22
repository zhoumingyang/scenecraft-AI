import assert from "node:assert/strict";
import test from "node:test";

import { configureEditorPathTracer } from "./pathTraceRendererConfig.ts";

test("configures path tracing to show the interactive path traced image immediately", () => {
  const calls = [];
  const pathTracer = {
    tiles: {
      set(x, y) {
        calls.push([x, y]);
      }
    }
  };

  configureEditorPathTracer(pathTracer);

  assert.deepEqual(calls, [[1, 1]]);
  assert.equal(pathTracer.dynamicLowRes, false);
  assert.equal(pathTracer.rasterizeScene, false);
  assert.equal(pathTracer.renderScale, 1);
  assert.equal(pathTracer.minSamples, 1);
  assert.equal(pathTracer.fadeDuration, 0);
});

test("clears the shared editor canvas before presenting the path traced target", () => {
  const pathTracer = {
    tiles: {
      set() {}
    }
  };
  const events = [];
  const renderer = {
    autoClear: false,
    clear() {
      events.push(["clear", this.autoClear]);
    }
  };
  const quad = {
    render(receivedRenderer) {
      events.push(["render", receivedRenderer === renderer, renderer.autoClear]);
    }
  };

  configureEditorPathTracer(pathTracer);
  pathTracer.renderToCanvasCallback({}, renderer, quad);

  assert.deepEqual(events, [
    ["clear", true],
    ["render", true, true]
  ]);
  assert.equal(renderer.autoClear, false);
});
