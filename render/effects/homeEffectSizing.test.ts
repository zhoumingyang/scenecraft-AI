import assert from "node:assert/strict";
import { getHomeEffectViewportSize } from "./homeEffectSizing";

function makeHost(width: number, height: number) {
  return {
    getBoundingClientRect: () => ({ width, height })
  };
}

assert.equal(
  getHomeEffectViewportSize(makeHost(0, 768)),
  null,
  "zero host dimensions should not be drawable"
);

assert.equal(
  getHomeEffectViewportSize(makeHost(0.4, 768)),
  null,
  "subpixel host dimensions that floor to zero should not be drawable"
);

assert.deepEqual(
  getHomeEffectViewportSize(makeHost(1280.9, 720.2)),
  { width: 1280, height: 720 },
  "valid host dimensions should be floored"
);
