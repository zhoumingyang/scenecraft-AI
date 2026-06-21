import assert from "node:assert/strict";
import test from "node:test";

import { configureEditorPathTracer } from "./pathTraceRendererConfig.ts";

test("configures path tracing for full-resolution accumulation instead of noisy low-res preview", () => {
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
  assert.equal(pathTracer.renderScale, 1);
  assert.equal(pathTracer.minSamples >= 64, true);
  assert.equal(pathTracer.fadeDuration, 0);
});
