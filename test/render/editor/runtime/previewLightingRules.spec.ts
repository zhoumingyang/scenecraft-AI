import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldUsePreviewLighting,
  type PreviewLightingEnvState,
  type PreviewLightingLightState
} from "../../../../render/editor/runtime/previewLightingRules";

const darkEnv: PreviewLightingEnvState = {
  hasImageBasedLighting: false,
  environmentIntensity: 1
};

test("uses preview lighting when there are no visible project lights or image-based lighting", () => {
  assert.equal(shouldUsePreviewLighting([], darkEnv), true);
});

test("disables preview lighting when a visible project light has positive intensity", () => {
  const lights: PreviewLightingLightState[] = [
    {
      visible: true,
      intensity: 0.25
    }
  ];

  assert.equal(shouldUsePreviewLighting(lights, darkEnv), false);
});

test("disables preview lighting when image-based lighting has positive intensity", () => {
  assert.equal(
    shouldUsePreviewLighting([], {
      hasImageBasedLighting: true,
      environmentIntensity: 0.4
    }),
    false
  );
});

test("uses preview lighting when lights and image-based lighting are present but disabled", () => {
  const lights: PreviewLightingLightState[] = [
    {
      visible: false,
      intensity: 1
    },
    {
      visible: true,
      intensity: 0
    }
  ];

  assert.equal(
    shouldUsePreviewLighting(lights, {
      hasImageBasedLighting: true,
      environmentIntensity: 0
    }),
    true
  );
});
