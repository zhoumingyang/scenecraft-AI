import * as THREE from "three";

import type { EditorLightJSON, QuatTuple, Vec3Tuple } from "./core/types";

export type LightPresetId =
  | "softDayInterior"
  | "warmHome"
  | "studioThreePoint"
  | "productShowcase"
  | "nightStreet"
  | "moonlightExterior";

export type LightPresetLightDefinition = {
  label: string;
  light: Omit<EditorLightJSON, "id">;
};

export type LightPresetDefinition = {
  id: LightPresetId;
  label: string;
  lights: LightPresetLightDefinition[];
};

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
  light: Partial<Omit<EditorLightJSON, "id" | "label">> & {
    type: EditorLightJSON["type"];
    position?: Vec3Tuple;
    target?: Vec3Tuple;
  }
): LightPresetLightDefinition {
  const position = light.position ?? [0, 0, 0];
  return {
    label,
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
      createLightDefinition("Sky Fill", {
        type: "hemisphere",
        position: [0, 8, 0],
        color: "#dfeeff",
        groundColor: "#39455c",
        intensity: 0.55
      }),
      createLightDefinition("Sun Key", {
        type: "directional",
        position: [6, 8, 5],
        target: [0, 1, 0],
        color: "#fff1d6",
        intensity: 0.8
      }),
      createLightDefinition("Window Fill", {
        type: "rectArea",
        position: [-3, 3, 2],
        target: [0, 1.2, 0],
        color: "#fff8ee",
        intensity: 2.8,
        width: 3,
        height: 4.5
      })
    ]
  },
  warmHome: {
    id: "warmHome",
    label: "Warm Home",
    lights: [
      createLightDefinition("Warm Ambient", {
        type: "hemisphere",
        position: [0, 6, 0],
        color: "#ffe8c4",
        groundColor: "#4a362c",
        intensity: 0.28
      }),
      createLightDefinition("Ceiling Lamp", {
        type: "rectArea",
        position: [2.5, 2.8, 2.5],
        target: [0, 1, 0],
        color: "#ffd3a1",
        intensity: 3.2,
        width: 2,
        height: 2
      }),
      createLightDefinition("Corner Glow", {
        type: "point",
        position: [-2, 1.8, -1.5],
        color: "#ffb76a",
        intensity: 26,
        distance: 9,
        decay: 2
      })
    ]
  },
  studioThreePoint: {
    id: "studioThreePoint",
    label: "Studio Three-Point",
    lights: [
      createLightDefinition("Key Spot", {
        type: "spot",
        position: [3, 4, 3],
        target: [0, 1.2, 0],
        color: "#fff8f0",
        intensity: 70,
        distance: 14,
        decay: 2,
        angle: 0.72,
        penumbra: 0.35
      }),
      createLightDefinition("Fill Panel", {
        type: "rectArea",
        position: [-3, 2.6, 2],
        target: [0, 1.1, 0],
        color: "#f5fbff",
        intensity: 2,
        width: 2.5,
        height: 2
      }),
      createLightDefinition("Rim Spot", {
        type: "spot",
        position: [0, 4, -3],
        target: [0, 1.4, 0],
        color: "#d7ebff",
        intensity: 28,
        distance: 12,
        decay: 2,
        angle: 0.55,
        penumbra: 0.3
      })
    ]
  },
  productShowcase: {
    id: "productShowcase",
    label: "Product Showcase",
    lights: [
      createLightDefinition("Key Panel", {
        type: "rectArea",
        position: [3, 3, 2],
        target: [0, 1, 0],
        color: "#fffaf2",
        intensity: 4.5,
        width: 3,
        height: 2
      }),
      createLightDefinition("Fill Panel", {
        type: "rectArea",
        position: [-3, 2.5, 1.5],
        target: [0, 1, 0],
        color: "#edf6ff",
        intensity: 2,
        width: 2.5,
        height: 2
      }),
      createLightDefinition("Top Rim", {
        type: "directional",
        position: [0, 5, -4],
        target: [0, 1, 0],
        color: "#dceaff",
        intensity: 0.45
      })
    ]
  },
  nightStreet: {
    id: "nightStreet",
    label: "Night Street",
    lights: [
      createLightDefinition("Night Sky", {
        type: "hemisphere",
        position: [0, 7, 0],
        color: "#89a8ff",
        groundColor: "#141b2c",
        intensity: 0.16
      }),
      createLightDefinition("Overhead Spot", {
        type: "spot",
        position: [0, 5, 0],
        target: [0, 0.8, 0],
        color: "#b9d1ff",
        intensity: 60,
        distance: 16,
        decay: 2,
        angle: 0.7,
        penumbra: 0.45
      }),
      createLightDefinition("Neon Left", {
        type: "point",
        position: [-3, 2, 1],
        color: "#ffbf66",
        intensity: 34,
        distance: 11,
        decay: 2
      }),
      createLightDefinition("Neon Right", {
        type: "point",
        position: [3, 2, -1],
        color: "#ffcf7d",
        intensity: 28,
        distance: 9,
        decay: 2
      })
    ]
  },
  moonlightExterior: {
    id: "moonlightExterior",
    label: "Moonlight Exterior",
    lights: [
      createLightDefinition("Moon Key", {
        type: "directional",
        position: [-6, 8, 4],
        target: [0, 1, 0],
        color: "#adc8ff",
        intensity: 0.55
      }),
      createLightDefinition("Night Hemisphere", {
        type: "hemisphere",
        position: [0, 8, 0],
        color: "#7e9ee8",
        groundColor: "#132034",
        intensity: 0.22
      }),
      createLightDefinition("Rim Accent", {
        type: "spot",
        position: [0, 3.5, -4],
        target: [0, 1.1, 0],
        color: "#bdd2ff",
        intensity: 20,
        distance: 12,
        decay: 2,
        angle: 0.62,
        penumbra: 0.3
      })
    ]
  }
};

export const LIGHT_PRESET_IDS = Object.keys(LIGHT_PRESET_DEFINITIONS) as LightPresetId[];

export function getLightPresetDefinition(presetId: LightPresetId): LightPresetDefinition {
  return LIGHT_PRESET_DEFINITIONS[presetId];
}
