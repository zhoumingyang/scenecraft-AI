import assert from "node:assert/strict";
import test from "node:test";

import { shouldInvalidatePathTraceForModelRuntimeFrame } from "../../../../render/editor/bindings/modelBindingRefreshPolicy.ts";

test("does not rebuild the path trace scene for model animation frames", () => {
  assert.equal(
    shouldInvalidatePathTraceForModelRuntimeFrame({
      animationUpdated: true,
      assetUpdated: false
    }),
    false
  );
});

test("does not rebuild the path trace scene for asset runtime update frames", () => {
  assert.equal(
    shouldInvalidatePathTraceForModelRuntimeFrame({
      animationUpdated: false,
      assetUpdated: true
    }),
    false
  );
});
