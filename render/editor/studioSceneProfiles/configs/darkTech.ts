import type { StudioSceneStyleProfile } from "../types";
import { ACES_TONE_MAPPING, defaultLayout, roomSafetyLights, surface } from "./shared";

export const darkTechStyleProfile: StudioSceneStyleProfile = {
  id: "darkTech",
  version: 1,
  labelKey: "editor.studioScene.style.darkTech",
  descriptionKey: "editor.studioScene.style.darkTech.description",
  productRules: {
    productTypes: ["tech"],
    materials: ["metallic", "glossy", "glass", "plastic"],
    brandColorUsage: "subtleBoth"
  },
  layout: defaultLayout(
    "minimalBox",
    "cylinder",
    { widthMultiplier: 7, depthMultiplier: 6.5, heightMultiplier: 2.45 },
    { fitPaddingRatio: 1.18, minRadius: 0.74, heightRatio: 0.32, clearance: 0.325 }
  ),
  materials: {
    palette: {
      background: "#07090d",
      floor: "#11151d",
      wall: "#171b24",
      plinth: "#191f2b",
      accent: "#2e88ff"
    },
    surfaces: {
      background: surface("#07090d", 0.62, 0, "#09111d", 0.11),
      floor: surface("#11151d", 0.58, 0, "#0d1420", 0.08),
      wall: surface("#171b24", 0.62, 0, "#142033", 0.22),
      plinth: surface("#191f2b", 0.45, 0.15, "#0c1524", 0.08),
      decoration: surface("#2e88ff", 0.42, 0.1, "#0b2444", 0.8)
    }
  },
  lighting: {
    ibl: {
      enabled: true,
      provider: "polyhaven",
      assetId: "studio_kontrast_02",
      intensity: 0.95,
      rotationY: 0.15,
      showAsBackground: false
    },
    lights: [
      { role: "key", type: "rectArea", color: "#dbe9ff", intensity: 3, position: [2.8, 3.8, 3], target: [0, 0.9, 0], width: 2.6, height: 1.7 },
      { role: "keyShadow", type: "directional", color: "#b8d4ff", intensity: 2.4, position: [2.7, 4, 2.6], target: [0, 0.5, 0], castsShadow: true },
      { role: "fill", type: "hemisphere", color: "#8db8ff", groundColor: "#243246", intensity: 1.15, position: [0, 4.2, 0], target: [0, 0.7, 0] },
      { role: "rim", type: "spot", color: "#62a8ff", intensity: 26, position: [-1.5, 2.8, -3.2], target: [0, 0.9, 0], distance: 10, angle: 0.5, penumbra: 0.25 },
      { role: "top", type: "rectArea", color: "#b9d3ff", intensity: 1.9, position: [0, 4.6, -0.1], target: [0, 0.55, 0], width: 2.8, height: 2.8 },
      { role: "accent", type: "spot", color: "#2e88ff", intensity: 14, position: [2.3, 2.2, -2.4], target: [0, 0.75, 0], distance: 8, angle: 0.4, penumbra: 0.3 },
      ...roomSafetyLights({
        roomColor: "#405875",
        wallColor: "#365272",
        ceilingColor: "#4b6687",
        groundColor: "#121823",
        roomIntensity: 0.14,
        wallIntensity: 0.26,
        ceilingIntensity: 0.16
      })
    ],
    modifiers: [
      { role: "negativeFill", enabled: false, placement: "left", color: "#05070a", intensityEffect: -0.42, size: [1.1, 1.7], position: [-2.15, 1.18, 0.55], rotation: [0, 0.5, 0], visibleInRender: false },
      { role: "stripPanel", enabled: true, placement: "right", color: "#2e88ff", intensityEffect: 0.5, size: [0.18, 1.9], position: [2.15, 1.35, -1.0], rotation: [0, -0.58, 0], visibleInRender: true }
    ]
  },
  camera: { mode: "birdViewOnly", fov: 40, pitch: 0.12, yaw: Math.PI / 4.5, distanceMultiplier: 2.85, targetHeightRatio: 0.48, allowFirstPerson: false, orbitEnabled: true },
  postProcessing: {
    toneMapping: ACES_TONE_MAPPING,
    exposure: 1.06,
    contrast: 0.14,
    saturation: -0.04,
    temperature: -0.1,
    tint: 0.04,
    vignette: 0.28,
    detail: 0.04,
    grain: { enabled: false, intensity: 0.12, grayscale: false },
    passes: {
      bloom: { enabled: true, strength: 0.55, radius: 0.18, threshold: 0.78 },
      gtao: { enabled: true, radius: 0.45, distanceFallOff: 1.2, thickness: 0.7, blendIntensity: 0.26 }
    }
  }
};
