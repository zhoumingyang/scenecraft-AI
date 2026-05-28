import * as THREE from "three";

import type {
  EditorLightJSON,
  EditorMeshJSON,
  EditorMeshMaterialJSON,
  Vec3Tuple
} from "./core/types";
import type {
  PbrSurfaceConfig,
  StudioProductProfile,
  StudioSceneStyleProfile
} from "./studioSceneProfiles";
import type { StudioSceneVariantId } from "./studioScenes";
import type { StudioTransientEntityRole } from "./session/studioSceneSession";
import {
  createExtrudedShapePresetGeometry,
  geometryToCustomMesh
} from "./utils/geometry";

export type StudioLayoutEntitySubRole =
  | "layoutRoot"
  | "floor"
  | "backWall"
  | "leftWall"
  | "rightWall"
  | "cove"
  | "plinth"
  | "decoration"
  | "light";

export type StudioPlinthKind =
  | "cylinder"
  | "roundedBox"
  | "box"
  | "square"
  | "tiered"
  | "multiLevel"
  | "beveled"
  | "floating"
  | "extrudedShape";

export type StudioDecorationKind =
  | "sphere"
  | "cylinder"
  | "ring"
  | "box"
  | "roundedBox"
  | "arch"
  | "semiDisc"
  | "verticalPanel"
  | "curvedPanel"
  | "wavePanel"
  | "floatingGeometry"
  | "extrudedShape";

export type StudioLayoutTargetFrame = {
  center: Vec3Tuple;
  radius: number;
  footprintRadius: number;
  height: number;
  floorY: number;
};

export type StudioLayoutBounds = {
  center: Vec3Tuple;
  radius: number;
  width: number;
  depth: number;
  wallHeight: number;
  floorY: number;
  leftX: number;
  rightX: number;
  backZ: number;
};

export type StudioLayoutMaterialDescriptor = EditorMeshMaterialJSON & {
  defaultSurface: PbrSurfaceConfig;
};

export type StudioLayoutMeshGeometryDescriptor =
  | {
      mode: "builtin";
      geometryName: string;
    }
  | {
      mode: "custom";
      geometry: Pick<EditorMeshJSON, "type" | "geometryName" | "vertices" | "uvs" | "normals" | "indices">;
    };

export type StudioLayoutMeshDescriptor = {
  kind: "mesh";
  role: StudioTransientEntityRole;
  subRole: StudioLayoutEntitySubRole;
  label: string;
  geometry: StudioLayoutMeshGeometryDescriptor;
  material: StudioLayoutMaterialDescriptor;
  position: Vec3Tuple;
  quaternion: [number, number, number, number];
  scale: Vec3Tuple;
  visible: boolean;
  locked: boolean;
  allowDelete: boolean;
  allowHide: boolean;
  resetKey: string;
  plinthKind?: StudioPlinthKind;
  decorationKind?: StudioDecorationKind;
};

export type StudioLayoutLightDescriptor = {
  kind: "light";
  role: StudioTransientEntityRole;
  subRole: "light";
  light: Omit<EditorLightJSON, "id">;
  resetKey: string;
};

export type StudioLayoutDescriptor = StudioLayoutMeshDescriptor | StudioLayoutLightDescriptor;

export type StudioLayoutGeneratorInput = {
  styleProfile: StudioSceneStyleProfile;
  variantId: StudioSceneVariantId;
  productProfile: StudioProductProfile;
  targetFrame: StudioLayoutTargetFrame;
};

export type StudioLayoutGeneratorOutput = {
  bounds: StudioLayoutBounds;
  plinthTopY: number;
  descriptors: StudioLayoutDescriptor[];
};

export function createStudioLayoutMaterial(surface: PbrSurfaceConfig): StudioLayoutMaterialDescriptor {
  return {
    defaultSurface: surface,
    color: surface.color,
    opacity: surface.opacity,
    metalness: surface.metalness,
    roughness: surface.roughness,
    emissive: surface.emissive,
    emissiveIntensity: surface.emissiveIntensity
  };
}

export function createStudioLayoutBounds(input: StudioLayoutGeneratorInput): StudioLayoutBounds {
  const radius = Math.max(input.targetFrame.radius, 1.2);
  const { background, plinth } = input.styleProfile.layout;
  const width = radius * background.widthMultiplier;
  const depth = radius * background.depthMultiplier;
  const wallHeight = Math.max(input.targetFrame.height * 2.4, radius * background.heightMultiplier);
  const floorY = input.targetFrame.floorY - plinth.clearance * radius;
  const [centerX, centerY, centerZ] = input.targetFrame.center;

  return {
    center: [centerX, centerY, centerZ],
    radius,
    width,
    depth,
    wallHeight,
    floorY,
    leftX: centerX - width * 0.48,
    rightX: centerX + width * 0.48,
    backZ: centerZ - depth * 0.48
  };
}

export function createEmptyStudioLayout(input: StudioLayoutGeneratorInput): StudioLayoutGeneratorOutput {
  return {
    bounds: createStudioLayoutBounds(input),
    plinthTopY: input.targetFrame.floorY,
    descriptors: []
  };
}

const IDENTITY_QUATERNION: [number, number, number, number] = [0, 0, 0, 1];

function createBoxDescriptor(input: {
  role: StudioTransientEntityRole;
  subRole: StudioLayoutEntitySubRole;
  label: string;
  material: StudioLayoutMaterialDescriptor;
  position: Vec3Tuple;
  scale: Vec3Tuple;
  allowDelete?: boolean;
  allowHide?: boolean;
  resetKey: string;
}): StudioLayoutMeshDescriptor {
  return {
    kind: "mesh",
    role: input.role,
    subRole: input.subRole,
    label: input.label,
    geometry: { mode: "builtin", geometryName: "Box" },
    material: input.material,
    position: input.position,
    quaternion: IDENTITY_QUATERNION,
    scale: input.scale,
    visible: true,
    locked: false,
    allowDelete: input.allowDelete ?? false,
    allowHide: input.allowHide ?? true,
    resetKey: input.resetKey
  };
}

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
  const backgroundMaterial = createStudioLayoutMaterial(input.styleProfile.materials.surfaces.background);
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

function createExtrudedPlinthGeometry(kind: "roundedBox" | "beveled" | "extrudedShape") {
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
        scale: kind === "multiLevel" ? [diameter * 1.45, lowerHeight, diameter * 0.9] : [radius * 1.55 / 0.7, lowerHeight / 1.4, radius * 1.55 / 0.7],
        resetKey: `plinth:${kind}:lower`
      }),
      createPlinthDescriptor({
        label: kind === "multiLevel" ? "Studio Upper Platform" : "Studio Upper Tier",
        kind,
        geometry: { mode: "builtin", geometryName: kind === "multiLevel" ? "Box" : "Cylinder" },
        material,
        position: [center[0], topY - upperHeight / 2, center[2]],
        scale: kind === "multiLevel" ? [diameter * 0.92, upperHeight, diameter * 0.72] : [radius / 0.7, upperHeight / 1.4, radius / 0.7],
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
          label: kind === "extrudedShape" ? "Studio Shape Plinth" : kind === "beveled" ? "Studio Beveled Plinth" : "Studio Rounded Plinth",
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
        label: kind === "floating" ? "Studio Floating Plinth" : kind === "cylinder" ? "Studio Plinth" : "Studio Block Plinth",
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
