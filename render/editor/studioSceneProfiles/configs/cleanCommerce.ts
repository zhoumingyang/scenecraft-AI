import type { StudioSceneStyleProfile } from "../types";
import {
  DEFAULT_EDITOR_TONE_MAPPING,
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
    "cylinder",
    { widthMultiplier: 7, depthMultiplier: 6.5, heightMultiplier: 2.4 },
    { fitPaddingRatio: 1.16, minRadius: 0.72, heightRatio: 0.32, clearance: 0.325 }
  ),
  materials: {
    palette: {
      background: "#f8f7f3",
      floor: "#e9e7df",
      wall: "#f3f1eb",
      plinth: "#f7f5ef",
      accent: "#d8d2c5"
    },
    surfaces: {
      background: surface("#f8f7f3", 0.82, 0, "#f8f3e8", 0.08),
      floor: surface("#e9e7df", 0.86, 0, "#f1eee6", 0.025),
      wall: surface("#f3f1eb", 0.82, 0, "#f8f3e8", 0.09),
      plinth: surface("#f7f5ef", 0.68),
      decoration: surface("#d8d2c5", 0.78)
    }
  },
  lighting: {
    ibl: {
      enabled: true,
      provider: "polyhaven",
      assetId: "studio_small_09",
      intensity: 0.8,
      rotationY: -0.35,
      showAsBackground: false
    },
    lights: [
      { role: "key", type: "rectArea", color: "#fffaf0", intensity: 4.6, position: [3.2, 4.1, 3.4], target: [0, 0.9, 0], width: 3.4, height: 2.1 },
      { role: "keyShadow", type: "directional", color: "#fff4df", intensity: 1.9, position: [3.1, 4.2, 2.9], target: [0, 0.55, 0], castsShadow: true },
      { role: "fill", type: "rectArea", color: "#f3fbff", intensity: 1.6, position: [-3.2, 2.4, 2.4], target: [0, 0.7, 0], width: 2.8, height: 2.4 },
      { role: "rim", type: "spot", color: "#e2ecff", intensity: 12, position: [0, 3.2, -3.3], target: [0, 0.9, 0], distance: 10, angle: 0.58, penumbra: 0.42 },
      { role: "top", type: "rectArea", color: "#ffffff", intensity: 1.9, position: [0, 4.8, 0.2], target: [0, 0.4, 0], width: 3.2, height: 2.6 },
      { role: "accent", type: "spot", color: "#d8d2c5", intensity: 5.5, position: [-2.3, 2.4, -2.2], target: [0, 0.75, 0], distance: 7, angle: 0.48, penumbra: 0.55 },
      ...roomSafetyLights({
        roomColor: "#fffaf0",
        wallColor: "#fff7ea",
        ceilingColor: "#ffffff",
        groundColor: "#e6e2d8",
        roomIntensity: 0.18,
        wallIntensity: 0.48,
        ceilingIntensity: 0.28
      })
    ],
    modifiers: [
      { role: "reflector", enabled: true, placement: "left", color: "#ffffff", intensityEffect: 0.55, size: [1.3, 1.7], position: [-2.05, 1.25, 0.75], rotation: [0, 0.54, 0], visibleInRender: true }
    ]
  },
  camera: { mode: "birdViewOnly", fov: 42, pitch: 0.18, yaw: Math.PI / 4, distanceMultiplier: 2.75, targetHeightRatio: 0.48, allowFirstPerson: false, orbitEnabled: true },
  postProcessing: {
    toneMapping: DEFAULT_EDITOR_TONE_MAPPING,
    exposure: 1.04,
    contrast: 0.04,
    saturation: 0.02,
    temperature: 0.02,
    tint: 0,
    vignette: 0.12,
    detail: 0.08,
    grain: { enabled: false, intensity: 0.08, grayscale: false },
    passes: {
      bloom: { enabled: false, strength: 0.5, radius: 0.15, threshold: 0.9 },
      gtao: { enabled: false, radius: 0.5, distanceFallOff: 1, thickness: 1, blendIntensity: 1 }
    }
  }
};
