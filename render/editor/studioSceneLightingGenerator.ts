import * as THREE from "three";

import type {
  EditorLightJSON,
  EditorMeshJSON,
  EditorMeshMaterialJSON,
  Vec3Tuple
} from "./core/types";
import type { StudioLayoutBounds, StudioLayoutTargetFrame } from "./studioSceneLayoutGenerator";
import type {
  StudioLightingProfile,
  StudioProductProfile,
  StudioSceneStyleProfile
} from "./studioSceneProfiles";
import type { StudioTransientEntityRole } from "./session/studioSceneSession";

export type StudioIblDescriptor = StudioLightingProfile["ibl"];
export type StudioGeneratedLightRole = StudioLightingProfile["lights"][number]["role"];
export type StudioGeneratedModifierRole = StudioLightingProfile["modifiers"][number]["role"];

export type StudioLightingLightDescriptor = {
  kind: "light";
  role: StudioTransientEntityRole;
  lightRole: StudioGeneratedLightRole;
  label: string;
  light: Omit<EditorLightJSON, "id">;
  resetKey: string;
};

export type StudioLightingModifierDescriptor = {
  kind: "modifier";
  role: StudioTransientEntityRole;
  modifierRole: StudioGeneratedModifierRole;
  label: string;
  mesh: Omit<EditorMeshJSON, "id">;
  visibleInRender: boolean;
  resetKey: string;
};

export type StudioLightingGeneratorInput = {
  styleProfile: StudioSceneStyleProfile;
  productProfile: StudioProductProfile;
  targetFrame: StudioLayoutTargetFrame;
  bounds: StudioLayoutBounds;
};

export type StudioLightingGeneratorOutput = {
  ibl: StudioIblDescriptor;
  lights: StudioLightingLightDescriptor[];
  modifiers: StudioLightingModifierDescriptor[];
};

const LIGHT_ROLE_LABELS: Record<StudioGeneratedLightRole, string> = {
  key: "Studio Key Light",
  keyShadow: "Studio Key Shadow",
  fill: "Studio Fill Light",
  rim: "Studio Rim Light",
  top: "Studio Top Light",
  accent: "Studio Accent Light"
};

const LIGHT_ROLE_TO_TRANSIENT_ROLE: Record<StudioGeneratedLightRole, StudioTransientEntityRole> = {
  key: "keyLight",
  keyShadow: "keyShadowLight",
  fill: "fillLight",
  rim: "rimLight",
  top: "topLight",
  accent: "accentLight"
};

const MODIFIER_ROLE_LABELS: Record<StudioGeneratedModifierRole, string> = {
  reflector: "Studio Reflector",
  negativeFill: "Studio Negative Fill",
  stripPanel: "Studio Strip Panel"
};

const MODIFIER_ROLE_TO_TRANSIENT_ROLE: Record<StudioGeneratedModifierRole, StudioTransientEntityRole> = {
  reflector: "reflector",
  negativeFill: "negativeFill",
  stripPanel: "stripPanel"
};

function toVec3Tuple(vector: THREE.Vector3): Vec3Tuple {
  return [vector.x, vector.y, vector.z];
}

function toQuaternionTuple(quaternion: THREE.Quaternion): [number, number, number, number] {
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
}

function resolveRelativePosition(bounds: StudioLayoutBounds, value: Vec3Tuple) {
  return new THREE.Vector3(
    bounds.center[0] + bounds.radius * value[0],
    bounds.floorY + bounds.radius * value[1],
    bounds.center[2] + bounds.radius * value[2]
  );
}

function createLookAtQuaternion(position: THREE.Vector3, target: THREE.Vector3) {
  const helper = new THREE.Object3D();
  helper.position.copy(position);
  helper.lookAt(target);
  return helper.quaternion;
}

function createLightDescriptor(
  profileLight: StudioLightingProfile["lights"][number],
  bounds: StudioLayoutBounds
): StudioLightingLightDescriptor {
  const position = resolveRelativePosition(bounds, profileLight.position);
  const target = resolveRelativePosition(bounds, profileLight.target);
  const type: EditorLightJSON["type"] =
    profileLight.type === "rectArea"
      ? "rectArea"
      : profileLight.type === "directional"
        ? "directional"
        : profileLight.type === "spot"
          ? "spot"
          : "point";

  return {
    kind: "light",
    role: LIGHT_ROLE_TO_TRANSIENT_ROLE[profileLight.role],
    lightRole: profileLight.role,
    label: LIGHT_ROLE_LABELS[profileLight.role],
    resetKey: `${profileLight.role}-light`,
    light: {
      label: LIGHT_ROLE_LABELS[profileLight.role],
      type,
      locked: false,
      position: toVec3Tuple(position),
      quaternion: toQuaternionTuple(createLookAtQuaternion(position, target)),
      scale: [1, 1, 1],
      color: profileLight.color,
      groundColor: "#263041",
      intensity: profileLight.intensity,
      distance: (profileLight.distance ?? 0) * bounds.radius,
      decay: 2,
      angle: profileLight.angle ?? Math.PI / 3,
      penumbra: profileLight.penumbra ?? 0,
      width: (profileLight.width ?? 1) * bounds.radius,
      height: (profileLight.height ?? 1) * bounds.radius
    }
  };
}

function createModifierMaterial(
  modifier: StudioLightingProfile["modifiers"][number]
): EditorMeshMaterialJSON {
  const opacity = modifier.visibleInRender ? 0.58 : 0.32;
  const emissiveIntensity =
    modifier.role === "stripPanel" ? THREE.MathUtils.clamp(modifier.intensityEffect * 0.35, 0, 1.2) : 0;
  return {
    color: modifier.color,
    opacity,
    metalness: 0,
    roughness: modifier.role === "negativeFill" ? 0.9 : 0.42,
    emissive: modifier.role === "stripPanel" ? modifier.color : "#000000",
    emissiveIntensity
  };
}

function createModifierDescriptor(
  modifier: StudioLightingProfile["modifiers"][number],
  bounds: StudioLayoutBounds
): StudioLightingModifierDescriptor {
  const position = resolveRelativePosition(bounds, modifier.position);
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(modifier.rotation[0], modifier.rotation[1], modifier.rotation[2], "XYZ")
  );
  const width = Math.max(modifier.size[0] * bounds.radius, 0.08);
  const height = Math.max(modifier.size[1] * bounds.radius, 0.08);
  const thickness = Math.max(bounds.radius * 0.035, 0.025);
  const label = MODIFIER_ROLE_LABELS[modifier.role];

  return {
    kind: "modifier",
    role: MODIFIER_ROLE_TO_TRANSIENT_ROLE[modifier.role],
    modifierRole: modifier.role,
    label,
    resetKey: `${modifier.role}-${modifier.placement}`,
    visibleInRender: modifier.visibleInRender,
    mesh: {
      label,
      type: 1,
      geometryName: "Box",
      material: createModifierMaterial(modifier),
      position: toVec3Tuple(position),
      quaternion: toQuaternionTuple(quaternion),
      scale: [width, height, thickness],
      visible: true,
      locked: false
    }
  };
}

export function createStudioLightingDescriptors(
  input: StudioLightingGeneratorInput
): StudioLightingGeneratorOutput {
  return {
    ibl: input.styleProfile.lighting.ibl,
    lights: input.styleProfile.lighting.lights.map((light) => createLightDescriptor(light, input.bounds)),
    modifiers: input.styleProfile.lighting.modifiers
      .filter((modifier) => modifier.enabled)
      .slice(0, 3)
      .map((modifier) => createModifierDescriptor(modifier, input.bounds))
  };
}
