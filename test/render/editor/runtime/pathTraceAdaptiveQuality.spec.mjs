import assert from "node:assert/strict";
import test from "node:test";

import {
  getInteractivePathTraceQuality,
  getPathTraceQualityTransition
} from "../../../../render/editor/runtime/pathTraceAdaptiveQuality.ts";

test("uses a lower render scale and sample target while the editor is interactive", () => {
  const quality = getInteractivePathTraceQuality({
    displayPixelRenderScale: 1,
    interactive: true
  });

  assert.equal(quality.mode, "interactive");
  assert.equal(quality.renderScale, 0.5);
  assert.equal(quality.targetSamples, 48);
});

test("restores full display-pixel quality once the editor is idle", () => {
  const quality = getInteractivePathTraceQuality({
    displayPixelRenderScale: 0.5,
    interactive: false
  });

  assert.equal(quality.mode, "settled");
  assert.equal(quality.renderScale, 0.5);
  assert.equal(quality.targetSamples, 256);
});

test("resets accumulated samples when the adaptive quality mode changes", () => {
  assert.deepEqual(
    getPathTraceQualityTransition({
      currentMode: "interactive",
      nextMode: "settled"
    }),
    {
      modeChanged: true,
      shouldResetSamples: true
    }
  );

  assert.deepEqual(
    getPathTraceQualityTransition({
      currentMode: "settled",
      nextMode: "settled"
    }),
    {
      modeChanged: false,
      shouldResetSamples: false
    }
  );
});
