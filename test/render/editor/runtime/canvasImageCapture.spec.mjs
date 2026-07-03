import assert from "node:assert/strict";
import test from "node:test";

import canvasImageCapture from "../../../../render/editor/runtime/canvasImageCapture.ts";

const {
  canvasToCompressedImageDataUrlAsync,
  canvasToPngDataUrlAsync
} = canvasImageCapture;

test("encodes canvas captures through async toBlob without calling sync toDataURL", async () => {
  let toBlobCalls = 0;
  let toDataUrlCalls = 0;
  const blob = { type: "image/png" };
  const canvas = {
    toBlob(callback, mimeType) {
      toBlobCalls += 1;
      assert.equal(mimeType, "image/png");
      callback(blob);
    },
    toDataURL() {
      toDataUrlCalls += 1;
      return "data:image/png;base64,sync";
    }
  };

  const dataUrl = await canvasToPngDataUrlAsync(canvas, {
    readBlobAsDataUrl: async (receivedBlob) => {
      assert.equal(receivedBlob, blob);
      return "data:image/png;base64,async";
    }
  });

  assert.equal(dataUrl, "data:image/png;base64,async");
  assert.equal(toBlobCalls, 1);
  assert.equal(toDataUrlCalls, 0);
});

test("rejects async canvas capture when the browser cannot create a PNG blob", async () => {
  const canvas = {
    toBlob(callback) {
      callback(null);
    }
  };

  await assert.rejects(
    () => canvasToPngDataUrlAsync(canvas, {
      readBlobAsDataUrl: async () => "data:image/png;base64,unused"
    }),
    /Unable to encode canvas capture/
  );
});

test("encodes compressed captures as JPEG with requested quality", async () => {
  const blob = { size: 512, type: "image/jpeg" };
  const canvas = {
    width: 800,
    height: 600,
    toBlob(callback, mimeType, quality) {
      assert.equal(mimeType, "image/jpeg");
      assert.equal(quality, 0.9);
      callback(blob);
    }
  };

  const result = await canvasToCompressedImageDataUrlAsync(canvas, {
    maxBytes: 700,
    maxDimensions: [1536],
    qualities: [0.9],
    readBlobAsDataUrl: async (receivedBlob) => {
      assert.equal(receivedBlob, blob);
      return "data:image/jpeg;base64,small";
    }
  });

  assert.equal(result.dataUrl, "data:image/jpeg;base64,small");
  assert.equal(result.mimeType, "image/jpeg");
  assert.equal(result.byteSize, 512);
  assert.equal(result.width, 800);
  assert.equal(result.height, 600);
  assert.equal(result.quality, 0.9);
  assert.equal(result.withinBudget, true);
});

test("retries compressed captures with lower quality and smaller dimensions", async () => {
  const attempts = [];
  const blobs = [
    { size: 900, type: "image/jpeg" },
    { size: 800, type: "image/jpeg" },
    { size: 600, type: "image/jpeg" }
  ];
  const sourceCanvas = {
    width: 2000,
    height: 1000,
    toBlob() {
      throw new Error("source canvas should be scaled before encoding");
    }
  };

  const result = await canvasToCompressedImageDataUrlAsync(sourceCanvas, {
    maxBytes: 700,
    maxDimensions: [1536, 960],
    qualities: [0.9, 0.58],
    createCanvas: (width, height) => ({
      width,
      height,
      getContext(type) {
        assert.equal(type, "2d");
        return {
          drawImage() {}
        };
      },
      toBlob(callback, mimeType, quality) {
        attempts.push({ width, height, mimeType, quality });
        callback(blobs[attempts.length - 1]);
      }
    }),
    readBlobAsDataUrl: async (blob) => `data:image/jpeg;base64,${blob.size}`
  });

  assert.deepEqual(attempts, [
    { width: 1536, height: 768, mimeType: "image/jpeg", quality: 0.9 },
    { width: 1536, height: 768, mimeType: "image/jpeg", quality: 0.58 },
    { width: 960, height: 480, mimeType: "image/jpeg", quality: 0.9 }
  ]);
  assert.equal(result.dataUrl, "data:image/jpeg;base64,600");
  assert.equal(result.width, 960);
  assert.equal(result.height, 480);
  assert.equal(result.byteSize, 600);
  assert.equal(result.withinBudget, true);
});

test("returns the smallest compressed capture when no attempt fits the byte budget", async () => {
  const sourceCanvas = {
    width: 2000,
    height: 1000,
    toBlob() {
      throw new Error("source canvas should be scaled before encoding");
    }
  };

  const result = await canvasToCompressedImageDataUrlAsync(sourceCanvas, {
    maxBytes: 700,
    maxDimensions: [960],
    qualities: [0.58],
    createCanvas: (width, height) => ({
      width,
      height,
      getContext() {
        return {
          drawImage() {}
        };
      },
      toBlob(callback) {
        callback({ size: 900, type: "image/jpeg" });
      }
    }),
    readBlobAsDataUrl: async () => "data:image/jpeg;base64,oversize"
  });

  assert.equal(result.dataUrl, "data:image/jpeg;base64,oversize");
  assert.equal(result.width, 960);
  assert.equal(result.height, 480);
  assert.equal(result.byteSize, 900);
  assert.equal(result.withinBudget, false);
});
