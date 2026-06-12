import type { StudioSceneStyleProfile } from "../types";
import {
  ACES_TONE_MAPPING,
  defaultLayout,
  roomSafetyLights,
  surface
} from "./shared";

export const cleanCommerceStyleProfile: StudioSceneStyleProfile = {
  id: "cleanCommerce",
  version: 1,
  labelKey: "editor.studioScene.style.cleanCommerce",
  descriptionKey: "editor.studioScene.style.cleanCommerce.description",
  productRules: {
    productTypes: ["generic", "home"],
    materials: ["unknown", "matte", "plastic", "ceramic"],
    brandColorUsage: "accent"
  },
  layout: defaultLayout(
    "coveStudio",
    "roundedBox",
    { widthMultiplier: 7.4, depthMultiplier: 7, heightMultiplier: 2.55 },
    { fitPaddingRatio: 1.18, minRadius: 0.7, heightRatio: 0.22, clearance: 0.3 }
  ),
  materials: {
    palette: {
      background: "#f9fbff",
      floor: "#eef3f8",
      wall: "#f7faff",
      plinth: "#f6f9fc",
      accent: "#dcecff"
    },
    surfaces: {
      background: surface("#f9fbff", 0.76, 0, "#ffffff", 0.1),
      floor: surface("#eef3f8", 0.78, 0, "#f8fbff", 0.04),
      wall: surface("#f7faff", 0.72, 0, "#ffffff", 0.12),
      plinth: surface("#f6f9fc", 0.5),
      decoration: surface("#dcecff", 0.2, 0, "#f8fbff", 0.08)
    }
  },
  lighting: {
    ibl: {
      enabled: true,
      provider: "polyhaven",
      assetId: "studio_small_09",
      intensity: 0.95,
      rotationY: -0.18,
      showAsBackground: false
    },
    lights: [
      { role: "key", type: "rectArea", color: "#ffffff", intensity: 5.4, position: [2.6, 3.8, 3.6], target: [0, 0.82, 0], width: 3.8, height: 2.4 },
      { role: "keyShadow", type: "directional", color: "#f4f9ff", intensity: 1.45, position: [2.8, 4.1, 3.1], target: [0, 0.52, 0], castsShadow: true },
      { role: "fill", type: "rectArea", color: "#eaf4ff", intensity: 2.05, position: [-3.1, 2.25, 2.3], target: [0, 0.74, 0], width: 3, height: 2.6 },
      { role: "rim", type: "spot", color: "#e6f0ff", intensity: 15, position: [0, 3.1, -3.4], target: [0, 0.88, 0], distance: 10, angle: 0.62, penumbra: 0.5 },
      { role: "top", type: "rectArea", color: "#ffffff", intensity: 2.4, position: [0, 4.9, 0.25], target: [0, 0.48, 0], width: 3.4, height: 2.8 },
      { role: "accent", type: "spot", color: "#dcecff", intensity: 6.8, position: [-2.4, 2.15, -2.35], target: [0, 0.68, -0.24], distance: 7.5, angle: 0.5, penumbra: 0.6 },
      { role: "wallWash", type: "rectArea", color: "#ffffff", intensity: 1.35, position: [0, 1.8, -2.6], target: [0, 1.05, -3.4], width: 4.8, height: 2.8 },
      ...roomSafetyLights({
        roomColor: "#f8fbff",
        wallColor: "#f6fbff",
        ceilingColor: "#ffffff",
        groundColor: "#dbe7f2",
        roomIntensity: 0.16,
        wallIntensity: 0.42,
        ceilingIntensity: 0.24
      })
    ],
    modifiers: [
      { role: "reflector", enabled: true, placement: "left", color: "#ffffff", intensityEffect: 0.6, size: [1.35, 1.75], position: [-2.05, 1.25, 0.75], rotation: [0, 0.54, 0], visibleInRender: true },
      { role: "stripPanel", enabled: true, placement: "right", color: "#f3f9ff", intensityEffect: 0.46, size: [0.52, 1.6], position: [2.05, 1.22, 0.12], rotation: [0, -0.58, 0], visibleInRender: false }
    ]
  },
  camera: { mode: "birdViewOnly", fov: 26, pitch: 0.06, yaw: 0.02, distanceMultiplier: 4.6, targetHeightRatio: 0.52, allowFirstPerson: false, orbitEnabled: true },
  postProcessing: {
    toneMapping: ACES_TONE_MAPPING,
    exposure: 1.12,
    contrast: 0.045,
    saturation: -0.01,
    temperature: -0.04,
    tint: 0,
    vignette: 0.04,
    detail: 0.07,
    grain: { enabled: false, intensity: 0.08, grayscale: false },
    passes: {
      bloom: { enabled: true, strength: 0.34, radius: 0.32, threshold: 0.74 },
      bokeh: { enabled: true, focus: 8, aperture: 0.0006, maxblur: 0.0015 },
      gtao: { enabled: true, radius: 0.42, distanceFallOff: 1.45, thickness: 0.55, blendIntensity: 0.12 }
    }
  }
};
