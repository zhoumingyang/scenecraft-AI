import type {
  AssetUnit,
  ModelAnimationPlaybackState,
  ModelFileFormat
} from "../../constants/model";
import type { ExternalAssetSourceJSON } from "@/lib/externalAssets/types";

export type ModelAnimationClipJSON = {
  id: string;
  name: string;
  duration: number;
};

export type EditorModelJSON = {
  id: string;
  label?: string;
  source: string;
  sourceAssetId?: string;
  externalSource?: ExternalAssetSourceJSON | null;
  format?: ModelFileFormat;
  assetUnit?: AssetUnit;
  assetImportScale?: number;
  animations?: ModelAnimationClipJSON[];
  activeAnimationId?: string | null;
  animationTimeScale?: number;
  animationPlaybackState?: ModelAnimationPlaybackState;
  locked?: boolean;
  visible?: boolean;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};
