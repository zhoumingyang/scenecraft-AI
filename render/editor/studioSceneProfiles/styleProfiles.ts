import type {
  StudioSceneStyleProfile,
  StudioSceneStyleProfileId
} from "./types";
import { STUDIO_SCENE_STYLE_PROFILE_IDS } from "./types";
import {
  cleanCommerceStyleProfile,
  darkTechStyleProfile,
  galleryNeutralStyleProfile,
  playfulBrightStyleProfile,
  premiumBeautyStyleProfile,
  warmLifestyleStyleProfile
} from "./configs";

export const STUDIO_SCENE_STYLE_PROFILES: Record<
  StudioSceneStyleProfileId,
  StudioSceneStyleProfile
> = {
  cleanCommerce: cleanCommerceStyleProfile,
  premiumBeauty: premiumBeautyStyleProfile,
  darkTech: darkTechStyleProfile,
  warmLifestyle: warmLifestyleStyleProfile,
  galleryNeutral: galleryNeutralStyleProfile,
  playfulBright: playfulBrightStyleProfile
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
