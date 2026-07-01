import assert from "node:assert/strict";
import test from "node:test";

import {
  getInteractivePathTraceQuality,
  getPathTraceQualityTransition,
  shouldUseInteractivePathTraceQuality
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

test("uses configurable realtime samples once the editor is idle", () => {
  const quality = getInteractivePathTraceQuality({
    displayPixelRenderScale: 1,
    interactive: false,
    settledTargetSamples: 640
  });

  assert.equal(quality.mode, "settled");
  assert.equal(quality.targetSamples, 640);
});

test("uses configurable interactive preview quality while the editor is active", () => {
  const quality = getInteractivePathTraceQuality({
    displayPixelRenderScale: 1.5,
    interactive: true,
    interactiveRenderScale: 0.75,
    interactiveTargetSamples: 24
  });

  assert.equal(quality.mode, "interactive");
  assert.equal(quality.renderScale, 1.125);
  assert.equal(quality.targetSamples, 24);
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

test("does not treat render-to-model sync pulses as path trace interaction", () => {
  assert.equal(
    shouldUseInteractivePathTraceQuality({
      transformDragging: false,
      firstPersonInputActive: false,
      orbitDampingFramesRemaining: 0,
      runtimeChanged: false,
      sessionChanged: true
    }),
    false
  );
});

test("treats direct editor input and camera movement as path trace interaction", () => {
  assert.equal(
    shouldUseInteractivePathTraceQuality({
      transformDragging: false,
      firstPersonInputActive: false,
      orbitDampingFramesRemaining: 1,
      runtimeChanged: false,
      sessionChanged: false
    }),
    true
  );
  assert.equal(
    shouldUseInteractivePathTraceQuality({
      transformDragging: false,
      firstPersonInputActive: false,
      orbitDampingFramesRemaining: 0,
      runtimeChanged: true,
      sessionChanged: false
    }),
    true
  );
});
