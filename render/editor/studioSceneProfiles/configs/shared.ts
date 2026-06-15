import * as THREE from "three";

import { DEFAULT_EDITOR_TONE_MAPPING } from "../../runtime/colorManagement";
import type {
  PbrSurfaceConfig,
  StudioLayoutProfile,
  StudioLightingProfile
} from "../types";

export const ACES_TONE_MAPPING = THREE.ACESFilmicToneMapping;
export { DEFAULT_EDITOR_TONE_MAPPING };

const DEFAULT_PRODUCT_FRAMING = {
  targetImageHeightRatio: [0.4, 0.7] as [number, number],
  centerOnPlinth: true,
  avoidIntersection: true
};

export function surface(
  color: string,
  roughness: number,
  metalness = 0,
  emissive = "#000000",
  emissiveIntensity = 0
): PbrSurfaceConfig {
  const isMetallic = metalness > 0.08;
  const isGlossy = roughness < 0.58;

  return {
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
    opacity: 1,
    ior: 1.45,
    specularIntensity: isMetallic ? 0.78 : 0.5,
    specularColor: "#ffffff",
    clearcoat: isGlossy ? 0.18 : 0.06,
    clearcoatRoughness: isGlossy ? Math.min(0.44, roughness + 0.08) : 0.72,
    sheen: isMetallic ? 0 : 0.06,
    sheenColor: color,
    sheenRoughness: 0.82
  };
}

export function roomSafetyLights(options: {
  roomColor: string;
  wallColor: string;
  ceilingColor: string;
  groundColor: string;
  roomIntensity: number;
  wallIntensity: number;
  ceilingIntensity: number;
}): StudioLightingProfile["lights"] {
  return [
    {
      role: "roomFill",
      type: "ambient",
      color: options.roomColor,
      groundColor: options.groundColor,
      intensity: options.roomIntensity,
      position: [0, 4.25, 0],
      target: [0, 0.7, 0],
      castsShadow: false
    },
    {
      role: "wallWash",
      type: "rectArea",
      color: options.wallColor,
      intensity: options.wallIntensity,
      position: [0, 2.25, 2.7],
      target: [0, 1.25, -2.7],
      width: 5.8,
      height: 3.1,
      castsShadow: false
    },
    {
      role: "ceilingWash",
      type: "rectArea",
      color: options.ceilingColor,
      intensity: options.ceilingIntensity,
      position: [0, 1.35, 0.35],
      target: [0, 4.45, 0],
      width: 5.4,
      height: 3.8,
      castsShadow: false
    }
  ];
}

export function defaultLayout(
  backgroundType: StudioLayoutProfile["background"]["type"],
  plinthType: StudioLayoutProfile["plinth"]["type"],
  multipliers: Pick<
    StudioLayoutProfile["background"],
    "widthMultiplier" | "depthMultiplier" | "heightMultiplier"
  >,
  plinth: Pick<
    StudioLayoutProfile["plinth"],
    "fitPaddingRatio" | "minRadius" | "heightRatio" | "clearance"
  >
): StudioLayoutProfile {
  return {
    background: {
      type: backgroundType,
      seamless: backgroundType === "coveStudio",
      cornerRadiusRatio: backgroundType === "coveStudio" ? 0.16 : 0,
      ...multipliers
    },
    plinth: {
      type: plinthType,
      ...plinth,
      allowDelete: false,
      allowHide: false
    },
    decorations: [],
    productFraming: DEFAULT_PRODUCT_FRAMING
  };
}
