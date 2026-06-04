import type {
  EditorLightJSON,
  EditorMeshJSON,
  EditorMeshMaterialJSON,
  Vec3Tuple
} from "../core/types";
import type {
  PbrSurfaceConfig,
  StudioProductProfile,
  StudioSceneStyleProfile
} from "../studioSceneProfiles";
import type { StudioSceneVariantId } from "../studioScenes";
import type { StudioTransientEntityRole } from "../session/studioSceneSession/types";

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

export function createStudioLayoutMaterial(
  surface: PbrSurfaceConfig
): StudioLayoutMaterialDescriptor {
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

export function createStudioLayoutBounds(
  input: StudioLayoutGeneratorInput
): StudioLayoutBounds {
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

export function createEmptyStudioLayout(
  input: StudioLayoutGeneratorInput
): StudioLayoutGeneratorOutput {
  return {
    bounds: createStudioLayoutBounds(input),
    plinthTopY: input.targetFrame.floorY,
    descriptors: []
  };
}
