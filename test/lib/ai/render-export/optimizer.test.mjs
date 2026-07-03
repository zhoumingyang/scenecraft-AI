import assert from "node:assert/strict";
import test from "node:test";

import optimizer from "../../../../lib/ai/render-export/optimizer.ts";

const {
  AI_RENDER_EXPORT_OPTIMIZATION_MODEL_ID,
  buildRenderExportOptimizationPrompt,
  optimizeRenderExportImage
} = optimizer;

const SOURCE_IMAGE = "data:image/jpeg;base64,YWJj";

test("builds a conservative image optimization prompt", () => {
  const prompt = buildRenderExportOptimizationPrompt();

  assert.match(prompt, /对图片进行优化/);
  assert.match(prompt, /保持图片内容/);
  assert.match(prompt, /整体色彩/);
  assert.match(prompt, /不增删对象/);
});

test("requests render export image optimization from the configured image model", async () => {
  const calls = [];
  const result = await optimizeRenderExportImage({
    imageDataUrl: SOURCE_IMAGE,
    provider: {
      id: "openrouter",
      async generateImage(request) {
        calls.push(request);
        return {
          images: [{ url: "data:image/jpeg;base64,b3B0aW1pemVk" }],
          seed: null,
          traceId: "trace-123"
        };
      }
    }
  });

  assert.equal(result.imageDataUrl, "data:image/jpeg;base64,b3B0aW1pemVk");
  assert.equal(result.traceId, "trace-123");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, AI_RENDER_EXPORT_OPTIMIZATION_MODEL_ID);
  assert.equal(calls[0].providerId, "openrouter");
  assert.deepEqual(calls[0].referenceImages, [SOURCE_IMAGE]);
  assert.match(calls[0].prompt, /对图片进行优化/);
});

test("throws when the provider returns no optimized render export image", async () => {
  await assert.rejects(
    () =>
      optimizeRenderExportImage({
        imageDataUrl: SOURCE_IMAGE,
        provider: {
          id: "openrouter",
          async generateImage() {
            return {
              images: [],
              seed: null,
              traceId: "trace-empty"
            };
          }
        }
      }),
    /returned no optimized render export image/
  );
});
