import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldContinueInteractivePathTrace,
  shouldRenderInteractivePathTraceSample
} from "../../../../render/editor/runtime/pathTraceFrameBudget.ts";

test("renders interactive path trace samples until the target is reached", () => {
  assert.equal(shouldRenderInteractivePathTraceSample({ samples: 0, targetSamples: 128 }), true);
  assert.equal(shouldRenderInteractivePathTraceSample({ samples: 127.5, targetSamples: 128 }), true);
  assert.equal(shouldRenderInteractivePathTraceSample({ samples: 128, targetSamples: 128 }), false);
});

test("continues path trace animation while dirty or below the sample target", () => {
  assert.equal(
    shouldContinueInteractivePathTrace({
      dirty: false,
      samples: 128,
      targetSamples: 128
    }),
    false
  );
  assert.equal(
    shouldContinueInteractivePathTrace({
      dirty: true,
      samples: 128,
      targetSamples: 128
    }),
    true
  );
  assert.equal(
    shouldContinueInteractivePathTrace({
      dirty: false,
      isCompiling: false,
      samples: 64,
      targetSamples: 128
    }),
    true
  );
});
