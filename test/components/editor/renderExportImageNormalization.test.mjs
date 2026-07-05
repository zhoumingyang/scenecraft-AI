import assert from "node:assert/strict";
import test from "node:test";

import normalization from "../../../components/editor/renderExportImageNormalization.ts";

const { normalizeRenderExportImageDataUrl } = normalization;

test("normalizes optimized render export images to the original capture dimensions", async () => {
  const drawCalls = [];
  let encodedType = null;
  let encodedQuality = null;

  const result = await normalizeRenderExportImageDataUrl(
    "data:image/jpeg;base64,optimized",
    1600,
    900,
    {
      imageFactory: () => createFakeImage(1024, 1024),
      createCanvas: (width, height) => ({
        width,
        height,
        getContext(type) {
          assert.equal(type, "2d");
          return {
            drawImage(...args) {
              drawCalls.push(args);
            }
          };
        },
        toDataURL(type, quality) {
          encodedType = type;
          encodedQuality = quality;
          return `data:image/jpeg;base64,${width}x${height}`;
        }
      })
    }
  );

  assert.equal(result, "data:image/jpeg;base64,1600x900");
  assert.equal(encodedType, "image/jpeg");
  assert.equal(encodedQuality, 0.9);
  assert.equal(drawCalls.length, 1);
  assert.deepEqual(drawCalls[0].slice(1), [0, 224, 1024, 576, 0, 0, 1600, 900]);
});

function createFakeImage(width, height) {
  const listeners = new Map();
  return {
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    set src(_value) {
      listeners.get("load")?.();
    }
  };
}
