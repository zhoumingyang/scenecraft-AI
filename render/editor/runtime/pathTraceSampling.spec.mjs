import assert from "node:assert/strict";
import test from "node:test";

import { renderPathTraceSamplesUntil } from "./pathTraceSampling.ts";

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
