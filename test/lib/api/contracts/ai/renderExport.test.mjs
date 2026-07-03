import assert from "node:assert/strict";
import test from "node:test";

import contracts from "../../../../../lib/api/contracts/ai/renderExport.ts";

const {
  AI_RENDER_EXPORT_MAX_INPUT_BYTES,
  optimizeRenderExportRequestSchema
} = contracts;

test("accepts a compressed render export image request", () => {
  const parsed = optimizeRenderExportRequestSchema.parse({
    imageDataUrl: "data:image/jpeg;base64,YWJj",
    width: 960,
    height: 540
  });

  assert.equal(parsed.imageDataUrl, "data:image/jpeg;base64,YWJj");
  assert.equal(parsed.width, 960);
  assert.equal(parsed.height, 540);
});

test("rejects non-image render export payloads", () => {
  assert.throws(
    () =>
      optimizeRenderExportRequestSchema.parse({
        imageDataUrl: "data:text/plain;base64,YWJj",
        width: 960,
        height: 540
      }),
    /JPEG, PNG, or WebP/
  );
});

test("rejects render export payloads over the upload budget", () => {
  const oversizedImage = Buffer.alloc(AI_RENDER_EXPORT_MAX_INPUT_BYTES + 1).toString("base64");

  assert.throws(
    () =>
      optimizeRenderExportRequestSchema.parse({
        imageDataUrl: `data:image/jpeg;base64,${oversizedImage}`,
        width: 960,
        height: 540
      }),
    /700KB/
  );
});
