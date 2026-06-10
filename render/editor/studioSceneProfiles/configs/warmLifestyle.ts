import type { StudioSceneStyleProfile } from "../types";
import { ACES_TONE_MAPPING, defaultLayout, roomSafetyLights, surface } from "./shared";

export const warmLifestyleStyleProfile: StudioSceneStyleProfile = {
  id: "warmLifestyle",
  version: 1,
  labelKey: "editor.studioScene.style.warmLifestyle",
  descriptionKey: "editor.studioScene.style.warmLifestyle.description",
  productRules: {
    productTypes: ["fashion", "footwear", "food", "home"],
    materials: ["fabric", "leather", "wood", "ceramic"],
    brandColorUsage: "accent"
  },
  layout: defaultLayout(
    "cornerStudio",
    "cylinder",
    { widthMultiplier: 7.2, depthMultiplier: 6.8, heightMultiplier: 2.4 },
    { fitPaddingRatio: 1.2, minRadius: 0.76, heightRatio: 0.31, clearance: 0.325 }
  ),
  materials: {
    palette: {
      background: "#2b211c",
      floor: "#8c6548",
      wall: "#c9b49b",
      plinth: "#d9c3a3",
      accent: "#73513a"
    },
    surfaces: {
      background: surface("#2b211c", 0.82, 0, "#3a2b22", 0.1),
      floor: surface("#8c6548", 0.78, 0, "#9a7558", 0.035),
      wall: surface("#c9b49b", 0.8, 0, "#e1c8a9", 0.085),
      plinth: surface("#d9c3a3", 0.64),
      decoration: surface("#73513a", 0.72)
    }
  },
  lighting: {
    ibl: {
      enabled: true,
      provider: "polyhaven",
      assetId: "white_home_studio",
      intensity: 0.7,
      rotationY: 0.5,
      showAsBackground: false
    },
    lights: [
      { role: "key", type: "rectArea", color: "#ffd9ad", intensity: 3.4, position: [-3.4, 3.3, 2.6], target: [0, 0.8, 0], width: 2.8, height: 3.2 },
      { role: "keyShadow", type: "directional", color: "#ffd1a0", intensity: 1.7, position: [-3.1, 3.8, 2.4], target: [0, 0.55, 0], castsShadow: true },
      { role: "fill", type: "rectArea", color: "#fff1dc", intensity: 1.1, position: [2.8, 2.2, 2.8], target: [0, 0.7, 0], width: 2.2, height: 1.8 },
      { role: "rim", type: "spot", color: "#ffbc76", intensity: 16, position: [1.8, 2.7, -2.8], target: [0, 0.8, 0], distance: 9, angle: 0.62, penumbra: 0.5 },
      { role: "top", type: "rectArea", color: "#fff1dc", intensity: 1.2, position: [0, 4.2, 0.2], target: [0, 0.55, 0], width: 3, height: 2.2 },
      { role: "accent", type: "spot", color: "#73513a", intensity: 6.2, position: [2.1, 2.2, -2.3], target: [0, 0.7, 0], distance: 7, angle: 0.5, penumbra: 0.55 },
      ...roomSafetyLights({
        roomColor: "#ffd9ad",
        wallColor: "#ffd0a0",
        ceilingColor: "#ffe7c8",
        groundColor: "#6f4d38",
        roomIntensity: 0.16,
        wallIntensity: 0.34,
        ceilingIntensity: 0.2
      })
    ],
    modifiers: [
      { role: "reflector", enabled: true, placement: "right", color: "#ffe2bd", intensityEffect: 0.48, size: [1.25, 1.45], position: [2.05, 1.12, 0.7], rotation: [0, -0.5, 0], visibleInRender: true }
    ]
  },
  camera: { mode: "birdViewOnly", fov: 44, pitch: 0.15, yaw: Math.PI / 5, distanceMultiplier: 2.9, targetHeightRatio: 0.48, allowFirstPerson: false, orbitEnabled: true },
  postProcessing: {
    toneMapping: ACES_TONE_MAPPING,
    exposure: 1.06,
    contrast: 0.06,
    saturation: 0.06,
    temperature: 0.18,
    tint: -0.02,
    vignette: 0.2,
    detail: -0.04,
    grain: { enabled: false, intensity: 0.18, grayscale: false },
    passes: {
      film: { enabled: false, intensity: 0.18, grayscale: false }
    }
  }
};
