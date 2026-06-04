import * as THREE from "three";

import type { Vec3Tuple } from "../core/types";
import type { StudioSceneStyleProfile } from "../studioSceneProfiles";
import { geometryToCustomMesh } from "../utils/geometry";
import { IDENTITY_QUATERNION } from "./descriptors";
import { createExtrudedPlinthGeometry } from "./plinth";
import {
  createStudioLayoutMaterial,
  type StudioDecorationKind,
  type StudioLayoutBounds,
  type StudioLayoutGeneratorInput,
  type StudioLayoutMeshDescriptor,
  type StudioLayoutMeshGeometryDescriptor
} from "./types";

function createSemiDiscGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-1, 0);
  for (let index = 0; index <= 24; index += 1) {
    const angle = Math.PI - (index / 24) * Math.PI;
    shape.lineTo(Math.cos(angle), Math.sin(angle));
  }
  shape.lineTo(1, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 24
  });
  geometry.center();
  return geometry;
}

function createArchGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-1, -1);
  shape.lineTo(-1, 0);
  shape.absarc(0, 0, 1, Math.PI, 0, true);
  shape.lineTo(1, -1);
  shape.lineTo(0.62, -1);
  shape.lineTo(0.62, 0);
  shape.absarc(0, 0, 0.62, 0, Math.PI, false);
  shape.lineTo(-0.62, -1);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 24
  });
  geometry.center();
  return geometry;
}

function createBentPanelGeometry(wave = false) {
  const widthSegments = 18;
  const heightSegments = 4;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let yIndex = 0; yIndex <= heightSegments; yIndex += 1) {
    const y = yIndex / heightSegments;
    for (let xIndex = 0; xIndex <= widthSegments; xIndex += 1) {
      const u = xIndex / widthSegments;
      const x = u - 0.5;
      const bend = wave ? Math.sin(u * Math.PI * 2) * 0.16 : Math.sin((u - 0.5) * Math.PI) * 0.22;
      positions.push(x, y - 0.5, bend);
    }
  }
  const stride = widthSegments + 1;
  for (let yIndex = 0; yIndex < heightSegments; yIndex += 1) {
    for (let xIndex = 0; xIndex < widthSegments; xIndex += 1) {
      const a = yIndex * stride + xIndex;
      const b = a + 1;
      const c = a + stride + 1;
      const d = a + stride;
      indices.push(a, b, c, a, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createDecorationGeometry(kind: StudioDecorationKind): StudioLayoutMeshGeometryDescriptor {
  if (kind === "sphere") return { mode: "builtin", geometryName: "Sphere" };
  if (kind === "cylinder") return { mode: "builtin", geometryName: "Cylinder" };
  if (kind === "ring") return { mode: "builtin", geometryName: "Torus" };
  if (kind === "box" || kind === "verticalPanel") return { mode: "builtin", geometryName: "Box" };
  if (kind === "floatingGeometry") return { mode: "builtin", geometryName: "Icosahedron" };

  const geometry =
    kind === "roundedBox"
      ? createExtrudedPlinthGeometry("roundedBox")
      : kind === "arch"
        ? createArchGeometry()
        : kind === "semiDisc"
          ? createSemiDiscGeometry()
          : kind === "curvedPanel"
            ? createBentPanelGeometry(false)
            : kind === "wavePanel"
              ? createBentPanelGeometry(true)
              : createExtrudedPlinthGeometry("extrudedShape");
  const customMesh = geometryToCustomMesh(geometry);
  geometry.dispose();
  return { mode: "custom", geometry: customMesh };
}

function getDefaultDecorationKinds(input: StudioLayoutGeneratorInput): StudioDecorationKind[] {
  if (input.styleProfile.layout.decorations.length > 0) {
    return input.styleProfile.layout.decorations.flatMap((decoration) =>
      Array.from({ length: Math.max(1, decoration.count) }, () => decoration.role)
    );
  }
  if (input.productProfile.productType === "beauty" || input.productProfile.productType === "jewelry") {
    return ["arch", "sphere", "cylinder"];
  }
  if (input.productProfile.productType === "tech" || input.productProfile.material === "metallic") {
    return ["ring", "verticalPanel"];
  }
  if (input.productProfile.productType === "toy" || input.styleProfile.id === "playfulBright") {
    return ["sphere", "ring", "floatingGeometry", "box"];
  }
  if (input.styleProfile.id === "galleryNeutral") {
    return ["arch", "semiDisc"];
  }
  if (input.styleProfile.id === "warmLifestyle") {
    return ["curvedPanel", "cylinder", "roundedBox"];
  }
  return ["verticalPanel", "sphere"];
}

export function getStudioDecorationScale(kind: StudioDecorationKind, radius: number): Vec3Tuple {
  if (kind === "sphere") return [radius * 0.42, radius * 0.42, radius * 0.42];
  if (kind === "cylinder") return [radius * 0.38, radius * 0.74, radius * 0.38];
  if (kind === "ring") return [radius * 0.72, radius * 0.72, radius * 0.72];
  if (kind === "box") return [radius * 0.52, radius * 0.52, radius * 0.52];
  if (kind === "roundedBox") return [radius * 0.7, radius * 0.4, radius * 0.52];
  if (kind === "arch") return [radius * 1.1, radius * 1.2, radius * 0.7];
  if (kind === "semiDisc") return [radius * 0.92, radius * 0.72, radius * 0.45];
  if (kind === "verticalPanel") return [radius * 0.16, radius * 1.25, radius * 0.08];
  if (kind === "curvedPanel" || kind === "wavePanel") return [radius * 1.2, radius * 1.0, radius * 0.8];
  if (kind === "floatingGeometry") return [radius * 0.42, radius * 0.42, radius * 0.42];
  return [radius * 0.72, radius * 0.4, radius * 0.72];
}

export function createStudioDecorationDescriptorForKind(input: {
  styleProfile: StudioSceneStyleProfile;
  kind: StudioDecorationKind;
  index: number;
  position: Vec3Tuple;
  scale: Vec3Tuple;
}): StudioLayoutMeshDescriptor {
  return {
    kind: "mesh",
    role: "decoration",
    subRole: "decoration",
    label: `Studio ${input.kind}`,
    geometry: createDecorationGeometry(input.kind),
    material: createStudioLayoutMaterial(input.styleProfile.materials.surfaces.decoration),
    position: input.position,
    quaternion: IDENTITY_QUATERNION,
    scale: input.scale,
    visible: true,
    locked: false,
    allowDelete: true,
    allowHide: true,
    resetKey: `decoration:${input.index}:${input.kind}`,
    decorationKind: input.kind
  };
}

export function createStudioDecorationDescriptors(
  input: StudioLayoutGeneratorInput & {
    bounds: StudioLayoutBounds;
    plinthTopY: number;
  }
): StudioLayoutMeshDescriptor[] {
  const kinds = getDefaultDecorationKinds(input).slice(0, 5);
  const [centerX, , centerZ] = input.bounds.center;
  const positions: Vec3Tuple[] = [
    [centerX - input.bounds.width * 0.27, input.plinthTopY + input.bounds.radius * 0.42, input.bounds.backZ + input.bounds.radius * 0.18],
    [centerX + input.bounds.width * 0.24, input.plinthTopY + input.bounds.radius * 0.32, input.bounds.backZ + input.bounds.radius * 0.32],
    [input.bounds.leftX + input.bounds.radius * 0.42, input.plinthTopY + input.bounds.radius * 0.5, centerZ + input.bounds.depth * 0.08],
    [input.bounds.rightX - input.bounds.radius * 0.42, input.plinthTopY + input.bounds.radius * 0.64, centerZ - input.bounds.depth * 0.05],
    [centerX, input.plinthTopY + input.bounds.radius * 1.1, input.bounds.backZ + input.bounds.radius * 0.5]
  ];

  return kinds.map((kind, index) =>
    createStudioDecorationDescriptorForKind({
      styleProfile: input.styleProfile,
      kind,
      index,
      position: positions[index],
      scale: getStudioDecorationScale(kind, input.bounds.radius)
    })
  );
}
