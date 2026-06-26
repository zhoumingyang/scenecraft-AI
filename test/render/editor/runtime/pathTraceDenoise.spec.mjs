import assert from "node:assert/strict";
import test from "node:test";

import {
  PATH_TRACE_CAPTURE_DENOISE_SETTINGS,
  PATH_TRACE_REALTIME_DENOISE_SETTINGS,
  configurePathTraceDenoiseMaterial,
  renderPathTraceDenoisedTexture
} from "../../../../render/editor/runtime/pathTraceDenoise.ts";

test("configures gentler realtime path trace denoise settings", () => {
  const texture = { id: "path-trace-target" };
  const material = {
    uniforms: {
      map: { value: null },
      sigma: { value: 0 },
      threshold: { value: 0 },
      kSigma: { value: 0 },
      opacity: { value: 0 }
    }
  };

  configurePathTraceDenoiseMaterial(material, texture);

  assert.equal(material.uniforms.map.value, texture);
  assert.equal(material.uniforms.sigma.value, PATH_TRACE_REALTIME_DENOISE_SETTINGS.sigma);
  assert.equal(material.uniforms.sigma.value, 3.2);
  assert.equal(material.uniforms.threshold.value, PATH_TRACE_REALTIME_DENOISE_SETTINGS.threshold);
  assert.equal(material.uniforms.threshold.value, 0.045);
  assert.equal(material.uniforms.kSigma.value, 1);
  assert.equal(material.uniforms.opacity.value, 1);
});

test("configures stronger path trace denoise settings for capture output", () => {
  const texture = { id: "path-trace-target" };
  const material = {
    uniforms: {
      map: { value: null },
      sigma: { value: 0 },
      threshold: { value: 0 },
      kSigma: { value: 0 },
      opacity: { value: 0 }
    }
  };

  configurePathTraceDenoiseMaterial(material, texture, PATH_TRACE_CAPTURE_DENOISE_SETTINGS);

  assert.equal(material.uniforms.map.value, texture);
  assert.equal(material.uniforms.sigma.value, 5);
  assert.equal(material.uniforms.threshold.value, 0.08);
  assert.equal(material.uniforms.kSigma.value, 1);
  assert.equal(material.uniforms.opacity.value, 1);
});

test("renders a denoised path trace texture to the canvas", () => {
  const texture = { id: "path-trace-target" };
  const events = [];
  const material = {
    uniforms: {
      map: { value: null },
      sigma: { value: 0 },
      threshold: { value: 0 },
      kSigma: { value: 0 },
      opacity: { value: 0 }
    }
  };
  const renderer = {
    autoClear: false,
    clear() {
      events.push(["clear", this.autoClear]);
    }
  };
  const quad = {
    render(receivedRenderer) {
      events.push(["render", receivedRenderer === renderer, renderer.autoClear]);
    }
  };

  renderPathTraceDenoisedTexture({ material, quad, renderer, texture });

  assert.equal(material.uniforms.map.value, texture);
  assert.deepEqual(events, [
    ["clear", true],
    ["render", true, true]
  ]);
  assert.equal(renderer.autoClear, false);
});
