import type { EditorMeshMaterialJSON, Vec3Tuple } from "../../core/types";
import type { EditorProjectModel } from "../../models";
import type {
  StudioTargetFrame,
  StudioTransientEntityDefaultSnapshot,
  StudioTransientEntityGroupKind,
  StudioTransientEntityRole
} from "./types";

export function toGeneratorFrame(frame: StudioTargetFrame) {
  return {
    center: [frame.center.x, frame.center.y, frame.center.z] as Vec3Tuple,
    radius: frame.radius,
    footprintRadius: frame.footprintRadius,
    height: frame.height,
    floorY: frame.floorY
  };
}

function cloneTransform(source: {
  position: number[];
  quaternion: number[];
  scale: number[];
}): StudioTransientEntityDefaultSnapshot["transform"] {
  return {
    position: [...source.position],
    quaternion: [...source.quaternion],
    scale: [...source.scale]
  };
}

function cloneMaterial(source: unknown): EditorMeshMaterialJSON {
  return structuredClone(source) as EditorMeshMaterialJSON;
}

function cloneLight(source: {
  color: string;
  groundColor: string;
  intensity: number;
  distance: number;
  decay: number;
  angle: number;
  penumbra: number;
  width: number;
  height: number;
}): NonNullable<StudioTransientEntityDefaultSnapshot["light"]> {
  return {
    color: source.color,
    groundColor: source.groundColor,
    intensity: source.intensity,
    distance: source.distance,
    decay: source.decay,
    angle: source.angle,
    penumbra: source.penumbra,
    width: source.width,
    height: source.height
  };
}

export function getDefaultGroupKind(role: StudioTransientEntityRole): StudioTransientEntityGroupKind {
  if (
    role === "studioLight" ||
    role === "keyLight" ||
    role === "keyShadowLight" ||
    role === "fillLight" ||
    role === "rimLight" ||
    role === "topLight" ||
    role === "accentLight" ||
    role === "lightModifier" ||
    role === "reflector" ||
    role === "negativeFill" ||
    role === "stripPanel" ||
    role === "light"
  ) {
    return "lighting";
  }
  if (
    role === "userMesh" ||
    role === "userLight" ||
    role === "userLightGroup" ||
    role === "userModel"
  ) {
    return "user";
  }
  return "layout";
}

export function getDefaultAllowHide(role: StudioTransientEntityRole) {
  return role !== "root" && role !== "plinth";
}

export function getDefaultAllowDelete(role: StudioTransientEntityRole) {
  return role !== "root" && role !== "plinth" && role !== "background" && role !== "cove" && role !== "floor" && role !== "backWall" && role !== "sideWall";
}

export function captureTransientEntityDefaultSnapshot(
  record: NonNullable<ReturnType<EditorProjectModel["getEntityById"]>>
) {
  const snapshot: StudioTransientEntityDefaultSnapshot = {
    transform: cloneTransform(record.item),
    visible: "visible" in record.item ? record.item.visible : undefined
  };

  if (record.kind === "mesh") {
    snapshot.material = cloneMaterial(record.item.material);
  } else if (record.kind === "light") {
    snapshot.light = cloneLight(record.item);
  }

  return snapshot;
}
