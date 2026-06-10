import type { StudioSceneStyleProfile } from "../types";
import { ACES_TONE_MAPPING, defaultLayout, roomSafetyLights, surface } from "./shared";

export const premiumBeautyStyleProfile: StudioSceneStyleProfile = {
  id: "premiumBeauty",
  version: 1,
  labelKey: "editor.studioScene.style.premiumBeauty",
  descriptionKey: "editor.studioScene.style.premiumBeauty.description",
  productRules: {
    productTypes: ["beauty", "jewelry"],
    materials: ["glass", "glossy", "metallic"],
    brandColorUsage: "subtleBoth"
  },
  layout: defaultLayout(
    "galleryWall",
    "cylinder",
    { widthMultiplier: 6.8, depthMultiplier: 6.2, heightMultiplier: 2.5 },
    { fitPaddingRatio: 1.22, minRadius: 0.68, heightRatio: 0.3, clearance: 0.325 }
  ),
  materials: {
    palette: {
      background: "#f6eee8",
      floor: "#e8ddd4",
      wall: "#f2e7df",
      plinth: "#fff7ef",
      accent: "#d8a88d"
    },
    surfaces: {
      background: surface("#f6eee8", 0.72, 0, "#fff0e5", 0.045),
      floor: surface("#e8ddd4", 0.76, 0, "#f6ebe0", 0.02),
      wall: surface("#f2e7df", 0.72, 0, "#fff0e5", 0.05),
      plinth: surface("#fff7ef", 0.48),
      decoration: surface("#d8a88d", 0.55, 0.05)
    }
  },
  lighting: {
    ibl: {
      enabled: true,
      provider: "polyhaven",
      assetId: "photo_studio_loft_hall",
      intensity: 0.58,
      rotationY: -0.1,
      showAsBackground: false
    },
    lights: [
      { role: "key", type: "rectArea", color: "#fff0df", intensity: 4.4, position: [1.9, 4.2, 3.2], target: [0, 0.85, 0], width: 3.4, height: 2.4 },
      { role: "keyShadow", type: "directional", color: "#ffead7", intensity: 1.5, position: [2.2, 4.4, 2.7], target: [0, 0.55, 0], castsShadow: true },
      { role: "fill", type: "rectArea", color: "#fff8f0", intensity: 1.4, position: [-3.1, 2.2, 2.6], target: [0, 0.75, 0], width: 2.6, height: 2.2 },
      { role: "rim", type: "spot", color: "#fff5ec", intensity: 15, position: [1.8, 2.8, -3.1], target: [0, 0.8, 0], distance: 9, angle: 0.52, penumbra: 0.46 },
      { role: "top", type: "rectArea", color: "#fff7ef", intensity: 1.5, position: [0, 4.6, 0.1], target: [0, 0.55, 0], width: 2.8, height: 2.6 },
      { role: "accent", type: "spot", color: "#d8a88d", intensity: 7.2, position: [-1.7, 2.7, -2.7], target: [0, 0.8, 0], distance: 7, angle: 0.42, penumbra: 0.62 },
      ...roomSafetyLights({
        roomColor: "#fff2e8",
        wallColor: "#ffeadd",
        ceilingColor: "#fff8f1",
        groundColor: "#ead7c9",
        roomIntensity: 0.16,
        wallIntensity: 0.28,
        ceilingIntensity: 0.16
      })
    ],
    modifiers: [
      { role: "reflector", enabled: true, placement: "front", color: "#fff7ee", intensityEffect: 0.45, size: [1.4, 1.2], position: [-1.8, 0.95, 1.35], rotation: [-0.12, 0.38, 0], visibleInRender: true },
      { role: "stripPanel", enabled: true, placement: "right", color: "#f0bda1", intensityEffect: 0.42, size: [0.22, 1.8], position: [2.25, 1.45, -0.85], rotation: [0, -0.58, 0], visibleInRender: true }
    ]
  },
  camera: { mode: "birdViewOnly", fov: 38, pitch: 0.12, yaw: Math.PI / 5, distanceMultiplier: 2.9, targetHeightRatio: 0.5, allowFirstPerson: false, orbitEnabled: true },
  postProcessing: {
    toneMapping: ACES_TONE_MAPPING,
    exposure: 0.96,
    contrast: 0.05,
    saturation: 0.04,
    temperature: 0.08,
    tint: 0.03,
    vignette: 0.18,
    detail: -0.08,
    grain: { enabled: false, intensity: 0.1, grayscale: false },
    passes: {
      bloom: { enabled: true, strength: 0.12, radius: 0.12, threshold: 0.96 },
      bokeh: { enabled: false, focus: 12, aperture: 0.004, maxblur: 0.006 }
    }
  }
};
