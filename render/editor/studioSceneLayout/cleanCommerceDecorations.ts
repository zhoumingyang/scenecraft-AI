import * as THREE from "three";

import type { Vec3Tuple } from "../core/types";
import type { StudioSceneStyleProfile } from "../studioSceneProfiles";
import { geometryToCustomMesh } from "../utils/geometry";
import { IDENTITY_QUATERNION } from "./descriptors";
import {
  createStudioLayoutMaterial,
  type StudioDecorationKind,
  type StudioLayoutBounds,
  type StudioLayoutMaterialDescriptor,
  type StudioLayoutMeshDescriptor,
  type StudioLayoutMeshGeometryDescriptor,
  type StudioLayoutTargetFrame
} from "./types";

type CleanCommerceDecorationInput = {
  styleProfile: StudioSceneStyleProfile;
  bounds: StudioLayoutBounds;
  plinthTopY: number;
  targetFrame: StudioLayoutTargetFrame;
};

type CleanCommerceDecorationSpec = {
  kind: StudioDecorationKind;
  label: string;
  geometry: StudioLayoutMeshGeometryDescriptor;
  material: StudioLayoutMaterialDescriptor;
  position: Vec3Tuple;
  scale: Vec3Tuple;
  rotation?: Vec3Tuple;
};

function customGeometry(geometry: THREE.BufferGeometry): StudioLayoutMeshGeometryDescriptor {
  const customMesh = geometryToCustomMesh(geometry);
  geometry.dispose();
  return { mode: "custom", geometry: customMesh };
}

function createCrystalBlockGeometry() {
  const geometry = new THREE.OctahedronGeometry(0.8, 1);
  geometry.scale(1.45, 0.34, 0.52);
  geometry.rotateZ(Math.PI / 4);
  geometry.computeVertexNormals();
  return geometry;
}

function createThinRingGeometry() {
  const geometry = new THREE.TorusGeometry(1, 0.035, 16, 128);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function createMaterial(input: {
  color: string;
  opacity: number;
  roughness: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}) {
  return createStudioLayoutMaterial({
    color: input.color,
    opacity: input.opacity,
    roughness: input.roughness,
    metalness: input.metalness ?? 0,
    emissive: input.emissive ?? "#000000",
    emissiveIntensity: input.emissiveIntensity ?? 0
  });
}

function quaternionFromEuler(rotation: Vec3Tuple = [0, 0, 0]): [number, number, number, number] {
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rotation[0], rotation[1], rotation[2], "XYZ")
  );
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
}

function createDescriptor(
  spec: CleanCommerceDecorationSpec,
  index: number
): StudioLayoutMeshDescriptor {
  return {
    kind: "mesh",
    role: "decoration",
    subRole: "decoration",
    label: spec.label,
    geometry: spec.geometry,
    material: spec.material,
    position: spec.position,
    quaternion: spec.rotation ? quaternionFromEuler(spec.rotation) : IDENTITY_QUATERNION,
    scale: spec.scale,
    visible: true,
    locked: false,
    allowDelete: true,
    allowHide: true,
    resetKey: `decoration:${index}:${spec.kind}`,
    decorationKind: spec.kind
  };
}

export function createCleanCommerceDecorationDescriptors(
  input: CleanCommerceDecorationInput
): StudioLayoutMeshDescriptor[] {
  const { bounds, plinthTopY, targetFrame } = input;
  const radius = bounds.radius;
  const [centerX] = bounds.center;
  const productBackZ = targetFrame.center[2] - radius * 0.48;
  const ringZ = Math.max(bounds.backZ + radius * 0.38, productBackZ - radius * 0.54);
  const sideDepthZ = Math.max(bounds.backZ + radius * 0.56, productBackZ - radius * 0.26);
  const lowBackZ = Math.max(bounds.backZ + radius * 0.72, productBackZ - radius * 0.14);

  const specs: CleanCommerceDecorationSpec[] = [
    {
      kind: "luminousRingBackdrop",
      label: "Studio Luminous Ring Backdrop",
      geometry: customGeometry(createThinRingGeometry()),
      material: createMaterial({
        color: "#ffffff",
        opacity: 0.96,
        roughness: 0.12,
        emissive: "#ffffff",
        emissiveIntensity: 1.85
      }),
      position: [centerX, plinthTopY + radius * 1.02, ringZ],
      scale: [radius * 2.15, radius * 2.15, radius * 2.15],
      rotation: [0, 0, 0]
    },
    {
      kind: "transparentAcrylicCube",
      label: "Studio Transparent Acrylic Cube",
      geometry: { mode: "builtin", geometryName: "Box" },
      material: createMaterial({
        color: "#dceeff",
        opacity: 0.24,
        roughness: 0.06,
        emissive: "#f6fbff",
        emissiveIntensity: 0.08
      }),
      position: [centerX - radius * 1.28, plinthTopY + radius * 0.92, sideDepthZ],
      scale: [radius * 0.86, radius * 0.86, radius * 0.86],
      rotation: [0.04, 0.2, -0.02]
    },
    {
      kind: "frostedGlassSphere",
      label: "Studio Frosted Glass Sphere",
      geometry: { mode: "builtin", geometryName: "Sphere" },
      material: createMaterial({
        color: "#edf5fb",
        opacity: 0.42,
        roughness: 0.72,
        emissive: "#f8fbff",
        emissiveIntensity: 0.05
      }),
      position: [centerX + radius * 1.32, plinthTopY + radius * 0.68, sideDepthZ + radius * 0.06],
      scale: [radius * 0.52, radius * 0.52, radius * 0.52]
    },
    {
      kind: "cutCrystalBlock",
      label: "Studio Cut Crystal Block",
      geometry: customGeometry(createCrystalBlockGeometry()),
      material: createMaterial({
        color: "#eaf7ff",
        opacity: 0.52,
        roughness: 0.03,
        emissive: "#eff9ff",
        emissiveIntensity: 0.06
      }),
      position: [centerX, plinthTopY + radius * 0.18, lowBackZ],
      scale: [radius * 1.18, radius * 1.18, radius * 1.18],
      rotation: [0.02, -0.18, 0]
    }
  ];

  return specs.map((spec, index) => createDescriptor(spec, index));
}
