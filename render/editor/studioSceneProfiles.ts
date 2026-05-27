import * as THREE from "three";

import type { TranslationKey } from "@/lib/i18n";
import type { BindingRegistry } from "./bindings/bindingRegistry";
import type {
  EditorEnvConfigJSON,
  ResolvedMeshMaterialJSON,
  Vec3Tuple
} from "./core/types";
import type { EditorProjectModel } from "./models";
import { DEFAULT_EDITOR_TONE_MAPPING } from "./runtime/colorManagement";

export const STUDIO_PRODUCT_TYPES = [
  "generic",
  "tech",
  "beauty",
  "jewelry",
  "fashion",
  "footwear",
  "food",
  "home",
  "furniture",
  "toy"
] as const;

export const STUDIO_PRODUCT_MATERIALS = [
  "unknown",
  "matte",
  "glossy",
  "metallic",
  "glass",
  "plastic",
  "fabric",
  "leather",
  "ceramic",
  "wood",
  "mixed"
] as const;

export const STUDIO_SCENE_STYLE_PROFILE_IDS = [
  "cleanCommerce",
  "premiumBeauty",
  "darkTech",
  "warmLifestyle",
  "galleryNeutral",
  "playfulBright"
] as const;

export type StudioProductType = (typeof STUDIO_PRODUCT_TYPES)[number];
export type StudioProductMaterial = (typeof STUDIO_PRODUCT_MATERIALS)[number];
export type StudioSceneStyleProfileId = (typeof STUDIO_SCENE_STYLE_PROFILE_IDS)[number];

export type StudioProductProfile = {
  productType: StudioProductType;
  material: StudioProductMaterial;
  brandColor: string | null;
};

export type PbrSurfaceConfig = {
  color: string;
  roughness: number;
  metalness: number;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
};

export type StudioLayoutProfile = {
  background: {
    type: "minimalBox" | "coveStudio" | "cornerStudio" | "galleryWall";
    seamless: boolean;
    cornerRadiusRatio: number;
    widthMultiplier: number;
    depthMultiplier: number;
    heightMultiplier: number;
  };
  plinth: {
    type:
      | "cylinder"
      | "roundedBox"
      | "box"
      | "square"
      | "tiered"
      | "multiLevel"
      | "beveled"
      | "floating"
      | "extrudedShape";
    fitPaddingRatio: number;
    minRadius: number;
    heightRatio: number;
    clearance: number;
    allowDelete: false;
    allowHide: false;
  };
  decorations: Array<{
    role:
      | "sphere"
      | "cylinder"
      | "ring"
      | "box"
      | "roundedBox"
      | "arch"
      | "semiDisc"
      | "verticalPanel"
      | "curvedPanel"
      | "wavePanel"
      | "floatingGeometry"
      | "extrudedShape";
    count: number;
    placement: "back" | "side" | "floor" | "floating";
    brightnessRatioToProduct: number;
    saturationMode: "desaturated" | "brandAccent" | "neutral";
  }>;
  productFraming: {
    targetImageHeightRatio: [number, number];
    centerOnPlinth: boolean;
    avoidIntersection: boolean;
  };
};

export type StudioMaterialProfile = {
  palette: {
    background: string;
    floor: string;
    wall: string;
    plinth: string;
    accent: string;
  };
  surfaces: {
    background: PbrSurfaceConfig;
    floor: PbrSurfaceConfig;
    wall: PbrSurfaceConfig;
    plinth: PbrSurfaceConfig;
    decoration: PbrSurfaceConfig;
  };
};

export type StudioLightingProfile = {
  ibl: {
    enabled: boolean;
    provider: "polyhaven" | "local" | "none";
    assetId?: string;
    url?: string;
    intensity: number;
    rotationY: number;
    showAsBackground: false;
  };
  lights: Array<{
    role: "key" | "keyShadow" | "fill" | "rim" | "top" | "accent";
    type: "rectArea" | "directional" | "spot" | "point";
    color: string;
    intensity: number;
    position: Vec3Tuple;
    target: Vec3Tuple;
    width?: number;
    height?: number;
    distance?: number;
    angle?: number;
    penumbra?: number;
    castsShadow?: boolean;
  }>;
  modifiers: Array<{
    role: "reflector" | "negativeFill" | "stripPanel";
    enabled: boolean;
    placement: "left" | "right" | "front" | "back" | "top";
    color: string;
    intensityEffect: number;
    size: [number, number];
    position: Vec3Tuple;
    rotation: Vec3Tuple;
    visibleInRender: boolean;
  }>;
};

export type StudioCameraProfile = {
  mode: "birdViewOnly";
  fov: number;
  pitch: number;
  yaw: number;
  distanceMultiplier: number;
  targetHeightRatio: number;
  allowFirstPerson: false;
  orbitEnabled: true;
};

export type StudioPostProcessingProfile = {
  toneMapping: number;
  exposure: number;
  saturation?: number;
  contrast?: number;
  temperature?: number;
  tint?: number;
  passes: {
    bloom?: {
      enabled: boolean;
      strength: number;
      radius: number;
      threshold: number;
    };
    bokeh?: {
      enabled: boolean;
      focus: number;
      aperture: number;
      maxblur: number;
    };
    film?: {
      enabled: boolean;
      intensity: number;
      grayscale: boolean;
    };
    gtao?: {
      enabled: boolean;
      radius: number;
      distanceFallOff: number;
      thickness: number;
      blendIntensity: number;
    };
  };
};

export type StudioSceneStyleProfile = {
  id: StudioSceneStyleProfileId;
  version: 1;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  productRules: {
    productTypes: StudioProductType[];
    materials: StudioProductMaterial[];
    brandColorUsage: "none" | "accent" | "lightTint" | "subtleBoth";
  };
  layout: StudioLayoutProfile;
  materials: StudioMaterialProfile;
  lighting: StudioLightingProfile;
  camera: StudioCameraProfile;
  postProcessing: StudioPostProcessingProfile;
};

export type StudioSceneStyleSelectionMode = "auto" | "manual";

export type StudioScenePresetFromStyleProfile = {
  id: StudioSceneStyleProfileId;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  layout: StudioLayoutProfile;
  materials: StudioMaterialProfile;
  backgroundColor: string;
  floorColor: string;
  wallColor: string;
  accentColor: string;
  plinthColor: string;
  targetLift: number;
  cameraFov: number;
  cameraPitch: number;
  cameraYaw: number;
  cameraDistanceMultiplier: number;
  hdri: {
    provider: "polyhaven";
    assetId: string;
    preferredResolution: string;
    preferredFormat: string;
    environmentIntensity: number;
    environmentRotationY: number;
  };
  keyLight: {
    color: string;
    intensity: number;
    position: Vec3Tuple;
    target: Vec3Tuple;
    width?: number;
    height?: number;
    distance?: number;
    angle?: number;
    penumbra?: number;
  };
  fillLight: {
    color: string;
    intensity: number;
    position: Vec3Tuple;
    target: Vec3Tuple;
    width?: number;
    height?: number;
    distance?: number;
    angle?: number;
    penumbra?: number;
  };
  rimLight: {
    color: string;
    intensity: number;
    position: Vec3Tuple;
    target: Vec3Tuple;
    width?: number;
    height?: number;
    distance?: number;
    angle?: number;
    penumbra?: number;
  };
};

const DEFAULT_PRODUCT_FRAMING = {
  targetImageHeightRatio: [0.4, 0.7] as [number, number],
  centerOnPlinth: true,
  avoidIntersection: true
};

function surface(color: string, roughness: number, metalness = 0, emissive = "#000000", emissiveIntensity = 1): PbrSurfaceConfig {
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
  multipliers: Pick<StudioLayoutProfile["background"], "widthMultiplier" | "depthMultiplier" | "heightMultiplier">,
  plinth: Pick<StudioLayoutProfile["plinth"], "fitPaddingRatio" | "minRadius" | "heightRatio" | "clearance">
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

export const STUDIO_SCENE_STYLE_PROFILES: Record<StudioSceneStyleProfileId, StudioSceneStyleProfile> = {
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
    layout: defaultLayout("minimalBox", "cylinder", { widthMultiplier: 7, depthMultiplier: 6.5, heightMultiplier: 2.4 }, { fitPaddingRatio: 1.16, minRadius: 0.72, heightRatio: 0.32, clearance: 0.325 }),
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
      ibl: { enabled: true, provider: "polyhaven", assetId: "studio_small_09", intensity: 0.8, rotationY: -0.35, showAsBackground: false },
      lights: [
        { role: "key", type: "rectArea", color: "#fffaf0", intensity: 4.6, position: [3.2, 4.1, 3.4], target: [0, 0.9, 0], width: 3.4, height: 2.1 },
        { role: "fill", type: "rectArea", color: "#f3fbff", intensity: 1.6, position: [-3.2, 2.4, 2.4], target: [0, 0.7, 0], width: 2.8, height: 2.4 },
        { role: "rim", type: "spot", color: "#e2ecff", intensity: 12, position: [0, 3.2, -3.3], target: [0, 0.9, 0], distance: 10, angle: 0.58, penumbra: 0.42 }
      ],
      modifiers: []
    },
    camera: { mode: "birdViewOnly", fov: 42, pitch: 0.18, yaw: Math.PI / 4, distanceMultiplier: 2.75, targetHeightRatio: 0.48, allowFirstPerson: false, orbitEnabled: true },
    postProcessing: {
      toneMapping: DEFAULT_EDITOR_TONE_MAPPING,
      exposure: 1,
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
    layout: defaultLayout("galleryWall", "cylinder", { widthMultiplier: 6.8, depthMultiplier: 6.2, heightMultiplier: 2.5 }, { fitPaddingRatio: 1.22, minRadius: 0.68, heightRatio: 0.3, clearance: 0.325 }),
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
      ibl: { enabled: true, provider: "polyhaven", assetId: "photo_studio_loft_hall", intensity: 0.72, rotationY: -0.1, showAsBackground: false },
      lights: [
        { role: "key", type: "rectArea", color: "#fff0df", intensity: 4.4, position: [1.9, 4.2, 3.2], target: [0, 0.85, 0], width: 3.4, height: 2.4 },
        { role: "fill", type: "rectArea", color: "#fff8f0", intensity: 1.4, position: [-3.1, 2.2, 2.6], target: [0, 0.75, 0], width: 2.6, height: 2.2 },
        { role: "rim", type: "spot", color: "#fff5ec", intensity: 15, position: [1.8, 2.8, -3.1], target: [0, 0.8, 0], distance: 9, angle: 0.52, penumbra: 0.46 }
      ],
      modifiers: []
    },
    camera: { mode: "birdViewOnly", fov: 38, pitch: 0.12, yaw: Math.PI / 5, distanceMultiplier: 2.9, targetHeightRatio: 0.5, allowFirstPerson: false, orbitEnabled: true },
    postProcessing: {
      toneMapping: THREE.ACESFilmicToneMapping,
      exposure: 1.08,
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
    layout: defaultLayout("minimalBox", "cylinder", { widthMultiplier: 7, depthMultiplier: 6.5, heightMultiplier: 2.45 }, { fitPaddingRatio: 1.18, minRadius: 0.74, heightRatio: 0.32, clearance: 0.325 }),
    materials: {
      palette: {
        background: "#07090d",
        floor: "#11151d",
        wall: "#171b24",
        plinth: "#191f2b",
        accent: "#2e88ff"
      },
      surfaces: {
        background: surface("#07090d", 0.62),
        floor: surface("#11151d", 0.58),
        wall: surface("#171b24", 0.62),
        plinth: surface("#191f2b", 0.45, 0.15),
        decoration: surface("#2e88ff", 0.42, 0.1, "#0b2444", 0.8)
      }
    },
    lighting: {
      ibl: { enabled: true, provider: "polyhaven", assetId: "studio_kontrast_02", intensity: 0.95, rotationY: 0.15, showAsBackground: false },
      lights: [
        { role: "key", type: "rectArea", color: "#dbe9ff", intensity: 3, position: [2.8, 3.8, 3], target: [0, 0.9, 0], width: 2.6, height: 1.7 },
        { role: "fill", type: "rectArea", color: "#274f95", intensity: 0.8, position: [-3.5, 1.9, 1.4], target: [0, 0.7, 0], width: 2.1, height: 2.8 },
        { role: "rim", type: "spot", color: "#62a8ff", intensity: 26, position: [-1.5, 2.8, -3.2], target: [0, 0.9, 0], distance: 10, angle: 0.5, penumbra: 0.25 }
      ],
      modifiers: []
    },
    camera: { mode: "birdViewOnly", fov: 40, pitch: 0.12, yaw: Math.PI / 4.5, distanceMultiplier: 2.85, targetHeightRatio: 0.48, allowFirstPerson: false, orbitEnabled: true },
    postProcessing: {
      toneMapping: THREE.ACESFilmicToneMapping,
      exposure: 0.94,
      passes: {
        bloom: { enabled: true, strength: 0.55, radius: 0.18, threshold: 0.78 },
        gtao: { enabled: true, radius: 0.65, distanceFallOff: 1, thickness: 1, blendIntensity: 0.75 }
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
    layout: defaultLayout("cornerStudio", "cylinder", { widthMultiplier: 7.2, depthMultiplier: 6.8, heightMultiplier: 2.4 }, { fitPaddingRatio: 1.2, minRadius: 0.76, heightRatio: 0.31, clearance: 0.325 }),
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
      ibl: { enabled: true, provider: "polyhaven", assetId: "white_home_studio", intensity: 0.7, rotationY: 0.5, showAsBackground: false },
      lights: [
        { role: "key", type: "rectArea", color: "#ffd9ad", intensity: 3.4, position: [-3.4, 3.3, 2.6], target: [0, 0.8, 0], width: 2.8, height: 3.2 },
        { role: "fill", type: "rectArea", color: "#fff1dc", intensity: 1.1, position: [2.8, 2.2, 2.8], target: [0, 0.7, 0], width: 2.2, height: 1.8 },
        { role: "rim", type: "spot", color: "#ffbc76", intensity: 16, position: [1.8, 2.7, -2.8], target: [0, 0.8, 0], distance: 9, angle: 0.62, penumbra: 0.5 }
      ],
      modifiers: []
    },
    camera: { mode: "birdViewOnly", fov: 44, pitch: 0.15, yaw: Math.PI / 5, distanceMultiplier: 2.9, targetHeightRatio: 0.48, allowFirstPerson: false, orbitEnabled: true },
    postProcessing: {
      toneMapping: THREE.ACESFilmicToneMapping,
      exposure: 1.02,
      temperature: 0.18,
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
    layout: defaultLayout("galleryWall", "cylinder", { widthMultiplier: 7.4, depthMultiplier: 7, heightMultiplier: 2.6 }, { fitPaddingRatio: 1.25, minRadius: 0.82, heightRatio: 0.28, clearance: 0.325 }),
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
      ibl: { enabled: true, provider: "polyhaven", assetId: "photo_studio_loft_hall", intensity: 0.62, rotationY: -0.1, showAsBackground: false },
      lights: [
        { role: "key", type: "rectArea", color: "#fff2df", intensity: 3.8, position: [0, 4.4, 2.6], target: [0, 0.8, 0], width: 3.2, height: 1.4 },
        { role: "fill", type: "rectArea", color: "#f3f8ff", intensity: 1.2, position: [-3.1, 2.5, 2.3], target: [0, 0.7, 0], width: 2.4, height: 2.1 },
        { role: "rim", type: "spot", color: "#ffffff", intensity: 11, position: [2.3, 2.8, -2.8], target: [0, 0.8, 0], distance: 8, angle: 0.55, penumbra: 0.36 }
      ],
      modifiers: []
    },
    camera: { mode: "birdViewOnly", fov: 38, pitch: 0.1, yaw: Math.PI / 6, distanceMultiplier: 3.05, targetHeightRatio: 0.5, allowFirstPerson: false, orbitEnabled: true },
    postProcessing: {
      toneMapping: THREE.ACESFilmicToneMapping,
      exposure: 1,
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
    layout: defaultLayout("minimalBox", "cylinder", { widthMultiplier: 7, depthMultiplier: 6.4, heightMultiplier: 2.35 }, { fitPaddingRatio: 1.18, minRadius: 0.74, heightRatio: 0.34, clearance: 0.325 }),
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
      ibl: { enabled: true, provider: "polyhaven", assetId: "studio_small_09", intensity: 0.86, rotationY: -0.2, showAsBackground: false },
      lights: [
        { role: "key", type: "rectArea", color: "#fff8e7", intensity: 4.2, position: [2.8, 3.7, 3.1], target: [0, 0.85, 0], width: 3.3, height: 2 },
        { role: "fill", type: "rectArea", color: "#e8f4ff", intensity: 2, position: [-2.8, 2.2, 2.3], target: [0, 0.75, 0], width: 2.8, height: 2.5 },
        { role: "rim", type: "spot", color: "#ffe0a8", intensity: 12, position: [0.8, 2.8, -3], target: [0, 0.8, 0], distance: 9, angle: 0.6, penumbra: 0.44 }
      ],
      modifiers: []
    },
    camera: { mode: "birdViewOnly", fov: 43, pitch: 0.16, yaw: Math.PI / 4.2, distanceMultiplier: 2.8, targetHeightRatio: 0.48, allowFirstPerson: false, orbitEnabled: true },
    postProcessing: {
      toneMapping: THREE.ACESFilmicToneMapping,
      exposure: 1.06,
      saturation: 0.12,
      passes: {
        bloom: { enabled: false, strength: 0.3, radius: 0.18, threshold: 0.9 }
      }
    }
  }
};

export const DEFAULT_STUDIO_SCENE_STYLE_PROFILE_ID: StudioSceneStyleProfileId = "cleanCommerce";

export function getStudioSceneStyleProfile(id: StudioSceneStyleProfileId) {
  return STUDIO_SCENE_STYLE_PROFILES[id];
}

export function isStudioSceneStyleProfileId(value: string): value is StudioSceneStyleProfileId {
  return STUDIO_SCENE_STYLE_PROFILE_IDS.some((id) => id === value);
}

export function resolveStudioSceneStyleProfile(
  productProfile: StudioProductProfile,
  manualStyleId?: StudioSceneStyleProfileId | null
) {
  const baseProfile = manualStyleId
    ? getStudioSceneStyleProfile(manualStyleId)
    : productProfile.productType === "tech" || productProfile.material === "metallic"
      ? getStudioSceneStyleProfile("darkTech")
      : productProfile.productType === "beauty" || productProfile.productType === "jewelry"
        ? getStudioSceneStyleProfile("premiumBeauty")
        : resolveAutomaticStyleProfile(productProfile);
  return applyBrandColorToStyleProfile(baseProfile, productProfile.brandColor);
}

function resolveAutomaticStyleProfile(productProfile: StudioProductProfile) {
  if (
    productProfile.productType === "fashion" ||
    productProfile.productType === "footwear" ||
    productProfile.productType === "food" ||
    productProfile.material === "fabric" ||
    productProfile.material === "leather" ||
    productProfile.material === "wood"
  ) {
    return getStudioSceneStyleProfile("warmLifestyle");
  }
  if (productProfile.productType === "furniture" || productProfile.material === "ceramic") {
    return getStudioSceneStyleProfile("galleryNeutral");
  }
  if (productProfile.productType === "toy") {
    return getStudioSceneStyleProfile("playfulBright");
  }
  return getStudioSceneStyleProfile(DEFAULT_STUDIO_SCENE_STYLE_PROFILE_ID);
}

function applyBrandColorToStyleProfile(
  profile: StudioSceneStyleProfile,
  brandColor: string | null
): StudioSceneStyleProfile {
  if (!brandColor || profile.productRules.brandColorUsage === "none") {
    return profile;
  }

  const next = structuredClone(profile) as StudioSceneStyleProfile;
  const normalizedBrandColor = `#${new THREE.Color(brandColor).getHexString()}`;

  if (
    profile.productRules.brandColorUsage === "accent" ||
    profile.productRules.brandColorUsage === "subtleBoth"
  ) {
    next.materials.palette.accent = normalizedBrandColor;
    next.materials.surfaces.decoration.color = normalizedBrandColor;
  }

  if (
    profile.productRules.brandColorUsage === "lightTint" ||
    profile.productRules.brandColorUsage === "subtleBoth"
  ) {
    const rimLight = next.lighting.lights.find((light) => light.role === "rim");
    if (rimLight) {
      rimLight.color = normalizedBrandColor;
    }
  }

  return next;
}

export function createStudioPresetFromStyleProfile(
  profile: StudioSceneStyleProfile
): StudioScenePresetFromStyleProfile {
  const keyLight = profile.lighting.lights.find((light) => light.role === "key") ?? profile.lighting.lights[0];
  const fillLight = profile.lighting.lights.find((light) => light.role === "fill") ?? profile.lighting.lights[1] ?? keyLight;
  const rimLight = profile.lighting.lights.find((light) => light.role === "rim") ?? profile.lighting.lights[2] ?? keyLight;

  return {
    id: profile.id,
    labelKey: profile.labelKey,
    descriptionKey: profile.descriptionKey,
    layout: profile.layout,
    materials: profile.materials,
    backgroundColor: profile.materials.palette.background,
    floorColor: profile.materials.palette.floor,
    wallColor: profile.materials.palette.wall,
    accentColor: profile.materials.palette.accent,
    plinthColor: profile.materials.palette.plinth,
    targetLift: profile.layout.plinth.clearance,
    cameraFov: profile.camera.fov,
    cameraPitch: profile.camera.pitch,
    cameraYaw: profile.camera.yaw,
    cameraDistanceMultiplier: profile.camera.distanceMultiplier,
    hdri: {
      provider: "polyhaven",
      assetId: profile.lighting.ibl.assetId ?? "studio_small_09",
      preferredResolution: "1k",
      preferredFormat: "hdr",
      environmentIntensity: profile.lighting.ibl.intensity,
      environmentRotationY: profile.lighting.ibl.rotationY
    },
    keyLight,
    fillLight,
    rimLight
  };
}

export function createStudioEnvPatchFromStyleProfile(profile: StudioSceneStyleProfile): Partial<EditorEnvConfigJSON> {
  return {
    environment: profile.lighting.ibl.enabled ? 1 : 0,
    environmentIntensity: profile.lighting.ibl.intensity,
    backgroundShow: profile.lighting.ibl.showAsBackground ? 1 : 0,
    environmentRotationY: profile.lighting.ibl.rotationY,
    toneMapping: profile.postProcessing.toneMapping,
    toneMappingExposure: profile.postProcessing.exposure,
    postProcessing: {
      passes: {
        unrealBloom: profile.postProcessing.passes.bloom
          ? {
              enabled: profile.postProcessing.passes.bloom.enabled,
              params: {
                strength: profile.postProcessing.passes.bloom.strength,
                radius: profile.postProcessing.passes.bloom.radius,
                threshold: profile.postProcessing.passes.bloom.threshold
              }
            }
          : undefined,
        bokeh: profile.postProcessing.passes.bokeh
          ? {
              enabled: profile.postProcessing.passes.bokeh.enabled,
              params: {
                focus: profile.postProcessing.passes.bokeh.focus,
                aperture: profile.postProcessing.passes.bokeh.aperture,
                maxblur: profile.postProcessing.passes.bokeh.maxblur
              }
            }
          : undefined,
        film: profile.postProcessing.passes.film
          ? {
              enabled: profile.postProcessing.passes.film.enabled,
              params: {
                intensity: profile.postProcessing.passes.film.intensity,
                grayscale: profile.postProcessing.passes.film.grayscale
              }
            }
          : undefined,
        gtao: profile.postProcessing.passes.gtao
          ? {
              enabled: profile.postProcessing.passes.gtao.enabled,
              params: {
                radius: profile.postProcessing.passes.gtao.radius,
                distanceFallOff: profile.postProcessing.passes.gtao.distanceFallOff,
                thickness: profile.postProcessing.passes.gtao.thickness,
                blendIntensity: profile.postProcessing.passes.gtao.blendIntensity
              }
            }
          : undefined
      }
    }
  };
}

type MaterialSample = {
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  emissiveIntensity: number;
  hasTexture: boolean;
};

const PRODUCT_TYPE_KEYWORDS: Array<{
  type: StudioProductType;
  keywords: string[];
}> = [
  { type: "tech", keywords: ["phone", "camera", "headphone", "speaker", "laptop", "watch", "device", "gadget", "tech", "电子", "手机", "相机", "耳机", "音箱"] },
  { type: "beauty", keywords: ["beauty", "cosmetic", "skincare", "serum", "cream", "lipstick", "perfume", "makeup", "美妆", "护肤", "口红", "香水"] },
  { type: "jewelry", keywords: ["jewelry", "ring", "necklace", "bracelet", "earring", "gold", "diamond", "珠宝", "戒指", "项链", "手链", "耳环"] },
  { type: "fashion", keywords: ["bag", "clothing", "shirt", "dress", "jacket", "fashion", "apparel", "服装", "衣服", "包", "裙", "外套"] },
  { type: "footwear", keywords: ["shoe", "sneaker", "boot", "heel", "footwear", "鞋", "靴"] },
  { type: "food", keywords: ["food", "drink", "coffee", "tea", "snack", "cake", "bottle", "食品", "饮料", "咖啡", "茶", "蛋糕"] },
  { type: "home", keywords: ["vase", "lamp", "decor", "home", "kitchen", "家居", "花瓶", "灯", "装饰", "厨房"] },
  { type: "furniture", keywords: ["chair", "table", "sofa", "cabinet", "shelf", "furniture", "椅", "桌", "沙发", "柜", "家具"] },
  { type: "toy", keywords: ["toy", "figure", "plush", "game", "玩具", "手办", "公仔"] }
];

const MATERIAL_KEYWORDS: Array<{
  material: StudioProductMaterial;
  keywords: string[];
}> = [
  { material: "metallic", keywords: ["metal", "steel", "aluminum", "gold", "silver", "chrome", "金属", "钢", "铝", "金", "银"] },
  { material: "glass", keywords: ["glass", "crystal", "transparent", "bottle", "玻璃", "水晶", "透明"] },
  { material: "fabric", keywords: ["fabric", "cloth", "cotton", "wool", "textile", "布", "棉", "毛", "纺织"] },
  { material: "leather", keywords: ["leather", "皮革", "真皮"] },
  { material: "wood", keywords: ["wood", "wooden", "oak", "walnut", "木", "橡木", "胡桃木"] },
  { material: "ceramic", keywords: ["ceramic", "porcelain", "stoneware", "陶瓷", "瓷"] },
  { material: "plastic", keywords: ["plastic", "rubber", "resin", "塑料", "橡胶", "树脂"] }
];

function normalizeSearchText(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function hasKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function inferProductTypeFromText(text: string): StudioProductType {
  return PRODUCT_TYPE_KEYWORDS.find((entry) => hasKeyword(text, entry.keywords))?.type ?? "generic";
}

function inferMaterialFromText(text: string): StudioProductMaterial | null {
  return MATERIAL_KEYWORDS.find((entry) => hasKeyword(text, entry.keywords))?.material ?? null;
}

function sampleFromResolvedMaterial(material: ResolvedMeshMaterialJSON): MaterialSample {
  return {
    color: material.color,
    roughness: material.roughness,
    metalness: material.metalness,
    opacity: material.opacity,
    emissiveIntensity: material.emissiveIntensity,
    hasTexture: Boolean(
      material.diffuseMap.url ||
        material.metalnessMap.url ||
        material.roughnessMap.url ||
        material.normalMap.url ||
        material.aoMap.url ||
        material.emissiveMap.url
    )
  };
}

function sampleFromThreeMaterial(material: THREE.Material): MaterialSample | null {
  const source = material as THREE.MeshStandardMaterial & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    map?: THREE.Texture | null;
  };
  if (!source.color) return null;

  return {
    color: `#${source.color.getHexString()}`,
    roughness: typeof source.roughness === "number" ? source.roughness : 0.8,
    metalness: typeof source.metalness === "number" ? source.metalness : 0,
    opacity: typeof source.opacity === "number" ? source.opacity : 1,
    emissiveIntensity:
      typeof source.emissiveIntensity === "number" ? source.emissiveIntensity : 0,
    hasTexture: Boolean(
      source.map ||
        source.metalnessMap ||
        source.roughnessMap ||
        source.normalMap ||
        source.aoMap ||
        source.emissiveMap
    )
  };
}

function collectThreeMaterialSamples(object: THREE.Object3D | null, samples: MaterialSample[]) {
  object?.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const material = child.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => {
        const sample = sampleFromThreeMaterial(entry);
        if (sample) samples.push(sample);
      });
      return;
    }
    const sample = sampleFromThreeMaterial(material);
    if (sample) samples.push(sample);
  });
}

function collectEntityProfileInput(
  projectModel: EditorProjectModel,
  registry: BindingRegistry,
  entityId: string,
  output: {
    textParts: string[];
    samples: MaterialSample[];
  }
) {
  const record = projectModel.getEntityById(entityId);
  if (!record) return;

  output.textParts.push(record.item.label);
  const binding = registry.get(entityId);

  if (record.kind === "mesh") {
    output.textParts.push(record.item.geometryName);
    output.samples.push(sampleFromResolvedMaterial(record.item.material));
    collectThreeMaterialSamples(binding?.object ?? null, output.samples);
    return;
  }

  if (record.kind === "model") {
    output.textParts.push(record.item.source);
    collectThreeMaterialSamples(binding?.object ?? null, output.samples);
    return;
  }

  if (record.kind === "group") {
    collectThreeMaterialSamples(binding?.object ?? null, output.samples);
    projectModel.listDirectChildren(entityId).forEach((childId) => {
      collectEntityProfileInput(projectModel, registry, childId, output);
    });
  }
}

function inferMaterialFromSamples(samples: MaterialSample[]): StudioProductMaterial {
  if (samples.length === 0) return "unknown";

  const avg = samples.reduce(
    (acc, sample) => {
      acc.roughness += sample.roughness;
      acc.metalness += sample.metalness;
      acc.opacity += sample.opacity;
      acc.emissiveIntensity += sample.emissiveIntensity;
      return acc;
    },
    { roughness: 0, metalness: 0, opacity: 0, emissiveIntensity: 0 }
  );
  avg.roughness /= samples.length;
  avg.metalness /= samples.length;
  avg.opacity /= samples.length;
  avg.emissiveIntensity /= samples.length;

  if (avg.opacity < 0.82) return "glass";
  if (avg.metalness > 0.45) return "metallic";
  if (avg.roughness < 0.36) return "glossy";
  if (avg.roughness > 0.72) return "matte";
  if (samples.some((sample) => sample.hasTexture)) return "mixed";
  return "plastic";
}

function isNeutralColor(hexColor: string) {
  const color = new THREE.Color(hexColor);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return hsl.s < 0.16 || hsl.l < 0.12 || hsl.l > 0.9;
}

function inferBrandColor(samples: MaterialSample[]) {
  const color = samples.find((sample) => !isNeutralColor(sample.color))?.color ?? null;
  return color ? `#${new THREE.Color(color).getHexString()}` : null;
}

export function inferStudioProductProfile(
  projectModel: EditorProjectModel,
  registry: BindingRegistry,
  targetEntityId: string
): StudioProductProfile {
  const input = {
    textParts: [] as string[],
    samples: [] as MaterialSample[]
  };
  collectEntityProfileInput(projectModel, registry, targetEntityId, input);

  const text = normalizeSearchText(input.textParts);
  return {
    productType: inferProductTypeFromText(text),
    material: inferMaterialFromText(text) ?? inferMaterialFromSamples(input.samples),
    brandColor: inferBrandColor(input.samples)
  };
}
