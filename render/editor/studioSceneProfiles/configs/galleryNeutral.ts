import type { StudioSceneStyleProfile } from "../types";
import { ACES_TONE_MAPPING, defaultLayout, roomSafetyLights, surface } from "./shared";

export const galleryNeutralStyleProfile: StudioSceneStyleProfile = {
  id: "galleryNeutral",
  version: 1,
  labelKey: "editor.studioScene.style.galleryNeutral",
  descriptionKey: "editor.studioScene.style.galleryNeutral.description",
  productRules: {
    productTypes: ["furniture", "home", "jewelry"],
    materials: ["wood", "ceramic", "matte", "metallic"],
    brandColorUsage: "none"
  },
  layout: defaultLayout(
    "galleryWall",
    "cylinder",
    { widthMultiplier: 7.4, depthMultiplier: 7, heightMultiplier: 2.6 },
    { fitPaddingRatio: 1.25, minRadius: 0.82, heightRatio: 0.28, clearance: 0.325 }
  ),
  materials: {
    palette: {
      background: "#eee9df",
      floor: "#cfc7b7",
      wall: "#ddd5c8",
      plinth: "#f2eee6",
      accent: "#9c8f7b"
    },
    surfaces: {
      background: surface("#eee9df", 0.78, 0, "#f2eadf", 0.08),
      floor: surface("#cfc7b7", 0.8, 0, "#ded5c5", 0.03),
      wall: surface("#ddd5c8", 0.76, 0, "#eee5d7", 0.09),
      plinth: surface("#f2eee6", 0.62),
      decoration: surface("#9c8f7b", 0.7)
    }
  },
  lighting: {
    ibl: {
      enabled: true,
      provider: "polyhaven",
      assetId: "photo_studio_loft_hall",
      intensity: 0.62,
      rotationY: -0.1,
      showAsBackground: false
    },
    lights: [
      { role: "key", type: "rectArea", color: "#fff2df", intensity: 3.8, position: [0, 4.4, 2.6], target: [0, 0.8, 0], width: 3.2, height: 1.4 },
      { role: "keyShadow", type: "directional", color: "#fff0dc", intensity: 1.4, position: [0.7, 4.6, 2.5], target: [0, 0.55, 0], castsShadow: true },
      { role: "fill", type: "rectArea", color: "#f3f8ff", intensity: 1.2, position: [-3.1, 2.5, 2.3], target: [0, 0.7, 0], width: 2.4, height: 2.1 },
      { role: "rim", type: "spot", color: "#ffffff", intensity: 11, position: [2.3, 2.8, -2.8], target: [0, 0.8, 0], distance: 8, angle: 0.55, penumbra: 0.36 },
      { role: "top", type: "rectArea", color: "#f7f5ef", intensity: 1.7, position: [0, 4.8, 0.1], target: [0, 0.55, 0], width: 3.4, height: 2.4 },
      { role: "accent", type: "spot", color: "#9c8f7b", intensity: 3.8, position: [-2.2, 2.3, -2.4], target: [0, 0.75, 0], distance: 7, angle: 0.52, penumbra: 0.5 },
      ...roomSafetyLights({
        roomColor: "#fff4e5",
        wallColor: "#f8ead8",
        ceilingColor: "#fff8ef",
        groundColor: "#c7bcaa",
        roomIntensity: 0.16,
        wallIntensity: 0.36,
        ceilingIntensity: 0.22
      })
    ],
    modifiers: [
      { role: "reflector", enabled: true, placement: "front", color: "#f4efe5", intensityEffect: 0.36, size: [1.25, 1.3], position: [-1.75, 0.95, 1.25], rotation: [-0.08, 0.34, 0], visibleInRender: true },
      { role: "reflector", enabled: true, placement: "top", color: "#eee9df", intensityEffect: 0.22, size: [1.6, 0.8], position: [0.3, 2.8, 0.2], rotation: [Math.PI / 2, 0, 0], visibleInRender: true }
    ]
  },
  camera: { mode: "birdViewOnly", fov: 38, pitch: 0.1, yaw: Math.PI / 6, distanceMultiplier: 3.05, targetHeightRatio: 0.5, allowFirstPerson: false, orbitEnabled: true },
  postProcessing: {
    toneMapping: ACES_TONE_MAPPING,
    exposure: 1.04,
    contrast: 0.03,
    saturation: -0.02,
    temperature: 0.03,
    tint: 0,
    vignette: 0.16,
    detail: 0.05,
    grain: { enabled: false, intensity: 0.08, grayscale: false },
    passes: {}
  }
};
