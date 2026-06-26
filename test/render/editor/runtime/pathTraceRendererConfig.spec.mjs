import assert from "node:assert/strict";
import test from "node:test";

import {
  PATH_TRACE_CAPTURE_MAX_ITERATIONS,
  PATH_TRACE_CAPTURE_SAMPLES,
  PATH_TRACE_GLOSSY_FILTER_FACTOR,
  PATH_TRACE_INTERACTIVE_TARGET_SAMPLES,
  configureEditorPathTracer
} from "../../../../render/editor/runtime/pathTraceRendererConfig.ts";

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
  assert.equal(pathTracer.stableNoise, true);
});

test("uses balanced realtime samples and high quality capture samples", () => {
  assert.equal(PATH_TRACE_INTERACTIVE_TARGET_SAMPLES, 256);
  assert.equal(PATH_TRACE_CAPTURE_SAMPLES, 2048);
  assert.equal(PATH_TRACE_CAPTURE_MAX_ITERATIONS, 2048);
  assert.equal(PATH_TRACE_GLOSSY_FILTER_FACTOR, 1);
});

test("uses the display-pixel render scale supplied by the editor renderer", () => {
  const pathTracer = {
    tiles: {
      set() {}
    }
  };

  configureEditorPathTracer(pathTracer, { renderScale: 0.5 });

  assert.equal(pathTracer.renderScale, 0.5);
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
