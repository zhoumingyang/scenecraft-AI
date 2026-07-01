import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PATH_TRACE_SETTINGS,
  getPathTraceCaptureSampleBudget,
  normalizePathTraceSettings
} from "../../../../render/editor/runtime/pathTraceSettings.ts";

test("normalizes path trace scene settings with current defaults", () => {
  assert.deepEqual(normalizePathTraceSettings(), DEFAULT_PATH_TRACE_SETTINGS);
});

test("clamps path trace scene settings to safe editor ranges", () => {
  assert.deepEqual(
    normalizePathTraceSettings({
      bounces: 99,
      filterGlossyFactor: -4,
      interactiveRenderScale: 9,
      interactiveSamples: 0,
      renderScale: 0,
      tiles: 99,
      minSamples: 0,
      fadeDuration: 99,
      renderDelay: -1,
      realtimeSamples: 4.4,
      exportSamples: 99999
    }),
    {
      bounces: 12,
      filterGlossyFactor: 0,
      interactiveRenderScale: 1,
      interactiveSamples: 1,
      renderScale: 0.25,
      tiles: 4,
      minSamples: 1,
      fadeDuration: 2,
      renderDelay: 0,
      realtimeSamples: 32,
      exportSamples: 8192
    }
  );
});

test("uses export samples as the path trace capture iteration budget", () => {
  assert.deepEqual(
    getPathTraceCaptureSampleBudget({
      ...DEFAULT_PATH_TRACE_SETTINGS,
      exportSamples: 768
    }),
    {
      targetSamples: 768,
      maxIterations: 768
    }
  );
});
