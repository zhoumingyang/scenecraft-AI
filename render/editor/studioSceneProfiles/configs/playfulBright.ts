import type { StudioSceneStyleProfile } from "../types";
import { ACES_TONE_MAPPING, defaultLayout, roomSafetyLights, surface } from "./shared";

export const playfulBrightStyleProfile: StudioSceneStyleProfile = {
  id: "playfulBright",
  version: 1,
  labelKey: "editor.studioScene.style.playfulBright",
  descriptionKey: "editor.studioScene.style.playfulBright.description",
  productRules: {
    productTypes: ["toy", "food"],
    materials: ["plastic", "glossy", "matte"],
    brandColorUsage: "accent"
  },
  layout: defaultLayout(
    "minimalBox",
    "cylinder",
    { widthMultiplier: 7, depthMultiplier: 6.4, heightMultiplier: 2.35 },
    { fitPaddingRatio: 1.18, minRadius: 0.74, heightRatio: 0.34, clearance: 0.325 }
  ),
  materials: {
    palette: {
      background: "#f5f8ff",
      floor: "#e1ecff",
      wall: "#f8fbff",
      plinth: "#ffffff",
      accent: "#ffb84d"
    },
    surfaces: {
      background: surface("#f5f8ff", 0.76, 0, "#f7fbff", 0.08),
      floor: surface("#e1ecff", 0.78, 0, "#eef5ff", 0.03),
      wall: surface("#f8fbff", 0.76, 0, "#ffffff", 0.09),
      plinth: surface("#ffffff", 0.58),
      decoration: surface("#ffb84d", 0.5)
    }
  },
  lighting: {
    ibl: {
      enabled: true,
      provider: "polyhaven",
      assetId: "studio_small_09",
      intensity: 0.86,
      rotationY: -0.2,
      showAsBackground: false
    },
    lights: [
      { role: "key", type: "rectArea", color: "#fff8e7", intensity: 4.2, position: [2.8, 3.7, 3.1], target: [0, 0.85, 0], width: 3.3, height: 2 },
      { role: "keyShadow", type: "directional", color: "#fff0cb", intensity: 1.5, position: [2.6, 4, 2.8], target: [0, 0.55, 0], castsShadow: true },
      { role: "fill", type: "rectArea", color: "#e8f4ff", intensity: 2, position: [-2.8, 2.2, 2.3], target: [0, 0.75, 0], width: 2.8, height: 2.5 },
      { role: "rim", type: "spot", color: "#ffe0a8", intensity: 12, position: [0.8, 2.8, -3], target: [0, 0.8, 0], distance: 9, angle: 0.6, penumbra: 0.44 },
      { role: "top", type: "rectArea", color: "#ffffff", intensity: 1.8, position: [0, 4.4, 0.1], target: [0, 0.55, 0], width: 3.2, height: 2.4 },
      { role: "accent", type: "point", color: "#ffb84d", intensity: 5, position: [-1.8, 1.5, -1.7], target: [0, 0.75, 0], distance: 5 },
      ...roomSafetyLights({
        roomColor: "#f7fbff",
        wallColor: "#f0f8ff",
        ceilingColor: "#ffffff",
        groundColor: "#dceaff",
        roomIntensity: 0.17,
        wallIntensity: 0.38,
        ceilingIntensity: 0.24
      })
    ],
    modifiers: [
      { role: "reflector", enabled: true, placement: "left", color: "#ffffff", intensityEffect: 0.52, size: [1.2, 1.4], position: [-2, 1.1, 0.75], rotation: [0, 0.5, 0], visibleInRender: true },
      { role: "stripPanel", enabled: true, placement: "right", color: "#ffb84d", intensityEffect: 0.45, size: [0.2, 1.6], position: [2.05, 1.25, -0.95], rotation: [0, -0.56, 0], visibleInRender: true }
    ]
  },
  camera: { mode: "birdViewOnly", fov: 43, pitch: 0.16, yaw: Math.PI / 4.2, distanceMultiplier: 2.8, targetHeightRatio: 0.48, allowFirstPerson: false, orbitEnabled: true },
  postProcessing: {
    toneMapping: ACES_TONE_MAPPING,
    exposure: 1.06,
    contrast: 0.06,
    saturation: 0.12,
    temperature: 0.04,
    tint: -0.02,
    vignette: 0.1,
    detail: 0.08,
    grain: { enabled: false, intensity: 0.08, grayscale: false },
    passes: {
      bloom: { enabled: false, strength: 0.3, radius: 0.18, threshold: 0.9 }
    }
  }
};
