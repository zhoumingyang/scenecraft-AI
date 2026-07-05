import assert from "node:assert/strict";
import test from "node:test";

import renderExportMode from "../../../components/editor/renderExportMode.ts";

const {
  shouldIncludeGridHelperInRenderExport,
  shouldOfferAiRenderExportOptimization
} = renderExportMode;

test("only offers AI render export optimization for path trace mode", () => {
  assert.equal(shouldOfferAiRenderExportOptimization("pathTrace"), true);
  assert.equal(shouldOfferAiRenderExportOptimization("webgl"), false);
});

test("keeps the default grid helper in non-path-trace render exports", () => {
  assert.equal(shouldIncludeGridHelperInRenderExport("webgl"), true);
  assert.equal(shouldIncludeGridHelperInRenderExport("pathTrace"), false);
});
