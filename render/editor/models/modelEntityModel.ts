import type {
  AssetUnit,
  EditorModelJSON,
  ModelAnimationClipJSON,
  ModelAnimationPlaybackState,
  ModelFileFormat
} from "../core/types";
import {
  assetUnitToMeters,
  normalizeBoolean,
  normalizeAssetUnit,
  normalizeId,
  normalizeModelFormat,
  normalizePositiveNumber,
  normalizeString
} from "../utils/normalize";
import {
  normalizeModelAnimationClips,
  normalizeModelAnimationPlaybackState
} from "../utils/modelAnimation";
import { BaseEntityModel } from "./baseEntity";

export class ModelEntityModel extends BaseEntityModel {
  source: string;
  format: ModelFileFormat;
  assetUnit: AssetUnit;
  assetImportScale: number;
  animations: ModelAnimationClipJSON[];
  activeAnimationId: string | null;
  animationTimeScale: number;
  animationPlaybackState: ModelAnimationPlaybackState;
  visible: boolean;

  constructor(index: number, source: EditorModelJSON) {
    super(normalizeId("model", source.id, index), source);
    this.source = normalizeString(source.source);
    this.format = normalizeModelFormat(source.format, "glb");
    this.assetUnit = normalizeAssetUnit(source.assetUnit, "unknown");
    this.assetImportScale = normalizePositiveNumber(source.assetImportScale, 1);
    this.animations = normalizeModelAnimationClips(source.animations);
    this.activeAnimationId =
      typeof source.activeAnimationId === "string" && source.activeAnimationId.trim()
        ? source.activeAnimationId.trim()
        : this.animations[0]?.id ?? null;
    this.animationTimeScale = normalizePositiveNumber(source.animationTimeScale, 1);
    this.animationPlaybackState = normalizeModelAnimationPlaybackState(
      source.animationPlaybackState,
      this.activeAnimationId ? "playing" : "stopped"
    );
    this.visible = normalizeBoolean(source.visible, true);
  }

  getAssetScaleInMeters(): number {
    return assetUnitToMeters(this.assetUnit) * this.assetImportScale;
  }

  setAnimations(clips: ModelAnimationClipJSON[]) {
    this.animations = normalizeModelAnimationClips(clips);
    if (this.animations.length === 0) {
      this.activeAnimationId = null;
      this.animationPlaybackState = "stopped";
      return;
    }

    const hasActiveAnimation = this.animations.some((clip) => clip.id === this.activeAnimationId);
    if (!hasActiveAnimation) {
      this.activeAnimationId = this.animations[0].id;
    }
  }

  setActiveAnimation(animationId: string | null) {
    if (!animationId) {
      this.activeAnimationId = null;
      return;
    }
    if (!this.animations.some((clip) => clip.id === animationId)) return;
    this.activeAnimationId = animationId;
  }
}
