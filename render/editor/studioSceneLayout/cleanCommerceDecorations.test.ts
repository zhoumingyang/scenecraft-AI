import assert from "node:assert/strict";

import { cleanCommerceStyleProfile } from "../studioSceneProfiles/configs/cleanCommerce";
import { createCleanCommerceDecorationDescriptors } from "./cleanCommerceDecorations";
import {
  createStudioLayoutBounds,
  type StudioLayoutTargetFrame
} from "./types";

const targetFrame: StudioLayoutTargetFrame = {
  center: [0, 0.8, 0],
  radius: 1.2,
  footprintRadius: 0.5,
  height: 1.6,
  floorY: 0
};

const bounds = createStudioLayoutBounds({
  styleProfile: cleanCommerceStyleProfile,
  variantId: "roundPlinth",
  productProfile: {
    productType: "beauty",
    material: "glass",
    brandColor: null
  },
  targetFrame
});

const descriptors = createCleanCommerceDecorationDescriptors({
  styleProfile: cleanCommerceStyleProfile,
  bounds,
  plinthTopY: 0.38,
  targetFrame
});

assert.deepEqual(
  descriptors.map((descriptor) => descriptor.decorationKind),
  [
    "luminousRingBackdrop",
    "transparentAcrylicCube",
    "frostedGlassSphere",
    "cutCrystalBlock"
  ],
  "clean commerce should generate the reference-image decoration set"
);
assert.equal(descriptors.length, 4);

const ring = descriptors[0]!;
const cube = descriptors[1]!;
const sphere = descriptors[2]!;
const crystal = descriptors[3]!;

function materialOf(descriptor: (typeof descriptors)[number], label: string) {
  assert.ok(descriptor.material, `${label} material should be defined`);
  return descriptor.material;
}

function numberValue(value: number | undefined, label: string) {
  if (typeof value !== "number") {
    assert.fail(`${label} should be defined`);
  }
  return value;
}

const ringMaterial = materialOf(ring, "ring");
const cubeMaterial = materialOf(cube, "cube");
const sphereMaterial = materialOf(sphere, "sphere");

assert.equal(ringMaterial.emissive, "#ffffff");
assert.ok(
  numberValue(ringMaterial.emissiveIntensity, "ring emissive intensity") > 1,
  "ring backdrop should drive bloom through emissive intensity"
);
assert.ok(
  numberValue(cubeMaterial.opacity, "cube opacity") < 0.35,
  "acrylic cube should be visibly transparent"
);
assert.ok(
  numberValue(sphereMaterial.roughness, "sphere roughness") >
    numberValue(cubeMaterial.roughness, "cube roughness"),
  "frosted sphere should be rougher than clear acrylic"
);
assert.ok(
  crystal.position[2] < targetFrame.center[2],
  "crystal block should sit behind the product"
);
assert.ok(
  cube.position[0] < targetFrame.center[0] && sphere.position[0] > targetFrame.center[0],
  "cube and sphere should form left/right background balance"
);
