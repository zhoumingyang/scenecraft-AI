import assert from "node:assert/strict";
import test from "node:test";

import {
  renderPathTraceSamplesUntil,
  renderPathTraceSamplesUntilAsync
} from "../../../../render/editor/runtime/pathTraceSampling.ts";

test("renders until the requested path trace sample count is reached", () => {
  let samples = 0;

  const rendered = renderPathTraceSamplesUntil({
    targetSamples: 4,
    maxIterations: 10,
    getSamples: () => samples,
    renderSample: () => {
      samples += 1;
    }
  });

  assert.equal(rendered, 4);
  assert.equal(samples, 4);
});

test("stops path trace capture sampling at the iteration budget", () => {
  let samples = 0;

  const rendered = renderPathTraceSamplesUntil({
    targetSamples: 4,
    maxIterations: 2,
    getSamples: () => samples,
    renderSample: () => {
      samples += 0.25;
    }
  });

  assert.equal(rendered, 2);
  assert.equal(samples, 0.5);
});

test("renders async path trace capture samples in batches with progress", async () => {
  let samples = 0;
  let yields = 0;
  const progressEvents = [];

  const rendered = await renderPathTraceSamplesUntilAsync({
    targetSamples: 5,
    maxIterations: 10,
    batchSize: 2,
    getSamples: () => samples,
    renderSample: () => {
      samples += 1;
    },
    onProgress: (progress) => {
      progressEvents.push(progress);
    },
    waitForNextFrame: async () => {
      yields += 1;
    }
  });

  assert.equal(rendered, 5);
  assert.equal(samples, 5);
  assert.equal(yields, 2);
  assert.deepEqual(
    progressEvents.map((event) => event.samples),
    [2, 4, 5]
  );
  assert.deepEqual(
    progressEvents.map((event) => event.progress),
    [0.4, 0.8, 1]
  );
});

test("cancels async path trace capture sampling between batches", async () => {
  let samples = 0;
  const controller = new AbortController();

  await assert.rejects(
    () =>
      renderPathTraceSamplesUntilAsync({
        targetSamples: 5,
        maxIterations: 10,
        batchSize: 2,
        signal: controller.signal,
        getSamples: () => samples,
        renderSample: () => {
          samples += 1;
        },
        onProgress: () => {
          controller.abort();
        },
        waitForNextFrame: async () => {}
      }),
    { name: "AbortError" }
  );

  assert.equal(samples, 2);
});
