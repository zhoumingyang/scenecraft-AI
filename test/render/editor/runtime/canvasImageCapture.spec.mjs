import assert from "node:assert/strict";
import test from "node:test";

import { canvasToPngDataUrlAsync } from "../../../../render/editor/runtime/canvasImageCapture.ts";

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
