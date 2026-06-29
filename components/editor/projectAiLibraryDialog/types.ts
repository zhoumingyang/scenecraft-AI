import type { EditorThemeTokens } from "@/components/editor/theme";
import type { ProjectAiAssetJSON, ProjectAiAssetKindJSON, ProjectAiLibraryV2JSON } from "@/render/editor";
import type { PendingAiAsset } from "@/stores/editorStore";

export type ProjectAiLibraryDialogProps = {
  open: boolean;
  theme: EditorThemeTokens;
  loadedLibrary: ProjectAiLibraryV2JSON;
  pendingAssets: PendingAiAsset[];
  mode?: "manage" | "apply";
  allowedKinds?: ProjectAiAssetKindJSON[];
  onClose: () => void;
  onDeleteAsset?: (payload: {
    source: "loaded" | "pending";
    assetId: string;
  }) => void | Promise<void>;
  onApplyAsset?: (payload: { imageUrl: string; assetId?: string }) => void;
  onApplyPbrAtlas?: (payload: { imageUrl: string; assetId?: string }) => void;
  onApplyPanorama?: (payload: { imageUrl: string; assetId?: string; assetName?: string }) => void;
};

export type AiAssetListItem = {
  key: string;
  source: "loaded" | "pending";
  assetId: string;
  kind: ProjectAiAssetJSON["kind"];
  imageUrl: string;
  uploadedAssetId?: string;
  assetName?: string;
  prompt: string;
  model: string;
  createdAt: string;
  traceId?: string | null;
};

export type AiAssetTab = "all" | ProjectAiAssetKindJSON;

export const ALL_ASSET_KINDS: ProjectAiAssetKindJSON[] = ["image", "pbr_atlas", "panorama"];
