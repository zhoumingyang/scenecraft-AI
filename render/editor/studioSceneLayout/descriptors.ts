import type { Vec3Tuple } from "../core/types";
import type { StudioTransientEntityRole } from "../session/studioSceneSession/types";
import type {
  StudioLayoutEntitySubRole,
  StudioLayoutMaterialDescriptor,
  StudioLayoutMeshDescriptor
} from "./types";

export const IDENTITY_QUATERNION: [number, number, number, number] = [0, 0, 0, 1];

export function createBoxDescriptor(input: {
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
