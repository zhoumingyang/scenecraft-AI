import * as THREE from "three";

import type { StudioSceneVariantDefinition } from "../../studioScenes";
import {
  MIN_FRAME_RADIUS,
  type StudioSceneRuntimeBuildInput,
  type StudioRoomBounds,
  type StudioSceneFrame
} from "./types";
import { createStudioRoundedRoomGeometry } from "../../studioSceneRoomGeometry";
import {
  createBoxMesh,
  createCylinderMesh,
  createEmissiveMaterial,
  createMaterial,
  createPlaneMesh
} from "./geometry";
import { createStudioLightingObjects } from "./lighting";

export function createStudioRuntimeObjects({
  preset,
  variant,
  frame,
  bounds
}: StudioSceneRuntimeBuildInput) {
  const radius = bounds.radius;
  const { width, depth, wallHeight, floorY, center } = bounds;
  const plinthHeight = Math.max(radius * 0.32, 0.18);
  const plinthRadius = Math.max(frame.footprintRadius * 1.16, radius * 0.72, 0.72);
  const objects: THREE.Object3D[] = [];

  const roomMaterial = createMaterial(preset.backgroundColor, { side: THREE.DoubleSide });
  const accentMaterial = createMaterial(preset.accentColor, {
    roughness: 0.72,
    metalness: preset.id === "darkTech" ? 0.25 : 0
  });
  const plinthMaterial = createMaterial(preset.plinthColor, {
    roughness: preset.id === "darkTech" ? 0.45 : 0.68,
    metalness: preset.id === "darkTech" ? 0.15 : 0
  });

  objects.push(
    createRoundedRoomMesh({
      name: "studio-closed-cove-room",
      width,
      height: wallHeight,
      depth,
      radius,
      cornerRadiusRatio: preset.layout.background.cornerRadiusRatio,
      position: new THREE.Vector3(center.x, floorY + wallHeight / 2, center.z),
      material: roomMaterial
    }),
    createCylinderMesh({
      name: "studio-plinth",
      radius: plinthRadius,
      height: plinthHeight,
      position: new THREE.Vector3(center.x, floorY + plinthHeight / 2, center.z),
      material: plinthMaterial
    })
  );

  objects.push(
    ...createVariantDetailObjects(
      variant,
      frame,
      bounds,
      floorY,
      plinthRadius,
      accentMaterial,
      plinthMaterial
    ),
    ...createStudioLightingObjects(preset, frame, bounds)
  );

  return objects;
}

function createRoundedRoomMesh({
  name,
  width,
  height,
  depth,
  radius,
  cornerRadiusRatio,
  position,
  material
}: {
  name: string;
  width: number;
  height: number;
  depth: number;
  radius: number;
  cornerRadiusRatio: number;
  position: THREE.Vector3;
  material: THREE.Material;
}) {
  const mesh = new THREE.Mesh(
    createStudioRoundedRoomGeometry({ width, height, depth, radius, cornerRadiusRatio }),
    material
  );
  mesh.name = name;
  mesh.position.copy(position);
  mesh.receiveShadow = true;
  return mesh;
}

function createVariantDetailObjects(
  variant: StudioSceneVariantDefinition,
  frame: StudioSceneFrame,
  bounds: StudioRoomBounds,
  floorY: number,
  plinthRadius: number,
  accentMaterial: THREE.Material,
  plinthMaterial: THREE.Material
) {
  if (variant.id === "tieredStage") {
    return createTieredStageDetails(frame, floorY, plinthRadius, accentMaterial, plinthMaterial);
  }
  if (variant.id === "wallNiche") {
    return createWallNicheDetails(frame, bounds, floorY, plinthRadius, accentMaterial);
  }
  if (variant.id === "windowTable") {
    return createWindowTableDetails(
      frame,
      bounds,
      floorY,
      plinthRadius,
      accentMaterial,
      plinthMaterial
    );
  }
  return createRoundPlinthDetails(frame, floorY, accentMaterial);
}

function createRoundPlinthDetails(
  frame: StudioSceneFrame,
  floorY: number,
  material: THREE.Material
) {
  const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
  return [
    createBoxMesh({
      name: "studio-round-reflector",
      size: new THREE.Vector3(radius * 0.08, radius * 2.2, radius * 1.7),
      position: new THREE.Vector3(
        frame.center.x + radius * 2.35,
        floorY + radius * 1.1,
        frame.center.z + radius * 0.75
      ),
      material
    }),
    createBoxMesh({
      name: "studio-round-low-shelf",
      size: new THREE.Vector3(radius * 1.55, radius * 0.16, radius * 0.34),
      position: new THREE.Vector3(
        frame.center.x - radius * 1.55,
        floorY + radius * 0.08,
        frame.center.z - radius * 1.2
      ),
      material
    })
  ];
}

function createTieredStageDetails(
  frame: StudioSceneFrame,
  floorY: number,
  plinthRadius: number,
  accentMaterial: THREE.Material,
  plinthMaterial: THREE.Material
) {
  const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
  return [
    createBoxMesh({
      name: "studio-tiered-back-step",
      size: new THREE.Vector3(plinthRadius * 2.9, radius * 0.28, radius * 0.72),
      position: new THREE.Vector3(
        frame.center.x,
        floorY + radius * 0.14,
        frame.center.z - plinthRadius * 1.35
      ),
      material: plinthMaterial.clone()
    }),
    createBoxMesh({
      name: "studio-tiered-side-step-left",
      size: new THREE.Vector3(radius * 0.68, radius * 0.2, plinthRadius * 1.75),
      position: new THREE.Vector3(
        frame.center.x - plinthRadius * 1.45,
        floorY + radius * 0.1,
        frame.center.z + radius * 0.25
      ),
      material: accentMaterial.clone()
    }),
    createBoxMesh({
      name: "studio-tiered-side-step-right",
      size: new THREE.Vector3(radius * 0.5, radius * 0.14, plinthRadius * 1.25),
      position: new THREE.Vector3(
        frame.center.x + plinthRadius * 1.55,
        floorY + radius * 0.07,
        frame.center.z + radius * 0.1
      ),
      material: accentMaterial.clone()
    })
  ];
}

function createWallNicheDetails(
  frame: StudioSceneFrame,
  bounds: StudioRoomBounds,
  floorY: number,
  plinthRadius: number,
  material: THREE.Material
) {
  const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
  const nicheZ = bounds.backZ + radius * 0.04;
  const nicheY = floorY + Math.min(bounds.wallHeight * 0.5, radius * 2.1);
  const frameWidth = Math.max(plinthRadius * 2.6, radius * 2.4);
  const frameHeight = Math.max(radius * 2.4, frame.height * 1.35);
  const railThickness = radius * 0.12;

  return [
    createBoxMesh({
      name: "studio-niche-left-frame",
      size: new THREE.Vector3(railThickness, frameHeight, radius * 0.12),
      position: new THREE.Vector3(frame.center.x - frameWidth / 2, nicheY, nicheZ),
      material
    }),
    createBoxMesh({
      name: "studio-niche-right-frame",
      size: new THREE.Vector3(railThickness, frameHeight, radius * 0.12),
      position: new THREE.Vector3(frame.center.x + frameWidth / 2, nicheY, nicheZ),
      material: material.clone()
    }),
    createBoxMesh({
      name: "studio-niche-top-frame",
      size: new THREE.Vector3(frameWidth + railThickness, railThickness, radius * 0.12),
      position: new THREE.Vector3(frame.center.x, nicheY + frameHeight / 2, nicheZ),
      material: material.clone()
    }),
    createBoxMesh({
      name: "studio-niche-bottom-frame",
      size: new THREE.Vector3(frameWidth + railThickness, railThickness, radius * 0.12),
      position: new THREE.Vector3(frame.center.x, nicheY - frameHeight / 2, nicheZ),
      material: material.clone()
    }),
    createBoxMesh({
      name: "studio-niche-side-panel",
      size: new THREE.Vector3(radius * 0.08, frameHeight * 0.86, radius * 0.1),
      position: new THREE.Vector3(
        frame.center.x - frameWidth * 0.68,
        nicheY,
        nicheZ + radius * 0.04
      ),
      material: material.clone()
    })
  ];
}

function createWindowTableDetails(
  frame: StudioSceneFrame,
  bounds: StudioRoomBounds,
  floorY: number,
  plinthRadius: number,
  accentMaterial: THREE.Material,
  plinthMaterial: THREE.Material
) {
  const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
  const windowX = bounds.rightX - Math.max(radius * 0.55, 0.55);
  const windowY = floorY + Math.min(bounds.wallHeight * 0.55, radius * 2.15);
  const windowZ = frame.center.z - radius * 1.2;
  const glowMaterial = createEmissiveMaterial("#dceeff", 1.65);

  return [
    createPlaneMesh({
      name: "studio-window-glow",
      width: radius * 1.65,
      height: radius * 1.95,
      position: new THREE.Vector3(windowX, windowY, windowZ),
      rotation: new THREE.Euler(0, -Math.PI / 2, 0),
      material: glowMaterial
    }),
    createBoxMesh({
      name: "studio-window-vertical-frame",
      size: new THREE.Vector3(radius * 0.08, radius * 2.1, radius * 0.08),
      position: new THREE.Vector3(windowX - radius * 0.02, windowY, windowZ),
      material: accentMaterial.clone()
    }),
    createBoxMesh({
      name: "studio-window-horizontal-frame",
      size: new THREE.Vector3(radius * 0.08, radius * 0.08, radius * 1.9),
      position: new THREE.Vector3(windowX - radius * 0.02, windowY, windowZ),
      material: accentMaterial.clone()
    }),
    createBoxMesh({
      name: "studio-window-table",
      size: new THREE.Vector3(plinthRadius * 2.7, radius * 0.16, radius * 0.82),
      position: new THREE.Vector3(
        frame.center.x,
        floorY + radius * 0.08,
        frame.center.z + plinthRadius * 1.25
      ),
      material: plinthMaterial.clone()
    }),
    createCylinderMesh({
      name: "studio-window-side-plinth",
      radius: radius * 0.32,
      height: radius * 0.5,
      position: new THREE.Vector3(
        frame.center.x - plinthRadius * 1.35,
        floorY + radius * 0.25,
        frame.center.z - radius * 0.75
      ),
      material: accentMaterial.clone()
    })
  ];
}
