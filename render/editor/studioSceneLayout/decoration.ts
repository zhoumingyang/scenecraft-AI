import * as THREE from "three";

import type { Vec3Tuple } from "../core/types";
import type { PbrSurfaceConfig, StudioSceneStyleProfile } from "../studioSceneProfiles";
import {
  createExtrudedShapePresetGeometry,
  geometryToCustomMesh
} from "../utils/geometry";
import { IDENTITY_QUATERNION } from "./descriptors";
import { createExtrudedPlinthGeometry } from "./plinth";
import {
  createStudioLayoutMaterial,
  type StudioDecorationKind,
  type StudioLayoutBounds,
  type StudioLayoutGeneratorInput,
  type StudioLayoutMaterialDescriptor,
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

function quaternionFromEuler(x = 0, y = 0, z = 0): [number, number, number, number] {
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
}

function mergeBufferGeometries(geometries: THREE.BufferGeometry[]) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  geometries.forEach((geometry) => {
    if (!geometry.getAttribute("normal")) {
      geometry.computeVertexNormals();
    }
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const uv = geometry.getAttribute("uv");
    if (!position) {
      geometry.dispose();
      return;
    }

    for (let index = 0; index < position.count; index += 1) {
      positions.push(position.getX(index), position.getY(index), position.getZ(index));
      if (normal) {
        normals.push(normal.getX(index), normal.getY(index), normal.getZ(index));
      } else {
        normals.push(0, 1, 0);
      }
      if (uv) {
        uvs.push(uv.getX(index), uv.getY(index));
      } else {
        uvs.push(0, 0);
      }
    }

    const sourceIndex = geometry.getIndex();
    if (sourceIndex) {
      for (let index = 0; index < sourceIndex.count; index += 1) {
        indices.push(sourceIndex.getX(index) + vertexOffset);
      }
    } else {
      for (let index = 0; index < position.count; index += 1) {
        indices.push(index + vertexOffset);
      }
    }

    vertexOffset += position.count;
    geometry.dispose();
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createLayeredArchGeometry() {
  const outer = new THREE.Shape();
  outer.moveTo(-1, -1);
  outer.lineTo(-1, 0);
  outer.absarc(0, 0, 1, Math.PI, 0, true);
  outer.lineTo(1, -1);
  outer.lineTo(0.76, -1);
  outer.lineTo(0.76, -0.04);
  outer.absarc(0, -0.04, 0.76, 0, Math.PI, false);
  outer.lineTo(-0.76, -1);
  outer.closePath();

  const notch = new THREE.Path();
  notch.moveTo(-0.36, -1);
  notch.lineTo(-0.2, -1);
  notch.lineTo(-0.2, -0.08);
  notch.lineTo(-0.36, -0.08);
  notch.closePath();
  outer.holes.push(notch);

  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth: 0.14,
    steps: 1,
    bevelEnabled: true,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    curveSegments: 28
  });
  geometry.center();
  return geometry;
}

function createSculpturalLoopGeometry() {
  const curve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-0.78, -0.08, 0),
      new THREE.Vector3(-0.35, 0.75, 0.28),
      new THREE.Vector3(0.38, 0.58, -0.2),
      new THREE.Vector3(0.74, -0.04, 0.12),
      new THREE.Vector3(0.12, -0.68, -0.28),
      new THREE.Vector3(-0.65, -0.45, 0.08)
    ],
    true
  );
  const loop = new THREE.TubeGeometry(curve, 96, 0.07, 14, true);
  const base = new THREE.CylinderGeometry(0.42, 0.54, 0.12, 64);
  base.translate(0, -0.72, 0);
  return mergeBufferGeometries([loop, base]);
}

function createRibbonPanelGeometry() {
  const widthSegments = 28;
  const heightSegments = 8;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let yIndex = 0; yIndex <= heightSegments; yIndex += 1) {
    const v = yIndex / heightSegments;
    for (let xIndex = 0; xIndex <= widthSegments; xIndex += 1) {
      const u = xIndex / widthSegments;
      const x = u - 0.5;
      const y = v - 0.5;
      const twist = Math.sin((u * 1.65 + v * 0.28) * Math.PI * 2) * 0.18;
      const taper = 0.72 + Math.sin(v * Math.PI) * 0.28;
      positions.push(x * taper, y, twist);
      uvs.push(u, v);
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
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createFoldedScreenGeometry() {
  const panels = 4;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const panelWidth = 0.34;
  const halfHeight = 0.55;

  for (let panelIndex = 0; panelIndex < panels; panelIndex += 1) {
    const x0 = (panelIndex - panels / 2) * panelWidth;
    const x1 = x0 + panelWidth;
    const z0 = panelIndex % 2 === 0 ? -0.1 : 0.1;
    const z1 = panelIndex % 2 === 0 ? 0.1 : -0.1;
    const base = positions.length / 3;
    positions.push(x0, -halfHeight, z0, x1, -halfHeight, z1, x1, halfHeight, z1, x0, halfHeight, z0);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.center();
  return geometry;
}

function createSteppedTotemGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.42, -1);
  shape.lineTo(0.42, -1);
  shape.lineTo(0.42, -0.5);
  shape.lineTo(0.26, -0.5);
  shape.lineTo(0.26, 0.05);
  shape.lineTo(0.48, 0.05);
  shape.lineTo(0.48, 0.46);
  shape.lineTo(0.12, 0.46);
  shape.lineTo(0.12, 1);
  shape.lineTo(-0.28, 1);
  shape.lineTo(-0.28, 0.56);
  shape.lineTo(-0.5, 0.56);
  shape.lineTo(-0.5, -0.08);
  shape.lineTo(-0.24, -0.08);
  shape.lineTo(-0.24, -0.56);
  shape.lineTo(-0.42, -0.56);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.2,
    steps: 1,
    bevelEnabled: true,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    curveSegments: 4
  });
  geometry.center();
  return geometry;
}

function createOrganicShardGeometry() {
  const geometry = createExtrudedShapePresetGeometry("wing", 0.12, true);
  geometry.rotateZ(-0.18);
  geometry.center();
  return geometry;
}

function createOrbitClusterGeometry() {
  const ringA = new THREE.TorusGeometry(0.7, 0.035, 12, 72);
  ringA.rotateX(Math.PI / 2);
  const ringB = new THREE.TorusGeometry(0.48, 0.03, 10, 56);
  ringB.rotateY(Math.PI / 3);
  ringB.rotateZ(Math.PI / 8);
  const nodeA = new THREE.SphereGeometry(0.12, 18, 12);
  nodeA.translate(0.7, 0, 0);
  const nodeB = new THREE.SphereGeometry(0.09, 18, 12);
  nodeB.translate(-0.34, 0.42, 0.12);
  const nodeC = new THREE.IcosahedronGeometry(0.12, 1);
  nodeC.translate(0.18, -0.5, -0.18);
  const geometry = mergeBufferGeometries([ringA, ringB, nodeA, nodeB, nodeC]);
  geometry.center();
  return geometry;
}

function createModularBlocksGeometry() {
  const blocks = [
    { size: [0.55, 0.24, 0.38], position: [-0.28, -0.28, 0] },
    { size: [0.34, 0.46, 0.34], position: [0.23, -0.17, -0.04] },
    { size: [0.4, 0.16, 0.3], position: [0.03, 0.16, 0.06] },
    { size: [0.22, 0.32, 0.24], position: [0.5, -0.24, 0.08] }
  ];
  const geometries = blocks.map((block) => {
    const geometry = new THREE.BoxGeometry(block.size[0], block.size[1], block.size[2]);
    geometry.translate(block.position[0], block.position[1], block.position[2]);
    return geometry;
  });
  const geometry = mergeBufferGeometries(geometries);
  geometry.center();
  return geometry;
}

function createDecorationGeometry(kind: StudioDecorationKind): StudioLayoutMeshGeometryDescriptor {
  if (kind === "sphere") return { mode: "builtin", geometryName: "Sphere" };
  if (kind === "cylinder") return { mode: "builtin", geometryName: "Cylinder" };
  if (kind === "ring") return { mode: "builtin", geometryName: "Torus" };
  if (kind === "box" || kind === "verticalPanel") return { mode: "builtin", geometryName: "Box" };
  if (kind === "floatingGeometry") return { mode: "builtin", geometryName: "Icosahedron" };

  const geometry =
    kind === "sculpturalLoop"
      ? createSculpturalLoopGeometry()
      : kind === "ribbonPanel"
        ? createRibbonPanelGeometry()
        : kind === "steppedTotem"
          ? createSteppedTotemGeometry()
          : kind === "foldedScreen"
            ? createFoldedScreenGeometry()
            : kind === "layeredArch"
              ? createLayeredArchGeometry()
              : kind === "orbitCluster"
                ? createOrbitClusterGeometry()
                : kind === "organicShard"
                  ? createOrganicShardGeometry()
                  : kind === "modularBlocks"
                    ? createModularBlocksGeometry()
                    : kind === "roundedBox"
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
  if (input.styleProfile.id === "cleanCommerce") {
    return ["box", "sphere", "floatingGeometry"];
  }
  if (input.productProfile.productType === "beauty" || input.productProfile.productType === "jewelry") {
    return ["sculpturalLoop", "ribbonPanel", "organicShard", "semiDisc"];
  }
  if (input.productProfile.productType === "tech" || input.productProfile.material === "metallic") {
    return ["orbitCluster", "steppedTotem", "ribbonPanel"];
  }
  if (input.productProfile.productType === "toy" || input.styleProfile.id === "playfulBright") {
    return ["orbitCluster", "ribbonPanel", "modularBlocks", "organicShard", "floatingGeometry"];
  }
  if (input.styleProfile.id === "galleryNeutral") {
    return ["layeredArch", "sculpturalLoop", "steppedTotem"];
  }
  if (input.styleProfile.id === "warmLifestyle") {
    return ["foldedScreen", "modularBlocks", "organicShard", "roundedBox"];
  }
  if (input.styleProfile.id === "premiumBeauty") {
    return ["sculpturalLoop", "ribbonPanel", "organicShard", "semiDisc"];
  }
  if (input.styleProfile.id === "darkTech") {
    return ["orbitCluster", "steppedTotem", "ribbonPanel"];
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
  if (kind === "sculpturalLoop") return [radius * 0.78, radius * 0.78, radius * 0.78];
  if (kind === "ribbonPanel") return [radius * 1.16, radius * 1.18, radius * 0.9];
  if (kind === "steppedTotem") return [radius * 0.82, radius * 1.04, radius * 0.62];
  if (kind === "foldedScreen") return [radius * 1.3, radius * 1.0, radius * 0.82];
  if (kind === "layeredArch") return [radius * 1.18, radius * 1.28, radius * 0.72];
  if (kind === "orbitCluster") return [radius * 0.76, radius * 0.76, radius * 0.76];
  if (kind === "organicShard") return [radius * 0.95, radius * 0.76, radius * 0.55];
  if (kind === "modularBlocks") return [radius * 1.1, radius * 0.88, radius * 0.92];
  return [radius * 0.72, radius * 0.4, radius * 0.72];
}

function getCleanCommerceDecorationScale(kind: StudioDecorationKind, radius: number, index: number): Vec3Tuple {
  if (index === 0 && kind === "box") {
    return [radius * 0.62, radius * 0.62, radius * 0.62];
  }
  if (index === 1 && kind === "sphere") {
    return [radius * 0.5, radius * 0.5, radius * 0.5];
  }
  if (index === 2 && kind === "floatingGeometry") {
    return [radius * 1.05, radius * 0.42, radius * 0.42];
  }
  return getStudioDecorationScale(kind, radius);
}

function getStudioDecorationScaleForStyle(input: {
  kind: StudioDecorationKind;
  radius: number;
  styleProfile: StudioSceneStyleProfile;
  index: number;
}): Vec3Tuple {
  if (input.styleProfile.id === "cleanCommerce") {
    return getCleanCommerceDecorationScale(input.kind, input.radius, input.index);
  }
  return getStudioDecorationScale(input.kind, input.radius);
}

export function createStudioDecorationDescriptorForKind(input: {
  styleProfile: StudioSceneStyleProfile;
  kind: StudioDecorationKind;
  index: number;
  position: Vec3Tuple;
  scale: Vec3Tuple;
  quaternion?: [number, number, number, number];
  material?: StudioLayoutMaterialDescriptor;
}): StudioLayoutMeshDescriptor {
  return {
    kind: "mesh",
    role: "decoration",
    subRole: "decoration",
    label: `Studio ${input.kind}`,
    geometry: createDecorationGeometry(input.kind),
    material:
      input.material ??
      createStudioLayoutMaterial(input.styleProfile.materials.surfaces.decoration),
    position: input.position,
    quaternion: input.quaternion ?? IDENTITY_QUATERNION,
    scale: input.scale,
    visible: true,
    locked: false,
    allowDelete: true,
    allowHide: true,
    resetKey: `decoration:${input.index}:${input.kind}`,
    decorationKind: input.kind
  };
}

function createDecorationMaterialFromSurface(
  base: PbrSurfaceConfig,
  patch: Partial<PbrSurfaceConfig>
): StudioLayoutMaterialDescriptor {
  return createStudioLayoutMaterial({
    ...base,
    ...patch
  });
}

function createCleanCommerceDecorationMaterial(
  styleProfile: StudioSceneStyleProfile,
  index: number
): StudioLayoutMaterialDescriptor | undefined {
  const base = styleProfile.materials.surfaces.decoration;
  if (index === 0) {
    return createDecorationMaterialFromSurface(base, {
      color: "#dcecff",
      roughness: 0.08,
      metalness: 0,
      emissive: "#f3faff",
      emissiveIntensity: 0.04,
      opacity: 0.34,
      clearcoat: 0.38,
      clearcoatRoughness: 0.18,
      specularIntensity: 0.72
    });
  }
  if (index === 1) {
    return createDecorationMaterialFromSurface(base, {
      color: "#edf3f8",
      roughness: 0.9,
      metalness: 0,
      emissive: "#f9fcff",
      emissiveIntensity: 0.03,
      opacity: 0.62,
      clearcoat: 0.04,
      clearcoatRoughness: 0.78,
      sheen: 0.12
    });
  }
  if (index === 2) {
    return createDecorationMaterialFromSurface(base, {
      color: "#d5eaff",
      roughness: 0.14,
      metalness: 0,
      emissive: "#edf8ff",
      emissiveIntensity: 0.06,
      opacity: 0.48,
      clearcoat: 0.32,
      clearcoatRoughness: 0.22,
      specularIntensity: 0.68
    });
  }
  return undefined;
}

function createStudioDecorationPlacement(input: {
  bounds: StudioLayoutBounds;
  plinthTopY: number;
  styleProfile: StudioSceneStyleProfile;
  index: number;
}): {
  position: Vec3Tuple;
  quaternion: [number, number, number, number];
} {
  const { bounds, index, plinthTopY, styleProfile } = input;
  const [centerX, , centerZ] = bounds.center;
  const radius = bounds.radius;
  const backZ = bounds.backZ + radius * 0.72;
  const leftX = bounds.leftX + radius * 0.76;
  const rightX = bounds.rightX - radius * 0.76;
  const y = (amount: number) => plinthTopY + radius * amount;

  const fallback = [
    { position: [centerX - bounds.width * 0.27, y(0.42), backZ], rotation: [0, 0.08, 0] },
    { position: [centerX + bounds.width * 0.24, y(0.32), backZ + radius * 0.12], rotation: [0, -0.12, 0] },
    { position: [leftX, y(0.5), centerZ + bounds.depth * 0.08], rotation: [0, Math.PI / 2.25, 0] },
    { position: [rightX, y(0.64), centerZ - bounds.depth * 0.05], rotation: [0, -Math.PI / 2.25, 0] },
    { position: [centerX, y(1.1), backZ], rotation: [0, 0, 0] }
  ] satisfies Array<{ position: Vec3Tuple; rotation: Vec3Tuple }>;

  const placementsByStyle: Partial<
    Record<StudioSceneStyleProfile["id"], Array<{ position: Vec3Tuple; rotation: Vec3Tuple }>>
  > = {
    cleanCommerce: [
      { position: [centerX - radius * 1.12, y(0.92), centerZ - radius * 0.46], rotation: [0.02, 0.18, -0.04] },
      { position: [centerX + radius * 1.08, y(0.7), centerZ - radius * 0.42], rotation: [0, -0.1, 0] },
      { position: [centerX, y(0.24), centerZ - radius * 0.36], rotation: [0.1, Math.PI / 4, 0.22] }
    ],
    premiumBeauty: [
      { position: [centerX + bounds.width * 0.2, y(0.66), backZ + radius * 0.06], rotation: [0.05, -0.22, -0.08] },
      { position: [leftX, y(0.68), centerZ - radius * 0.08], rotation: [0, Math.PI / 2.32, 0.04] },
      { position: [centerX - bounds.width * 0.2, y(0.22), backZ + radius * 0.28], rotation: [0, 0.24, -0.22] },
      { position: [rightX, y(0.24), centerZ + radius * 0.18], rotation: [0, -Math.PI / 2.45, 0] }
    ],
    darkTech: [
      { position: [centerX - bounds.width * 0.16, y(0.95), backZ + radius * 0.08], rotation: [0.34, -0.22, 0.18] },
      { position: [rightX, y(0.72), centerZ - radius * 0.18], rotation: [0, -Math.PI / 2.18, 0] },
      { position: [leftX, y(0.7), centerZ - radius * 0.08], rotation: [0, Math.PI / 2.28, 0.08] }
    ],
    warmLifestyle: [
      { position: [leftX, y(0.64), centerZ - radius * 0.04], rotation: [0, Math.PI / 2.18, 0] },
      { position: [centerX + bounds.width * 0.2, y(0.16), backZ + radius * 0.26], rotation: [0, -0.18, 0] },
      { position: [rightX, y(0.24), centerZ + radius * 0.16], rotation: [0, -Math.PI / 2.5, -0.18] },
      { position: [centerX - bounds.width * 0.18, y(0.22), backZ + radius * 0.1], rotation: [0, 0.18, 0] }
    ],
    galleryNeutral: [
      { position: [centerX - bounds.width * 0.16, y(0.56), backZ + radius * 0.02], rotation: [0, 0.02, 0] },
      { position: [centerX + bounds.width * 0.2, y(0.58), backZ + radius * 0.18], rotation: [0.02, -0.28, 0.04] },
      { position: [leftX, y(0.38), centerZ + radius * 0.06], rotation: [0, Math.PI / 2.35, 0] }
    ],
    playfulBright: [
      { position: [centerX - bounds.width * 0.16, y(1.05), backZ + radius * 0.08], rotation: [0.3, -0.2, 0.35] },
      { position: [rightX, y(0.72), centerZ - radius * 0.12], rotation: [0, -Math.PI / 2.28, 0.08] },
      { position: [centerX + bounds.width * 0.2, y(0.18), backZ + radius * 0.28], rotation: [0, -0.14, 0] },
      { position: [leftX, y(0.28), centerZ + radius * 0.16], rotation: [0, Math.PI / 2.5, -0.18] },
      { position: [centerX, y(1.16), backZ + radius * 0.22], rotation: [0.2, 0.18, -0.12] }
    ]
  };

  const placement = (placementsByStyle[styleProfile.id] ?? fallback)[index] ?? fallback[index % fallback.length];
  return {
    position: placement.position,
    quaternion: quaternionFromEuler(...placement.rotation)
  };
}

export function createStudioDecorationDescriptors(
  input: StudioLayoutGeneratorInput & {
    bounds: StudioLayoutBounds;
    plinthTopY: number;
  }
): StudioLayoutMeshDescriptor[] {
  const kinds = getDefaultDecorationKinds(input).slice(0, 5);
  return kinds.map((kind, index) => {
    const placement = createStudioDecorationPlacement({
      bounds: input.bounds,
      plinthTopY: input.plinthTopY,
      styleProfile: input.styleProfile,
      index
    });
    return createStudioDecorationDescriptorForKind({
      styleProfile: input.styleProfile,
      kind,
      index,
      position: placement.position,
      quaternion: placement.quaternion,
      scale: getStudioDecorationScaleForStyle({
        kind,
        radius: input.bounds.radius,
        styleProfile: input.styleProfile,
        index
      }),
      material:
        input.styleProfile.id === "cleanCommerce"
          ? createCleanCommerceDecorationMaterial(input.styleProfile, index)
          : undefined
    });
  });
}
