import * as THREE from "three";

import { geometryToCustomMesh } from "../utils/geometry";
import { createBoxDescriptor, IDENTITY_QUATERNION } from "./descriptors";
import {
  createStudioLayoutBounds,
  createStudioLayoutMaterial,
  type StudioLayoutBounds,
  type StudioLayoutGeneratorInput,
  type StudioLayoutMeshDescriptor
} from "./types";

function pushQuad(
  positions: number[],
  indices: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  d: THREE.Vector3
) {
  const index = positions.length / 3;
  positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
  indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
}

function createCoveGeometry(bounds: StudioLayoutBounds, cornerRadiusRatio: number) {
  const [centerX, , centerZ] = bounds.center;
  const halfWidth = bounds.width * 0.48;
  const halfDepth = bounds.depth * 0.48;
  const radius = Math.max(bounds.radius * Math.max(cornerRadiusRatio, 0.08), 0.18);
  const segments = 12;
  const positions: number[] = [];
  const indices: number[] = [];
  const floorFrontZ = centerZ + halfDepth;
  const floorBackZ = bounds.backZ + radius;
  const wallTopY = bounds.floorY + bounds.wallHeight;
  const leftX = bounds.leftX + radius;
  const rightX = bounds.rightX - radius;

  pushQuad(
    positions,
    indices,
    new THREE.Vector3(centerX - halfWidth, bounds.floorY, floorFrontZ),
    new THREE.Vector3(centerX + halfWidth, bounds.floorY, floorFrontZ),
    new THREE.Vector3(centerX + halfWidth, bounds.floorY, floorBackZ),
    new THREE.Vector3(centerX - halfWidth, bounds.floorY, floorBackZ)
  );
  pushQuad(
    positions,
    indices,
    new THREE.Vector3(centerX - halfWidth, bounds.floorY + radius, bounds.backZ),
    new THREE.Vector3(centerX + halfWidth, bounds.floorY + radius, bounds.backZ),
    new THREE.Vector3(centerX + halfWidth, wallTopY, bounds.backZ),
    new THREE.Vector3(centerX - halfWidth, wallTopY, bounds.backZ)
  );
  pushQuad(
    positions,
    indices,
    new THREE.Vector3(bounds.leftX, bounds.floorY, floorFrontZ),
    new THREE.Vector3(leftX, bounds.floorY, floorFrontZ),
    new THREE.Vector3(leftX, bounds.floorY, bounds.backZ),
    new THREE.Vector3(bounds.leftX, bounds.floorY + radius, bounds.backZ)
  );
  pushQuad(
    positions,
    indices,
    new THREE.Vector3(rightX, bounds.floorY, floorFrontZ),
    new THREE.Vector3(bounds.rightX, bounds.floorY, floorFrontZ),
    new THREE.Vector3(bounds.rightX, bounds.floorY + radius, bounds.backZ),
    new THREE.Vector3(rightX, bounds.floorY, bounds.backZ)
  );

  for (let index = 0; index < segments; index += 1) {
    const a0 = (index / segments) * Math.PI * 0.5;
    const a1 = ((index + 1) / segments) * Math.PI * 0.5;
    const y0 = bounds.floorY + Math.sin(a0) * radius;
    const y1 = bounds.floorY + Math.sin(a1) * radius;
    const z0 = bounds.backZ + Math.cos(a0) * radius;
    const z1 = bounds.backZ + Math.cos(a1) * radius;
    pushQuad(
      positions,
      indices,
      new THREE.Vector3(centerX - halfWidth, y0, z0),
      new THREE.Vector3(centerX + halfWidth, y0, z0),
      new THREE.Vector3(centerX + halfWidth, y1, z1),
      new THREE.Vector3(centerX - halfWidth, y1, z1)
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createStudioBackgroundDescriptors(input: StudioLayoutGeneratorInput): {
  bounds: StudioLayoutBounds;
  descriptors: StudioLayoutMeshDescriptor[];
} {
  const bounds = createStudioLayoutBounds(input);
  const { background } = input.styleProfile.layout;
  const floorMaterial = createStudioLayoutMaterial(input.styleProfile.materials.surfaces.floor);
  const wallMaterial = createStudioLayoutMaterial(input.styleProfile.materials.surfaces.wall);
  const backgroundMaterial = createStudioLayoutMaterial(
    input.styleProfile.materials.surfaces.background
  );
  const wallThickness = Math.max(bounds.radius * 0.04, 0.05);
  const [centerX, , centerZ] = bounds.center;

  if (background.type === "coveStudio") {
    const geometry = createCoveGeometry(bounds, background.cornerRadiusRatio);
    const customMesh = geometryToCustomMesh(geometry);
    geometry.dispose();
    return {
      bounds,
      descriptors: [
        {
          kind: "mesh",
          role: "cove",
          subRole: "cove",
          label: "Studio Cove",
          geometry: { mode: "custom", geometry: customMesh },
          material: backgroundMaterial,
          position: [0, 0, 0],
          quaternion: IDENTITY_QUATERNION,
          scale: [1, 1, 1],
          visible: true,
          locked: false,
          allowDelete: false,
          allowHide: true,
          resetKey: "background:cove"
        }
      ]
    };
  }

  const descriptors: StudioLayoutMeshDescriptor[] = [
    createBoxDescriptor({
      role: "floor",
      subRole: "floor",
      label: "Studio Floor",
      material: floorMaterial,
      position: [centerX, bounds.floorY - wallThickness / 2, centerZ],
      scale: [bounds.width, wallThickness, bounds.depth],
      resetKey: "background:floor"
    }),
    createBoxDescriptor({
      role: "backWall",
      subRole: "backWall",
      label: "Studio Back Wall",
      material: wallMaterial,
      position: [centerX, bounds.floorY + bounds.wallHeight / 2, bounds.backZ],
      scale: [bounds.width, bounds.wallHeight, wallThickness],
      resetKey: "background:backWall"
    })
  ];

  if (background.type !== "galleryWall") {
    descriptors.push(
      createBoxDescriptor({
        role: "sideWall",
        subRole: "leftWall",
        label: "Studio Left Wall",
        material: wallMaterial,
        position: [bounds.leftX, bounds.floorY + bounds.wallHeight / 2, centerZ],
        scale: [wallThickness, bounds.wallHeight, bounds.depth],
        resetKey: "background:leftWall"
      })
    );
  }

  if (background.type === "minimalBox") {
    descriptors.push(
      createBoxDescriptor({
        role: "sideWall",
        subRole: "rightWall",
        label: "Studio Right Wall",
        material: wallMaterial,
        position: [bounds.rightX, bounds.floorY + bounds.wallHeight / 2, centerZ],
        scale: [wallThickness, bounds.wallHeight, bounds.depth],
        resetKey: "background:rightWall"
      })
    );
  }

  return { bounds, descriptors };
}
