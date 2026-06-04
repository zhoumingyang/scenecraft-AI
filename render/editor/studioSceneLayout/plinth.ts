import * as THREE from "three";

import type { Vec3Tuple } from "../core/types";
import type { StudioSceneVariantId } from "../studioScenes";
import {
  createExtrudedShapePresetGeometry,
  geometryToCustomMesh
} from "../utils/geometry";
import { IDENTITY_QUATERNION } from "./descriptors";
import {
  createStudioLayoutMaterial,
  type StudioLayoutBounds,
  type StudioLayoutMaterialDescriptor,
  type StudioLayoutMeshDescriptor,
  type StudioLayoutMeshGeometryDescriptor,
  type StudioLayoutTargetFrame,
  type StudioPlinthKind
} from "./types";
import type { StudioSceneStyleProfile } from "../studioSceneProfiles";

function createRoundedRectShape(width = 1, depth = 1, radius = 0.16) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const r = Math.min(radius, halfWidth * 0.48, halfDepth * 0.48);
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + r, -halfDepth);
  shape.lineTo(halfWidth - r, -halfDepth);
  shape.quadraticCurveTo(halfWidth, -halfDepth, halfWidth, -halfDepth + r);
  shape.lineTo(halfWidth, halfDepth - r);
  shape.quadraticCurveTo(halfWidth, halfDepth, halfWidth - r, halfDepth);
  shape.lineTo(-halfWidth + r, halfDepth);
  shape.quadraticCurveTo(-halfWidth, halfDepth, -halfWidth, halfDepth - r);
  shape.lineTo(-halfWidth, -halfDepth + r);
  shape.quadraticCurveTo(-halfWidth, -halfDepth, -halfWidth + r, -halfDepth);
  shape.closePath();
  return shape;
}

export function createExtrudedPlinthGeometry(
  kind: "roundedBox" | "beveled" | "extrudedShape"
) {
  const geometry =
    kind === "extrudedShape"
      ? createExtrudedShapePresetGeometry("leaf", 1, true)
      : new THREE.ExtrudeGeometry(createRoundedRectShape(), {
          depth: 1,
          steps: 1,
          bevelEnabled: kind === "beveled",
          bevelSize: kind === "beveled" ? 0.05 : 0,
          bevelThickness: kind === "beveled" ? 0.04 : 0,
          curveSegments: 18
        });
  geometry.rotateX(-Math.PI / 2);
  geometry.center();
  return geometry;
}

function createCustomPlinthGeometry(kind: "roundedBox" | "beveled" | "extrudedShape") {
  const geometry = createExtrudedPlinthGeometry(kind);
  const customMesh = geometryToCustomMesh(geometry);
  geometry.dispose();
  return customMesh;
}

function createPlinthDescriptor(input: {
  label: string;
  kind: StudioPlinthKind;
  geometry: StudioLayoutMeshGeometryDescriptor;
  material: StudioLayoutMaterialDescriptor;
  position: Vec3Tuple;
  scale: Vec3Tuple;
  resetKey: string;
}): StudioLayoutMeshDescriptor {
  return {
    kind: "mesh",
    role: "plinth",
    subRole: "plinth",
    label: input.label,
    geometry: input.geometry,
    material: input.material,
    position: input.position,
    quaternion: IDENTITY_QUATERNION,
    scale: input.scale,
    visible: true,
    locked: false,
    allowDelete: false,
    allowHide: false,
    resetKey: input.resetKey,
    plinthKind: input.kind
  };
}

export function resolveStudioPlinthKind(
  profileKind: StudioPlinthKind,
  variantId: StudioSceneVariantId
): StudioPlinthKind {
  if (variantId === "tieredStage") return "tiered";
  if (variantId === "wallNiche") return "roundedBox";
  if (variantId === "windowTable") return "box";
  return profileKind;
}

export function createStudioPlinthDescriptors(input: {
  styleProfile: StudioSceneStyleProfile;
  variantId: StudioSceneVariantId;
  targetFrame: StudioLayoutTargetFrame;
  bounds: StudioLayoutBounds;
  plinthKind?: StudioPlinthKind;
}): {
  descriptors: StudioLayoutMeshDescriptor[];
  topY: number;
} {
  const plinthProfile = input.styleProfile.layout.plinth;
  const kind = input.plinthKind ?? resolveStudioPlinthKind(plinthProfile.type, input.variantId);
  const material = createStudioLayoutMaterial(input.styleProfile.materials.surfaces.plinth);
  const radius = Math.max(
    input.targetFrame.footprintRadius * plinthProfile.fitPaddingRatio,
    plinthProfile.minRadius
  );
  const height = Math.max(input.bounds.radius * plinthProfile.heightRatio, 0.18);
  const topY = input.targetFrame.floorY;
  const baseY = topY - height;
  const center: Vec3Tuple = [input.bounds.center[0], baseY + height / 2, input.bounds.center[2]];
  const diameter = radius * 2;

  if (kind === "tiered" || kind === "multiLevel") {
    const lowerHeight = height * 0.5;
    const upperHeight = height * 0.58;
    const descriptors = [
      createPlinthDescriptor({
        label: kind === "multiLevel" ? "Studio Lower Platform" : "Studio Lower Tier",
        kind,
        geometry: { mode: "builtin", geometryName: kind === "multiLevel" ? "Box" : "Cylinder" },
        material,
        position: [center[0], topY - upperHeight - lowerHeight / 2, center[2]],
        scale:
          kind === "multiLevel"
            ? [diameter * 1.45, lowerHeight, diameter * 0.9]
            : [radius * 1.55 / 0.7, lowerHeight / 1.4, radius * 1.55 / 0.7],
        resetKey: `plinth:${kind}:lower`
      }),
      createPlinthDescriptor({
        label: kind === "multiLevel" ? "Studio Upper Platform" : "Studio Upper Tier",
        kind,
        geometry: { mode: "builtin", geometryName: kind === "multiLevel" ? "Box" : "Cylinder" },
        material,
        position: [center[0], topY - upperHeight / 2, center[2]],
        scale:
          kind === "multiLevel"
            ? [diameter * 0.92, upperHeight, diameter * 0.72]
            : [radius / 0.7, upperHeight / 1.4, radius / 0.7],
        resetKey: `plinth:${kind}:upper`
      })
    ];
    return { descriptors, topY };
  }

  if (kind === "roundedBox" || kind === "beveled" || kind === "extrudedShape") {
    return {
      topY,
      descriptors: [
        createPlinthDescriptor({
          label:
            kind === "extrudedShape"
              ? "Studio Shape Plinth"
              : kind === "beveled"
                ? "Studio Beveled Plinth"
                : "Studio Rounded Plinth",
          kind,
          geometry: { mode: "custom", geometry: createCustomPlinthGeometry(kind) },
          material,
          position: center,
          scale: [diameter, height, diameter],
          resetKey: `plinth:${kind}`
        })
      ]
    };
  }

  const geometryName = kind === "cylinder" || kind === "floating" ? "Cylinder" : "Box";
  const finalHeight = kind === "floating" ? height * 0.82 : height;
  const finalTopY = topY;
  return {
    topY: finalTopY,
    descriptors: [
      createPlinthDescriptor({
        label:
          kind === "floating"
            ? "Studio Floating Plinth"
            : kind === "cylinder"
              ? "Studio Plinth"
              : "Studio Block Plinth",
        kind,
        geometry: { mode: "builtin", geometryName },
        material,
        position: [center[0], finalTopY - finalHeight / 2, center[2]],
        scale:
          geometryName === "Cylinder"
            ? [radius / 0.7, finalHeight / 1.4, radius / 0.7]
            : [kind === "square" ? diameter : diameter * 1.25, finalHeight, diameter],
        resetKey: `plinth:${kind}`
      })
    ]
  };
}
