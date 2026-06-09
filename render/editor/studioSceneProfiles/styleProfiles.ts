import * as THREE from "three";

import { DEFAULT_EDITOR_TONE_MAPPING } from "../runtime/colorManagement";
import type {
  PbrSurfaceConfig,
  StudioLayoutProfile,
  StudioSceneStyleProfile,
  StudioSceneStyleProfileId
} from "./types";
import { STUDIO_SCENE_STYLE_PROFILE_IDS } from "./types";

const DEFAULT_PRODUCT_FRAMING = {
  targetImageHeightRatio: [0.4, 0.7] as [number, number],
  centerOnPlinth: true,
  avoidIntersection: true
};

function surface(
  color: string,
  roughness: number,
  metalness = 0,
  emissive = "#000000",
  emissiveIntensity = 1
): PbrSurfaceConfig {
  return {
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
    opacity: 1
  };
}

function defaultLayout(
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

export const STUDIO_SCENE_STYLE_PROFILES: Record<
  StudioSceneStyleProfileId,
  StudioSceneStyleProfile
> = {
  cleanCommerce: {
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
        background: surface("#f8f7f3", 0.82),
        floor: surface("#e9e7df", 0.86),
        wall: surface("#f3f1eb", 0.82),
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
        { role: "accent", type: "spot", color: "#d8d2c5", intensity: 5.5, position: [-2.3, 2.4, -2.2], target: [0, 0.75, 0], distance: 7, angle: 0.48, penumbra: 0.55 }
      ],
      modifiers: [
        { role: "reflector", enabled: true, placement: "left", color: "#ffffff", intensityEffect: 0.55, size: [1.3, 1.7], position: [-2.05, 1.25, 0.75], rotation: [0, 0.54, 0], visibleInRender: true }
      ]
    },
    camera: { mode: "birdViewOnly", fov: 42, pitch: 0.18, yaw: Math.PI / 4, distanceMultiplier: 2.75, targetHeightRatio: 0.48, allowFirstPerson: false, orbitEnabled: true },
    postProcessing: {
      toneMapping: DEFAULT_EDITOR_TONE_MAPPING,
      exposure: 1,
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
  },
  premiumBeauty: {
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
        background: surface("#f6eee8", 0.72),
        floor: surface("#e8ddd4", 0.76),
        wall: surface("#f2e7df", 0.72),
        plinth: surface("#fff7ef", 0.48),
        decoration: surface("#d8a88d", 0.55, 0.05)
      }
    },
    lighting: {
      ibl: {
        enabled: true,
        provider: "polyhaven",
        assetId: "photo_studio_loft_hall",
        intensity: 0.72,
        rotationY: -0.1,
        showAsBackground: false
      },
      lights: [
        { role: "key", type: "rectArea", color: "#fff0df", intensity: 4.4, position: [1.9, 4.2, 3.2], target: [0, 0.85, 0], width: 3.4, height: 2.4 },
        { role: "keyShadow", type: "directional", color: "#ffead7", intensity: 1.5, position: [2.2, 4.4, 2.7], target: [0, 0.55, 0], castsShadow: true },
        { role: "fill", type: "rectArea", color: "#fff8f0", intensity: 1.4, position: [-3.1, 2.2, 2.6], target: [0, 0.75, 0], width: 2.6, height: 2.2 },
        { role: "rim", type: "spot", color: "#fff5ec", intensity: 15, position: [1.8, 2.8, -3.1], target: [0, 0.8, 0], distance: 9, angle: 0.52, penumbra: 0.46 },
        { role: "top", type: "rectArea", color: "#fff7ef", intensity: 1.5, position: [0, 4.6, 0.1], target: [0, 0.55, 0], width: 2.8, height: 2.6 },
        { role: "accent", type: "spot", color: "#d8a88d", intensity: 7.2, position: [-1.7, 2.7, -2.7], target: [0, 0.8, 0], distance: 7, angle: 0.42, penumbra: 0.62 }
      ],
      modifiers: [
        { role: "reflector", enabled: true, placement: "front", color: "#fff7ee", intensityEffect: 0.45, size: [1.4, 1.2], position: [-1.8, 0.95, 1.35], rotation: [-0.12, 0.38, 0], visibleInRender: true },
        { role: "stripPanel", enabled: true, placement: "right", color: "#f0bda1", intensityEffect: 0.42, size: [0.22, 1.8], position: [2.25, 1.45, -0.85], rotation: [0, -0.58, 0], visibleInRender: true }
      ]
    },
    camera: { mode: "birdViewOnly", fov: 38, pitch: 0.12, yaw: Math.PI / 5, distanceMultiplier: 2.9, targetHeightRatio: 0.5, allowFirstPerson: false, orbitEnabled: true },
    postProcessing: {
      toneMapping: THREE.ACESFilmicToneMapping,
      exposure: 1.08,
      contrast: 0.08,
      saturation: 0.04,
      temperature: 0.08,
      tint: 0.03,
      vignette: 0.18,
      detail: -0.08,
      grain: { enabled: false, intensity: 0.1, grayscale: false },
      passes: {
        bloom: { enabled: true, strength: 0.32, radius: 0.22, threshold: 0.88 },
        bokeh: { enabled: false, focus: 12, aperture: 0.004, maxblur: 0.006 }
      }
    }
  },
  darkTech: {
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
        background: surface("#07090d", 0.62, 0, "#09111d", 0.06),
        floor: surface("#11151d", 0.58, 0, "#0d1420", 0.08),
        wall: surface("#171b24", 0.62, 0, "#0f1725", 0.12),
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
        { role: "accent", type: "spot", color: "#2e88ff", intensity: 14, position: [2.3, 2.2, -2.4], target: [0, 0.75, 0], distance: 8, angle: 0.4, penumbra: 0.3 }
      ],
      modifiers: [
        { role: "negativeFill", enabled: false, placement: "left", color: "#05070a", intensityEffect: -0.42, size: [1.1, 1.7], position: [-2.15, 1.18, 0.55], rotation: [0, 0.5, 0], visibleInRender: false },
        { role: "stripPanel", enabled: true, placement: "right", color: "#2e88ff", intensityEffect: 0.5, size: [0.18, 1.9], position: [2.15, 1.35, -1.0], rotation: [0, -0.58, 0], visibleInRender: true }
      ]
    },
    camera: { mode: "birdViewOnly", fov: 40, pitch: 0.12, yaw: Math.PI / 4.5, distanceMultiplier: 2.85, targetHeightRatio: 0.48, allowFirstPerson: false, orbitEnabled: true },
    postProcessing: {
      toneMapping: THREE.ACESFilmicToneMapping,
      exposure: 1.02,
      contrast: 0.18,
      saturation: -0.04,
      temperature: -0.1,
      tint: 0.04,
      vignette: 0.28,
      detail: 0.18,
      grain: { enabled: false, intensity: 0.12, grayscale: false },
      passes: {
        bloom: { enabled: true, strength: 0.55, radius: 0.18, threshold: 0.78 },
        gtao: { enabled: true, radius: 0.5, distanceFallOff: 1, thickness: 1, blendIntensity: 0.38 }
      }
    }
  },
  warmLifestyle: {
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
        background: surface("#2b211c", 0.82),
        floor: surface("#8c6548", 0.78),
        wall: surface("#c9b49b", 0.8),
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
        { role: "accent", type: "spot", color: "#73513a", intensity: 6.2, position: [2.1, 2.2, -2.3], target: [0, 0.7, 0], distance: 7, angle: 0.5, penumbra: 0.55 }
      ],
      modifiers: [
        { role: "reflector", enabled: true, placement: "right", color: "#ffe2bd", intensityEffect: 0.48, size: [1.25, 1.45], position: [2.05, 1.12, 0.7], rotation: [0, -0.5, 0], visibleInRender: true }
      ]
    },
    camera: { mode: "birdViewOnly", fov: 44, pitch: 0.15, yaw: Math.PI / 5, distanceMultiplier: 2.9, targetHeightRatio: 0.48, allowFirstPerson: false, orbitEnabled: true },
    postProcessing: {
      toneMapping: THREE.ACESFilmicToneMapping,
      exposure: 1.02,
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
  },
  galleryNeutral: {
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
        background: surface("#eee9df", 0.78),
        floor: surface("#cfc7b7", 0.8),
        wall: surface("#ddd5c8", 0.76),
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
        { role: "accent", type: "spot", color: "#9c8f7b", intensity: 3.8, position: [-2.2, 2.3, -2.4], target: [0, 0.75, 0], distance: 7, angle: 0.52, penumbra: 0.5 }
      ],
      modifiers: [
        { role: "reflector", enabled: true, placement: "front", color: "#f4efe5", intensityEffect: 0.36, size: [1.25, 1.3], position: [-1.75, 0.95, 1.25], rotation: [-0.08, 0.34, 0], visibleInRender: true },
        { role: "reflector", enabled: true, placement: "top", color: "#eee9df", intensityEffect: 0.22, size: [1.6, 0.8], position: [0.3, 2.8, 0.2], rotation: [Math.PI / 2, 0, 0], visibleInRender: true }
      ]
    },
    camera: { mode: "birdViewOnly", fov: 38, pitch: 0.1, yaw: Math.PI / 6, distanceMultiplier: 3.05, targetHeightRatio: 0.5, allowFirstPerson: false, orbitEnabled: true },
    postProcessing: {
      toneMapping: THREE.ACESFilmicToneMapping,
      exposure: 1,
      contrast: 0.03,
      saturation: -0.02,
      temperature: 0.03,
      tint: 0,
      vignette: 0.16,
      detail: 0.05,
      grain: { enabled: false, intensity: 0.08, grayscale: false },
      passes: {}
    }
  },
  playfulBright: {
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
        background: surface("#f5f8ff", 0.76),
        floor: surface("#e1ecff", 0.78),
        wall: surface("#f8fbff", 0.76),
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
        { role: "accent", type: "point", color: "#ffb84d", intensity: 5, position: [-1.8, 1.5, -1.7], target: [0, 0.75, 0], distance: 5 }
      ],
      modifiers: [
        { role: "reflector", enabled: true, placement: "left", color: "#ffffff", intensityEffect: 0.52, size: [1.2, 1.4], position: [-2, 1.1, 0.75], rotation: [0, 0.5, 0], visibleInRender: true },
        { role: "stripPanel", enabled: true, placement: "right", color: "#ffb84d", intensityEffect: 0.45, size: [0.2, 1.6], position: [2.05, 1.25, -0.95], rotation: [0, -0.56, 0], visibleInRender: true }
      ]
    },
    camera: { mode: "birdViewOnly", fov: 43, pitch: 0.16, yaw: Math.PI / 4.2, distanceMultiplier: 2.8, targetHeightRatio: 0.48, allowFirstPerson: false, orbitEnabled: true },
    postProcessing: {
      toneMapping: THREE.ACESFilmicToneMapping,
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
  }
};

export const DEFAULT_STUDIO_SCENE_STYLE_PROFILE_ID: StudioSceneStyleProfileId =
  "cleanCommerce";

export function getStudioSceneStyleProfile(id: StudioSceneStyleProfileId) {
  return STUDIO_SCENE_STYLE_PROFILES[id];
}

export function isStudioSceneStyleProfileId(
  value: string
): value is StudioSceneStyleProfileId {
  return STUDIO_SCENE_STYLE_PROFILE_IDS.some((id) => id === value);
}
