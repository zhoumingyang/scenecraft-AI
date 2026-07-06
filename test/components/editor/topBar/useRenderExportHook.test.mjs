import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import test from "node:test";

const USE_RENDER_EXPORT_URL = new URL(
  "../../../../components/editor/topBar/useRenderExport.ts",
  import.meta.url
);
const TOP_BAR_SOURCE = readFileSync(
  new URL("../../../../components/editor/topBar.tsx", import.meta.url),
  "utf8"
);

test("TopBar delegates render export flow to useRenderExport", () => {
  assert.equal(existsSync(USE_RENDER_EXPORT_URL), true);
  const useRenderExportSource = readFileSync(USE_RENDER_EXPORT_URL, "utf8");

  assert.match(TOP_BAR_SOURCE, /useRenderExport\(\{/);
  assert.doesNotMatch(TOP_BAR_SOURCE, /captureViewportImageAsync/);
  assert.doesNotMatch(TOP_BAR_SOURCE, /optimizeRenderExportImage/);
  assert.match(useRenderExportSource, /captureViewportImageAsync/);
  assert.match(useRenderExportSource, /optimizeRenderExportImage/);
});
