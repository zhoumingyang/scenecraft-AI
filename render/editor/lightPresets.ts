import * as THREE from "three";

import type { EditorLightJSON, QuatTuple, Vec3Tuple } from "./core/types";

export type LightPresetId =
  | "softDayInterior"
  | "warmHome"
  | "studioThreePoint"
  | "productShowcase"
  | "nightStreet"
  | "moonlightExterior";

type LightPresetRole = "key" | "fill" | "rim" | "ambient" | "accent";

export type LightPresetLightDefinition = {
  label: string;
  role: LightPresetRole;
  light: Omit<EditorLightJSON, "id">;
  target?: Vec3Tuple;
};

export type LightPresetDefinition = {
  id: LightPresetId;
  label: string;
  lights: LightPresetLightDefinition[];
};

export type LightPresetFrame = {
  center: Vec3Tuple;
  floorY: number;
  radius: number;
};

const MIN_ADAPTIVE_LIGHT_PRESET_RADIUS = 0.75;
const MAX_ADAPTIVE_LIGHT_PRESET_RADIUS = 3.5;

function isPointOrSpotLight(lightType: EditorLightJSON["type"]) {
  const normalizedType = typeof lightType === "string" ? lightType : Number(lightType);
  return normalizedType === 3 || normalizedType === "point" || normalizedType === 4 || normalizedType === "spot";
}

function shouldAimAtFrameCenter(lightType: EditorLightJSON["type"]) {
  const normalizedType = typeof lightType === "string" ? lightType : Number(lightType);
  return (
    normalizedType === 2 ||
    normalizedType === "directional" ||
    normalizedType === 4 ||
    normalizedType === "spot" ||
    normalizedType === 5 ||
    normalizedType === "rectArea"
  );
}

function getLightPresetFrameRadius(frame: LightPresetFrame) {
  return THREE.MathUtils.clamp(
    frame.radius,
    MIN_ADAPTIVE_LIGHT_PRESET_RADIUS,
    MAX_ADAPTIVE_LIGHT_PRESET_RADIUS
  );
}

function resolveAdaptiveLightPosition(position: Vec3Tuple, frame: LightPresetFrame): Vec3Tuple {
  const radius = getLightPresetFrameRadius(frame);
  return [
    frame.center[0] + position[0] * radius,
    frame.floorY + position[1] * radius,
    frame.center[2] + position[2] * radius
  ];
}

function resolveAdaptiveLightTarget(target: Vec3Tuple, frame: LightPresetFrame): Vec3Tuple {
  const radius = getLightPresetFrameRadius(frame);
  return [
    frame.center[0] + target[0] * radius,
    frame.floorY + target[1] * radius,
    frame.center[2] + target[2] * radius
  ];
}

function getAdaptiveIntensityExponent(
  definition: LightPresetLightDefinition,
  lightType: EditorLightJSON["type"]
) {
  const normalizedType = typeof lightType === "string" ? lightType : Number(lightType);

  if (normalizedType === 5 || normalizedType === "rectArea") {
    switch (definition.role) {
      case "key":
        return 0.4;
      case "rim":
        return 0.3;
      case "accent":
        return 0.26;
      case "ambient":
        return 0.18;
      case "fill":
      default:
        return 0.22;
    }
  }

  if (normalizedType === 2 || normalizedType === "directional") {
    switch (definition.role) {
      case "key":
        return 0.12;
      case "rim":
        return 0.1;
      case "accent":
        return 0.09;
      case "ambient":
        return 0.06;
      case "fill":
      default:
        return 0.08;
    }
  }

  if (normalizedType === 6 || normalizedType === "hemisphere" || normalizedType === 1 || normalizedType === "ambient") {
    switch (definition.role) {
      case "key":
      case "fill":
      case "rim":
      case "accent":
        return 0.06;
      case "ambient":
      default:
        return 0.04;
    }
  }

  switch (definition.role) {
    case "key":
      return 1.45;
    case "rim":
      return 1.2;
    case "accent":
      return 1.1;
    case "ambient":
      return 0.9;
    case "fill":
    default:
      return 1.05;
  }
}

function adaptLightPresetLight(
  definition: LightPresetLightDefinition,
  frame: LightPresetFrame
): LightPresetLightDefinition {
  const radius = getLightPresetFrameRadius(frame);
  const source = definition.light;
  const position = resolveAdaptiveLightPosition((source.position ?? [0, 0, 0]) as Vec3Tuple, frame);
  const target = definition.target
    ? resolveAdaptiveLightTarget(definition.target, frame)
    : frame.center;
  const intensityScale = Math.pow(radius, getAdaptiveIntensityExponent(definition, source.type));
  const light: Omit<EditorLightJSON, "id"> = {
    ...source,
    position,
    quaternion: shouldAimAtFrameCenter(source.type)
      ? createLightQuaternion(source.type, position, target)
      : source.quaternion,
    distance: isPointOrSpotLight(source.type) ? (source.distance ?? 0) * radius : source.distance,
    intensity: (source.intensity ?? 1) * intensityScale,
    width:
      source.type === "rectArea" || source.type === 5
        ? (source.width ?? 1) * radius
        : source.width,
    height:
      source.type === "rectArea" || source.type === 5
        ? (source.height ?? 1) * radius
        : source.height
  };

  return {
    label: definition.label,
    role: definition.role,
    light,
    target: definition.target
  };
}

function createLookAtQuaternion(position: Vec3Tuple, target: Vec3Tuple = [0, 0, 0]): QuatTuple {
  const helper = new THREE.Object3D();
  helper.position.set(position[0], position[1], position[2]);
  helper.lookAt(target[0], target[1], target[2]);
  return [
    helper.quaternion.x,
    helper.quaternion.y,
    helper.quaternion.z,
    helper.quaternion.w
  ];
}

function createLightQuaternion(
  lightType: EditorLightJSON["type"],
  position: Vec3Tuple,
  target: Vec3Tuple
): QuatTuple {
  const normalizedType = typeof lightType === "string" ? lightType : Number(lightType);

  if (normalizedType === 5 || normalizedType === "rectArea") {
    // RectAreaLight emits from a single face, so we orient its emitting side toward the subject.
    return createLookAtQuaternion(position, [
      position[0] * 2 - target[0],
      position[1] * 2 - target[1],
      position[2] * 2 - target[2]
    ]);
  }

  return createLookAtQuaternion(position, target);
}

function createLightDefinition(
  label: string,
  role: LightPresetRole,
  light: Partial<Omit<EditorLightJSON, "id" | "label">> & {
    type: EditorLightJSON["type"];
    position?: Vec3Tuple;
    target?: Vec3Tuple;
  }
): LightPresetLightDefinition {
  const position = light.position ?? [0, 0, 0];
  return {
    label,
    role,
    target: light.target,
    light: {
      type: light.type,
      position,
      quaternion: light.target ? createLightQuaternion(light.type, position, light.target) : [0, 0, 0, 1],
      scale: [1, 1, 1],
      color: light.color ?? "#ffffff",
      groundColor: light.groundColor ?? "#2a3548",
      intensity: light.intensity ?? 1,
      distance: light.distance ?? 0,
      decay: light.decay ?? 2,
      angle: light.angle ?? Math.PI / 3,
      penumbra: light.penumbra ?? 0,
      width: light.width ?? 1,
      height: light.height ?? 1
    }
  };
}

export const LIGHT_PRESET_DEFINITIONS: Record<LightPresetId, LightPresetDefinition> = {
  softDayInterior: {
    id: "softDayInterior",
    label: "Soft Day Interior",
    lights: [
      createLightDefinition("Sky Fill", "ambient", {
        type: "hemisphere",
        position: [0, 7.2, 0],
        color: "#dce8ff",
        groundColor: "#445269",
        intensity: 0.24
      }),
      createLightDefinition("Sun Direction", "fill", {
        type: "directional",
        position: [5.6, 7.1, 4.4],
        target: [0, 1.35, 0.15],
        color: "#ffe6bf",
        intensity: 0.46
      }),
      createLightDefinition("Window Key", "key", {
        type: "rectArea",
        position: [-3.6, 3.1, 2.3],
        target: [0, 1.25, 0.05],
        color: "#fffaf3",
        intensity: 3.8,
        width: 3.4,
        height: 5.1
      })
    ]
  },
  warmHome: {
    id: "warmHome",
    label: "Warm Home",
    lights: [
      createLightDefinition("Warm Ambient", "ambient", {
        type: "hemisphere",
        position: [0, 5.8, 0],
        color: "#ffdcb5",
        groundColor: "#3a2d27",
        intensity: 0.14
      }),
      createLightDefinition("Ceiling Lamp", "key", {
        type: "rectArea",
        position: [1.6, 3.3, 1.6],
        target: [0, 1.15, 0],
        color: "#ffd7ab",
        intensity: 4.1,
        width: 2.6,
        height: 2.4
      }),
      createLightDefinition("Corner Glow", "accent", {
        type: "point",
        position: [-2.1, 1.75, -1.4],
        color: "#ffc181",
        intensity: 9.5,
        distance: 7.2,
        decay: 2
      })
    ]
  },
  studioThreePoint: {
    id: "studioThreePoint",
    label: "Studio Three-Point",
    lights: [
      createLightDefinition("Key Spot", "key", {
        type: "spot",
        position: [3.4, 4.6, 2.6],
        target: [0, 1.25, 0],
        color: "#fff8f2",
        intensity: 55,
        distance: 14,
        decay: 2,
        angle: 0.55,
        penumbra: 0.4
      }),
      createLightDefinition("Fill Panel", "fill", {
        type: "rectArea",
        position: [-2.8, 2.8, 2.2],
        target: [0, 1.15, 0],
        color: "#eef6ff",
        intensity: 1.35,
        width: 3.4,
        height: 2.4
      }),
      createLightDefinition("Rim Spot", "rim", {
        type: "spot",
        position: [0.6, 4.4, -3.6],
        target: [0, 1.35, -0.1],
        color: "#dbe9ff",
        intensity: 34,
        distance: 13,
        decay: 2,
        angle: 0.42,
        penumbra: 0.28
      })
    ]
  },
  productShowcase: {
    id: "productShowcase",
    label: "Product Showcase",
    lights: [
      createLightDefinition("Key Panel", "key", {
        type: "rectArea",
        position: [3.2, 3.1, 2.1],
        target: [0, 1.05, 0],
        color: "#fffaf4",
        intensity: 5.2,
        width: 3.2,
        height: 2.4
      }),
      createLightDefinition("Fill Panel", "fill", {
        type: "rectArea",
        position: [-3.2, 2.6, 1.8],
        target: [0, 1, 0.05],
        color: "#eef5ff",
        intensity: 1.25,
        width: 3.4,
        height: 2.4
      }),
      createLightDefinition("Top Rim", "rim", {
        type: "directional",
        position: [0.2, 5.6, -4.5],
        target: [0, 1.1, -0.1],
        color: "#d8e8ff",
        intensity: 0.62
      })
    ]
  },
  nightStreet: {
    id: "nightStreet",
    label: "Night Street",
    lights: [
      createLightDefinition("Night Sky", "ambient", {
        type: "hemisphere",
        position: [0, 7.2, 0],
        color: "#7c97ee",
        groundColor: "#11182a",
        intensity: 0.08
      }),
      createLightDefinition("Overhead Spot", "key", {
        type: "spot",
        position: [0.4, 5.8, 0.6],
        target: [0, 1, 0],
        color: "#bad4ff",
        intensity: 48,
        distance: 14,
        decay: 2,
        angle: 0.58,
        penumbra: 0.52
      }),
      createLightDefinition("Store Glow Left", "accent", {
        type: "point",
        position: [-3.8, 2.4, 2.3],
        color: "#ffb263",
        intensity: 18,
        distance: 8,
        decay: 2
      }),
      createLightDefinition("Sign Bounce Right", "accent", {
        type: "point",
        position: [3.4, 2.15, -2],
        color: "#ffc98f",
        intensity: 14,
        distance: 7.5,
        decay: 2
      })
    ]
  },
  moonlightExterior: {
    id: "moonlightExterior",
    label: "Moonlight Exterior",
    lights: [
      createLightDefinition("Moon Key", "key", {
        type: "directional",
        position: [-6.5, 8.8, 4.8],
        target: [0, 1.25, 0.1],
        color: "#b7ccff",
        intensity: 0.68
      }),
      createLightDefinition("Night Hemisphere", "ambient", {
        type: "hemisphere",
        position: [0, 8, 0],
        color: "#708ed8",
        groundColor: "#0f1829",
        intensity: 0.12
      }),
      createLightDefinition("Rim Accent", "rim", {
        type: "spot",
        position: [1, 4.2, -4.6],
        target: [0, 1.2, -0.15],
        color: "#cad9ff",
        intensity: 24,
        distance: 14,
        decay: 2,
        angle: 0.48,
        penumbra: 0.26
      })
    ]
  }
};

export const LIGHT_PRESET_IDS = Object.keys(LIGHT_PRESET_DEFINITIONS) as LightPresetId[];

export function getLightPresetDefinition(presetId: LightPresetId): LightPresetDefinition {
  return LIGHT_PRESET_DEFINITIONS[presetId];
}

export function createAdaptiveLightPresetDefinition(
  presetId: LightPresetId,
  frame: LightPresetFrame | null
): LightPresetDefinition {
  const preset = getLightPresetDefinition(presetId);
  if (!frame) return preset;

  return {
    ...preset,
    lights: preset.lights.map((light) => adaptLightPresetLight(light, frame))
  };
}
