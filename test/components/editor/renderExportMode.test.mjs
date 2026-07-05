import assert from "node:assert/strict";
import test from "node:test";

import renderExportMode from "../../../components/editor/renderExportMode.ts";

const { shouldOfferAiRenderExportOptimization } = renderExportMode;

test("only offers AI render export optimization for path trace mode", () => {
  assert.equal(shouldOfferAiRenderExportOptimization("pathTrace"), true);
  assert.equal(shouldOfferAiRenderExportOptimization("webgl"), false);
});
