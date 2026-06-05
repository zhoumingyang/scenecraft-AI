import { useMemo } from "react";
import type { ProjectAiAssetKindJSON, ProjectAiLibraryV2JSON } from "@/render/editor";
import type { PendingAiAsset } from "@/stores/editorStore";
import { ALL_ASSET_KINDS, type AiAssetListItem, type AiAssetTab } from "./types";

export function useProjectAiLibraryItems({
  activeTab,
  allowedKinds,
  loadedLibrary,
  pendingAssets
}: {
  activeTab: AiAssetTab;
  allowedKinds: ProjectAiAssetKindJSON[];
  loadedLibrary: ProjectAiLibraryV2JSON;
  pendingAssets: PendingAiAsset[];
}) {
  const allowedKindSet = useMemo(() => new Set(allowedKinds), [allowedKinds]);

  const items = useMemo<AiAssetListItem[]>(() => {
    const savedItems = loadedLibrary.assets.map((asset) => ({
      key: `loaded:${asset.id}`,
      source: "loaded" as const,
      assetId: asset.id,
      kind: asset.kind,
      imageUrl: asset.url,
      uploadedAssetId: asset.assetId,
      assetName: asset.originalName,
      prompt: asset.prompt,
      model: asset.model,
      createdAt: asset.createdAt,
      traceId: asset.traceId
    }));
    const pendingItems = pendingAssets.map((asset) => ({
      key: `pending:${asset.id}`,
      source: "pending" as const,
      assetId: asset.id,
      kind: asset.kind,
      imageUrl: asset.sourceUrl,
      assetName: asset.fileName,
      prompt: asset.prompt,
      model: asset.model,
      createdAt: asset.createdAt,
      traceId: asset.traceId
    }));

    return [...pendingItems, ...savedItems].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  }, [loadedLibrary.assets, pendingAssets]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (!allowedKindSet.has(item.kind)) {
          return false;
        }
        return activeTab === "all" || item.kind === activeTab;
      }),
    [activeTab, allowedKindSet, items]
  );

  const visibleTabs = useMemo(
    () => ALL_ASSET_KINDS.filter((kind) => allowedKindSet.has(kind)),
    [allowedKindSet]
  );

  const getTabCount = (tab: AiAssetTab) =>
    items.filter((item) => allowedKindSet.has(item.kind) && (tab === "all" || item.kind === tab)).length;

  return {
    filteredItems,
    getTabCount,
    items,
    visibleTabs
  };
}
