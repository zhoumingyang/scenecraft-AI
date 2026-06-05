import { useState } from "react";
import type { EditorApp, ProjectAiLibraryV2JSON } from "@/render/editor";
import type {
  EditorStoreState,
  PendingAiAsset
} from "@/stores/editorStore";
import { projectSnapshotUsesAssetReference } from "@/components/editor/projectPersistence";
import type { TopBarTranslate } from "./types";

type UseTopBarAiLibraryActionsOptions = {
  app: EditorApp | null;
  loadedAiLibrary: ProjectAiLibraryV2JSON;
  markUnsavedChanges: EditorStoreState["markUnsavedChanges"];
  pendingAiAssets: PendingAiAsset[];
  removeAiLibraryAsset: EditorStoreState["removeAiLibraryAsset"];
  t: TopBarTranslate;
};

export function useTopBarAiLibraryActions({
  app,
  loadedAiLibrary,
  markUnsavedChanges,
  pendingAiAssets,
  removeAiLibraryAsset,
  t
}: UseTopBarAiLibraryActionsOptions) {
  const [aiLibraryDialogOpen, setAiLibraryDialogOpen] = useState(false);
  const aiLibraryAssetCount = loadedAiLibrary.assets.length + pendingAiAssets.length;

  const onDeleteAiLibraryAsset = (payload: {
    source: "loaded" | "pending";
    assetId: string;
  }) => {
    const assetReference =
      payload.source === "pending"
        ? {
            sourceUrl: pendingAiAssets.find((asset) => asset.id === payload.assetId)?.sourceUrl ?? null,
            assetId: null
          }
        : {
            sourceUrl: loadedAiLibrary.assets.find((asset) => asset.id === payload.assetId)?.url ?? null,
            assetId: loadedAiLibrary.assets.find((asset) => asset.id === payload.assetId)?.assetId ?? null
          };

    const snapshot = app?.getProjectJSON() ?? null;
    if (snapshot && projectSnapshotUsesAssetReference(snapshot, assetReference)) {
      window.alert(t("editor.project.aiAssetInUseDeleteBlocked"));
      return;
    }

    removeAiLibraryAsset(payload);
    markUnsavedChanges(true);
  };

  return {
    aiLibraryAssetCount,
    aiLibraryDialogOpen,
    closeAiLibraryDialog: () => setAiLibraryDialogOpen(false),
    onDeleteAiLibraryAsset,
    openAiLibraryDialog: () => setAiLibraryDialogOpen(true)
  };
}
