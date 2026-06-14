import { strict as assert } from "node:assert";
import test from "node:test";
import * as THREE from "three";

import {
  createAdaptiveLightPresetDefinition,
  getLightPresetDefinition
} from "../render/editor/lightPresets.ts";

const EPSILON = 1e-6;

function assertTupleClose(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => {
    assert.ok(
      Math.abs(value - expected[index]) < EPSILON,
      `expected ${actual.join(",")} to be close to ${expected.join(",")}`
    );
  });
}

function createExpectedQuaternion(position, target) {
  const helper = new THREE.Object3D();
  helper.position.set(position[0], position[1], position[2]);
  helper.lookAt(target[0], target[1], target[2]);
  return [
    helper.quaternion.x,
    helper.quaternion.y,
    helper.quaternion.z,
    helper.quaternion.w
  ];
}

test("adaptive light presets scale spot position, distance, and intensity from the scene frame", () => {
  const preset = createAdaptiveLightPresetDefinition("studioThreePoint", {
    center: [10, 1, 20],
    floorY: -2,
    radius: 2
  });
  const keySpot = preset.lights[0].light;

  assertTupleClose(keySpot.position, [16, 6, 26]);
  assert.equal(keySpot.distance, 28);
  assert.equal(keySpot.intensity, 280);
  assertTupleClose(keySpot.quaternion, createExpectedQuaternion([16, 6, 26], [10, 1, 20]));
});

test("adaptive light presets scale rect area light position and size without scaling intensity", () => {
  const preset = createAdaptiveLightPresetDefinition("productShowcase", {
    center: [10, 1, 20],
    floorY: -2,
    radius: 2
  });
  const keyPanel = preset.lights[0].light;

  assertTupleClose(keyPanel.position, [16, 4, 24]);
  assert.equal(keyPanel.width, 6);
  assert.equal(keyPanel.height, 4);
  assert.equal(keyPanel.intensity, 4.5);
});

test("adaptive light presets fall back to the static preset when frame is unavailable", () => {
  const adaptive = createAdaptiveLightPresetDefinition("warmHome", null);
  const staticPreset = getLightPresetDefinition("warmHome");

  assert.deepEqual(adaptive, staticPreset);
});
