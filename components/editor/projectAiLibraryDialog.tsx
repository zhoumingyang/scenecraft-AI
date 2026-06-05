"use client";

import { useState } from "react";
import { Box, Dialog, DialogContent, Typography } from "@mui/material";
import AiImagePreviewDialog from "@/components/editor/aiImagePreviewDialog";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";
import { ProjectAiLibraryGrid } from "./projectAiLibraryDialog/projectAiLibraryGrid";
import { ProjectAiLibraryHeader } from "./projectAiLibraryDialog/projectAiLibraryHeader";
import { ProjectAiLibraryTabs } from "./projectAiLibraryDialog/projectAiLibraryTabs";
import { useProjectAiLibraryItems } from "./projectAiLibraryDialog/useProjectAiLibraryItems";
import {
  ALL_ASSET_KINDS,
  type AiAssetListItem,
  type AiAssetTab,
  type ProjectAiLibraryDialogProps
} from "./projectAiLibraryDialog/types";

export default function ProjectAiLibraryDialog({
  open,
  theme,
  loadedLibrary,
  pendingAssets,
  mode = "manage",
  allowedKinds = ALL_ASSET_KINDS,
  onClose,
  onDeleteAsset,
  onApplyAsset,
  onApplyPbrAtlas,
  onApplyPanorama
}: ProjectAiLibraryDialogProps) {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const [previewItem, setPreviewItem] = useState<Pick<AiAssetListItem, "imageUrl" | "prompt"> | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<AiAssetTab>("all");

  const { filteredItems, getTabCount, items, visibleTabs } = useProjectAiLibraryItems({
    activeTab,
    allowedKinds,
    loadedLibrary,
    pendingAssets
  });

  const getAssetKindLabel = (kind: AiAssetListItem["kind"]) => {
    if (kind === "pbr_atlas") return t("editor.project.aiPbrAtlas");
    if (kind === "panorama") return t("editor.project.aiPanorama");
    return t("editor.project.aiImage");
  };

  const handleDelete = (item: AiAssetListItem) => {
    if (!window.confirm(t("editor.project.aiAssetDeleteConfirm"))) {
      return;
    }

    onDeleteAsset?.({
      source: item.source,
      assetId: item.assetId
    });
  };

  const handleApply = (item: AiAssetListItem) => {
    onApplyAsset?.({
      imageUrl: item.imageUrl,
      assetId: item.uploadedAssetId
    });
    onClose();
  };

  const handleApplyPbrAtlas = (item: AiAssetListItem) => {
    onApplyPbrAtlas?.({
      imageUrl: item.imageUrl,
      assetId: item.uploadedAssetId
    });
    onClose();
  };

  const handleApplyPanorama = (item: AiAssetListItem) => {
    onApplyPanorama?.({
      imageUrl: item.imageUrl,
      assetId: item.uploadedAssetId,
      assetName: item.assetName
    });
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="xl"
        slotProps={{
          backdrop: {
            sx: {
              background:
                editorThemeMode === "dark"
                  ? "radial-gradient(circle at 20% 18%, rgba(114,234,255,0.14), transparent 48%), rgba(5,8,19,0.82)"
                  : "radial-gradient(circle at 20% 18%, rgba(145,198,255,0.2), transparent 48%), rgba(242,247,255,0.7)",
              backdropFilter: "blur(6px)"
            }
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: 1.5,
            border: theme.panelBorder,
            background: theme.panelBg,
            overflow: "hidden"
          }
        }}
      >
        <ProjectAiLibraryHeader count={filteredItems.length} onClose={onClose} t={t} theme={theme} />

        <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
          {items.length > 0 ? (
            <ProjectAiLibraryTabs
              activeTab={activeTab}
              getAssetKindLabel={getAssetKindLabel}
              getTabCount={getTabCount}
              onChange={setActiveTab}
              t={t}
              theme={theme}
              visibleTabs={visibleTabs}
            />
          ) : null}

          {filteredItems.length === 0 ? (
            <Box
              sx={{
                py: 5,
                textAlign: "center",
                borderRadius: 1.5,
                border: theme.sectionBorder,
                background: theme.sectionBg
              }}
            >
              <Typography sx={{ fontSize: 13, color: theme.mutedText }}>
                {t("editor.project.aiLibraryEmpty")}
              </Typography>
            </Box>
          ) : (
            <ProjectAiLibraryGrid
              getAssetKindLabel={getAssetKindLabel}
              items={filteredItems}
              mode={mode}
              onApply={onApplyAsset ? handleApply : undefined}
              onApplyPanorama={onApplyPanorama ? handleApplyPanorama : undefined}
              onApplyPbrAtlas={onApplyPbrAtlas ? handleApplyPbrAtlas : undefined}
              onDelete={handleDelete}
              onPreview={(item) => {
                setPreviewItem({
                  imageUrl: item.imageUrl,
                  prompt: item.prompt
                });
              }}
              t={t}
              theme={theme}
            />
          )}
        </DialogContent>
      </Dialog>

      <AiImagePreviewDialog
        imageUrl={previewItem?.imageUrl ?? null}
        prompt={previewItem?.prompt ?? null}
        onClose={() => setPreviewItem(null)}
      />
    </>
  );
}
