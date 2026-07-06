import type {
  StudioSceneHdriStatus,
  StudioScenePresetId,
  StudioSceneVariantId
} from "../../studioScenes";
import type {
  StudioProductProfile,
  StudioSceneStyleProfileId,
  StudioSceneStyleSelectionMode
} from "../../studioSceneProfiles";

export type StudioSceneState = {
  active: boolean;
  presetId: StudioScenePresetId | null;
  variantId: StudioSceneVariantId | null;
  targetEntityId: string | null;
  productProfile: StudioProductProfile | null;
  styleProfileId: StudioSceneStyleProfileId | null;
  styleSelectionMode: StudioSceneStyleSelectionMode | null;
  plinthKind: import("../../studioSceneLayoutGenerator").StudioPlinthKind | null;
  targetScale: number;
  targetRotationY: number;
  hdriStatus: StudioSceneHdriStatus;
  hdriError: string | null;
};
