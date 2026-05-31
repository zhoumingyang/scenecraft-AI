import * as THREE from "three";

import type { EditorEnvConfigJSON } from "../core/types";
import { DEFAULT_STUDIO_SCENE_STYLE_PROFILE_ID, getStudioSceneStyleProfile } from "./styleProfiles";
import type {
  StudioProductProfile,
  StudioScenePresetFromStyleProfile,
  StudioSceneStyleProfile,
  StudioSceneStyleProfileId
} from "./types";

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
  if (
    productProfile.productType === "furniture" ||
    productProfile.material === "ceramic"
  ) {
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
    const accentLight = next.lighting.lights.find(
      (light) => light.role === "accent"
    );
    if (accentLight) {
      accentLight.color = normalizedBrandColor;
    }
    next.lighting.modifiers.forEach((modifier) => {
      if (modifier.role === "stripPanel") {
        modifier.color = normalizedBrandColor;
      }
    });
  }

  return next;
}

export function createStudioPresetFromStyleProfile(
  profile: StudioSceneStyleProfile
): StudioScenePresetFromStyleProfile {
  const keyLight =
    profile.lighting.lights.find((light) => light.role === "key") ??
    profile.lighting.lights[0];
  const fillLight =
    profile.lighting.lights.find((light) => light.role === "fill") ??
    profile.lighting.lights[1] ??
    keyLight;
  const rimLight =
    profile.lighting.lights.find((light) => light.role === "rim") ??
    profile.lighting.lights[2] ??
    keyLight;

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

export function createStudioEnvPatchFromStyleProfile(
  profile: StudioSceneStyleProfile
): Partial<EditorEnvConfigJSON> {
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
