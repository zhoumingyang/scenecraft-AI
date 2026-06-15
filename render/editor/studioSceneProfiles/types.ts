import type { TranslationKey } from "@/lib/i18n";
import type { Vec3Tuple } from "../core/types";

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
  ior?: number;
  specularIntensity?: number;
  specularColor?: string;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenColor?: string;
  sheenRoughness?: number;
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
      | "extrudedShape"
      | "sculpturalLoop"
      | "ribbonPanel"
      | "steppedTotem"
      | "foldedScreen"
      | "layeredArch"
      | "orbitCluster"
      | "organicShard"
      | "modularBlocks";
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
    role:
      | "key"
      | "keyShadow"
      | "fill"
      | "rim"
      | "top"
      | "accent"
      | "roomFill"
      | "wallWash"
      | "ceilingWash";
    type: "ambient" | "hemisphere" | "rectArea" | "directional" | "spot" | "point";
    color: string;
    groundColor?: string;
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
  vignette?: number;
  detail?: number;
  grain?: {
    enabled: boolean;
    intensity: number;
    grayscale: boolean;
  };
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
