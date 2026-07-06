"use client";

import { useEffect, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography
} from "@mui/material";
import { useI18n } from "@/lib/i18n";
import type { ExternalAssetDetail, ExternalAssetType } from "@/lib/externalAssets/types";
import { useEditorConfirmationDialog } from "./editorConfirmationDialog";
import { useEditorTheme } from "./editorThemeContext";
import { useEditorStore } from "@/stores/editorStore";
import { ExternalAssetApplyOverlay } from "./externalAssets/externalAssetApplyOverlay";
import { ExternalAssetBrowserFilterBar } from "./externalAssets/externalAssetBrowserFilterBar";
import { ExternalAssetBrowserResults } from "./externalAssets/externalAssetBrowserResults";
import { ExternalAssetPreviewPanel } from "./externalAssets/externalAssetPreviewPanel";
import { getExternalAssetApplySelection } from "./externalAssets/externalAssetApplyActions";
import { preloadTextureSelections } from "./externalAssets/externalAssetSelection";
import type {
  ExternalHdriApplyPayload,
  ExternalModelApplyPayload,
  ExternalTextureApplyPayload
} from "./externalAssets/types";
import { useExternalAssetBrowser } from "./externalAssets/useExternalAssetBrowser";
import { useExternalAssetDetailSelection } from "./externalAssets/useExternalAssetDetailSelection";

export type {
  ExternalHdriApplyPayload,
  ExternalModelApplyPayload,
  ExternalTextureApplyPayload
} from "./externalAssets/types";

type ExternalAssetBrowserDialogProps = {
  open: boolean;
  assetType: ExternalAssetType;
  onClose: () => void;
  onApplyHdri?: (payload: ExternalHdriApplyPayload) => Promise<void> | void;
  onApplyTexture?: (payload: ExternalTextureApplyPayload) => Promise<void> | void;
  onApplyModel?: (payload: ExternalModelApplyPayload) => Promise<void> | void;
};

export function ExternalAssetBrowserDialog({
  open,
  assetType,
  onClose,
  onApplyHdri,
  onApplyTexture,
  onApplyModel
}: ExternalAssetBrowserDialogProps) {
  const { t } = useI18n();
  const { mode: editorThemeMode, theme } = useEditorTheme();
  const { confirmationDialog, notify } = useEditorConfirmationDialog({ theme, t });
  const beginSceneLoading = useEditorStore((state) => state.beginSceneLoading);
  const endSceneLoading = useEditorStore((state) => state.endSceneLoading);
  const [isApplying, setIsApplying] = useState(false);
  const {
    assets,
    categories,
    isListLoading,
    errorMessage,
    setErrorMessage,
    queryInput,
    setQueryInput,
    category,
    setCategory,
    page,
    setPage,
    pageCount,
    submitSearch
  } = useExternalAssetBrowser({
    open,
    assetType
  });
  const {
    handleSelectAsset,
    isDetailLoading,
    isDetailOpen,
    selectedAssetDetail,
    selectedAssetId,
    selectedAvailableFormats,
    selectedAvailableResolutions,
    selectedDetailError,
    selectedFormat,
    selectedResolution,
    setIsDetailOpen,
    setSelectedFormat,
    setSelectedResolution
  } = useExternalAssetDetailSelection({
    assetType,
    assets,
    isApplying,
    open,
    t
  });

  useEffect(() => {
    if (!open && !isApplying) {
      setIsApplying(false);
    }
  }, [isApplying, open]);

  const handleDialogClose = () => {
    if (isApplying) {
      return;
    }

    onClose();
  };

  const handleApply = async ({
    asset,
    resolution,
    format
  }: {
    asset: ExternalAssetDetail;
    resolution: string;
    format: string;
  }) => {
    if (isApplying) {
      return;
    }

    setIsApplying(true);
    let sceneLoadingStarted = false;
    let applyErrorMessage: string | null = null;

    try {
      const selection = getExternalAssetApplySelection({
        asset,
        format,
        resolution,
        t
      });

      if ("errorMessage" in selection) {
        setErrorMessage(selection.errorMessage);
        return;
      }

      onClose();
      beginSceneLoading(t("editor.scene.loadingTitle"));
      sceneLoadingStarted = true;

      if (selection.type === "hdri") {
        await onApplyHdri?.(selection.payload);
        return;
      }

      if (selection.type === "model") {
        await onApplyModel?.(selection.payload);
        return;
      }

      await preloadTextureSelections(selection.payload.selections, t("editor.assets.loadFailed"));
      await onApplyTexture?.(selection.payload);
    } catch (error) {
      applyErrorMessage = error instanceof Error ? error.message : t("editor.import.modelLoadError");
    } finally {
      if (sceneLoadingStarted) {
        endSceneLoading();
      }
      setIsApplying(false);
    }

    if (applyErrorMessage) {
      await notify({ message: applyErrorMessage });
    }
  };

  const dialogTitle =
    assetType === "hdri"
      ? t("editor.assets.hdriLibraryTitle")
      : assetType === "texture"
        ? t("editor.assets.textureLibraryTitle")
        : t("editor.assets.modelLibraryTitle");

  return (
    <>
      <Dialog
        open={open}
        onClose={handleDialogClose}
        disableEscapeKeyDown={isApplying}
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
            width: "min(1480px, calc(100vw - 48px))",
            borderRadius: 1.5,
            border: theme.panelBorder,
            background: theme.panelBg,
            overflow: "hidden"
          }
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            color: theme.titleText,
            fontWeight: 700
          }}
        >
          <Typography component="span" sx={{ fontSize: 18, fontWeight: 700, color: theme.titleText }}>
            {dialogTitle}
          </Typography>
          <IconButton
            size="small"
            onClick={handleDialogClose}
            aria-label={t("dialog.close")}
            disabled={isApplying}
            sx={{
              color: theme.pillText,
              border: theme.sectionBorder,
              background: theme.iconButtonBg
            }}
          >
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
          <Stack spacing={1.25}>
            <ExternalAssetBrowserFilterBar
              theme={theme}
              isApplying={isApplying}
              queryInput={queryInput}
              category={category}
              categories={categories}
              onQueryInputChange={setQueryInput}
              onCategoryChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
              onSearch={submitSearch}
            />

            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

            <ExternalAssetBrowserResults
              theme={theme}
              assets={assets}
              isApplying={isApplying}
              isListLoading={isListLoading}
              page={page}
              pageCount={pageCount}
              selectedAssetId={selectedAssetId}
              selectedAssetDetail={selectedAssetDetail}
              selectedDetailError={selectedDetailError}
              isDetailLoading={isDetailLoading}
              selectedResolution={selectedResolution}
              selectedFormat={selectedFormat}
              selectedAvailableResolutions={selectedAvailableResolutions}
              selectedAvailableFormats={selectedAvailableFormats}
              onSelectAsset={handleSelectAsset}
              onResolutionChange={setSelectedResolution}
              onFormatChange={setSelectedFormat}
              onViewDetails={() => setIsDetailOpen(true)}
              onApply={handleApply}
              onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
              onNextPage={() => setPage((current) => Math.min(pageCount, current + 1))}
            />

            {isApplying ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: theme.mutedText }}>
                <CircularProgress size={16} sx={{ color: theme.pillText }} />
                <Typography sx={{ fontSize: 12 }}>{t("common.processing")}</Typography>
              </Stack>
            ) : null}
          </Stack>
        </DialogContent>
      </Dialog>

      <ExternalAssetPreviewPanel
        open={isDetailOpen}
        asset={selectedAssetDetail}
        theme={theme}
        selectedResolution={selectedResolution}
        selectedFormat={selectedFormat}
        onResolutionChange={setSelectedResolution}
        onFormatChange={setSelectedFormat}
        onClose={() => setIsDetailOpen(false)}
      />

      <ExternalAssetApplyOverlay
        open={isApplying}
        theme={theme}
        editorThemeMode={editorThemeMode}
      />

      {confirmationDialog}
    </>
  );
}
