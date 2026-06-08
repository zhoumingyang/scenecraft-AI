import { geometryToCustomMesh } from "../utils/geometry";
import { createStudioRoundedRoomGeometry } from "../studioSceneRoomGeometry";
import { IDENTITY_QUATERNION } from "./descriptors";
import {
  createStudioLayoutBounds,
  createStudioLayoutMaterial,
  type StudioLayoutBounds,
  type StudioLayoutGeneratorInput,
  type StudioLayoutMeshDescriptor
} from "./types";

export function createStudioBackgroundDescriptors(input: StudioLayoutGeneratorInput): {
  bounds: StudioLayoutBounds;
  descriptors: StudioLayoutMeshDescriptor[];
} {
  const bounds = createStudioLayoutBounds(input);
  const { background } = input.styleProfile.layout;
  const backgroundMaterial = createStudioLayoutMaterial(
    input.styleProfile.materials.surfaces.background
  );
  const [centerX, , centerZ] = bounds.center;
  const geometry = createStudioRoundedRoomGeometry({
    width: bounds.width,
    height: bounds.wallHeight,
    depth: bounds.depth,
    radius: bounds.radius,
    cornerRadiusRatio: background.cornerRadiusRatio
  });
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
        position: [centerX, bounds.floorY + bounds.wallHeight / 2, centerZ],
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
