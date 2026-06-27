import assert from "node:assert/strict";
import test from "node:test";

import { createPathTraceSampleStatus } from "../../../../render/editor/runtime/pathTraceSampleStatus.ts";

test("creates path trace sample status with clamped progress", () => {
  assert.deepEqual(
    createPathTraceSampleStatus({
      dirty: false,
      mode: "settled",
      samples: 128,
      targetSamples: 256
    }),
    {
      dirty: false,
      mode: "settled",
      progress: 0.5,
      samples: 128,
      sampling: true,
      targetSamples: 256
    }
  );

  assert.equal(
    createPathTraceSampleStatus({
      dirty: false,
      mode: "settled",
      samples: 320,
      targetSamples: 256
    }).progress,
    1
  );
});

test("marks path trace status as sampling while dirty even at the sample target", () => {
  const status = createPathTraceSampleStatus({
    dirty: true,
    mode: "interactive",
    samples: 48,
    targetSamples: 48
  });

  assert.equal(status.sampling, true);
  assert.equal(status.mode, "interactive");
  assert.equal(status.progress, 1);
});

test("marks path trace status as settled when clean and target samples are reached", () => {
  const status = createPathTraceSampleStatus({
    dirty: false,
    mode: "settled",
    samples: 256,
    targetSamples: 256
  });

  assert.equal(status.sampling, false);
});
