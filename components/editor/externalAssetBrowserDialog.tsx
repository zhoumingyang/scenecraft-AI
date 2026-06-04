"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { getPolyhavenAssetDetail } from "@/frontend/api/externalAssets";
import { useI18n } from "@/lib/i18n";
import {
  selectHdriFile,
  selectModelFile,
  selectTextureImportFiles
} from "@/lib/externalAssets/source";
import type {
  ExternalAssetDetail,
  ExternalAssetListItem,
  ExternalAssetType
} from "@/lib/externalAssets/types";
import { getApiErrorMessage } from "@/lib/http/axios";
import { useEditorStore } from "@/stores/editorStore";
import type { EditorThemeTokens } from "./theme";
import { ExternalAssetApplyOverlay } from "./externalAssets/externalAssetApplyOverlay";
import { ExternalAssetBrowserFilterBar } from "./externalAssets/externalAssetBrowserFilterBar";
import { ExternalAssetBrowserResults } from "./externalAssets/externalAssetBrowserResults";
import { ExternalAssetPreviewPanel } from "./externalAssets/externalAssetPreviewPanel";
import {
  DETAIL_CACHE_LIMIT,
  getAvailableFormats,
  getAvailableResolutions,
  getDetailCacheKey,
  getPreferredFormatForResolution,
  getPreferredSelection,
  preloadTextureSelections
} from "./externalAssets/externalAssetSelection";
import { createLruCache } from "./externalAssets/lruCache";
import type {
  ExternalHdriApplyPayload,
  ExternalModelApplyPayload,
  ExternalTextureApplyPayload
} from "./externalAssets/types";
import { useExternalAssetBrowser } from "./externalAssets/useExternalAssetBrowser";

export type {
  ExternalHdriApplyPayload,
  ExternalModelApplyPayload,
  ExternalTextureApplyPayload
} from "./externalAssets/types";

type ExternalAssetBrowserDialogProps = {
  open: boolean;
  theme: EditorThemeTokens;
  assetType: ExternalAssetType;
  onClose: () => void;
  onApplyHdri?: (payload: ExternalHdriApplyPayload) => Promise<void> | void;
  onApplyTexture?: (payload: ExternalTextureApplyPayload) => Promise<void> | void;
  onApplyModel?: (payload: ExternalModelApplyPayload) => Promise<void> | void;
};

export function ExternalAssetBrowserDialog({
  open,
  theme,
  assetType,
  onClose,
  onApplyHdri,
  onApplyTexture,
  onApplyModel
}: ExternalAssetBrowserDialogProps) {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const beginSceneLoading = useEditorStore((state) => state.beginSceneLoading);
  const endSceneLoading = useEditorStore((state) => state.endSceneLoading);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<ExternalAssetDetail | null>(null);
  const [selectedDetailError, setSelectedDetailError] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const detailCacheRef = useRef(
    createLruCache<string, ExternalAssetDetail>({
      maxSize: DETAIL_CACHE_LIMIT
    })
  );
  const detailRequestId = useRef(0);
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

  useEffect(() => {
    if (!open) {
      if (!isApplying) {
        setIsApplying(false);
      }
      setSelectedAssetId(null);
      setSelectedAssetDetail(null);
      setSelectedDetailError(null);
      setIsDetailLoading(false);
      setIsDetailOpen(false);
      setSelectedResolution("");
      setSelectedFormat("");
      detailRequestId.current += 1;
    }
  }, [isApplying, open]);

  useEffect(() => {
    setSelectedAssetId(null);
    setSelectedAssetDetail(null);
    setSelectedDetailError(null);
    setIsDetailLoading(false);
    setIsDetailOpen(false);
    setSelectedResolution("");
    setSelectedFormat("");
    detailRequestId.current += 1;
  }, [assetType]);

  useEffect(() => {
    if (!selectedAssetId || assets.some((item) => item.assetId === selectedAssetId)) {
      return;
    }

    setSelectedAssetId(null);
    setSelectedAssetDetail(null);
    setSelectedDetailError(null);
    setIsDetailLoading(false);
    setIsDetailOpen(false);
    setSelectedResolution("");
    setSelectedFormat("");
    detailRequestId.current += 1;
  }, [assets, selectedAssetId]);

  const selectedAvailableResolutions = useMemo(
    () => getAvailableResolutions(selectedAssetDetail),
    [selectedAssetDetail]
  );
  const selectedAvailableFormats = useMemo(
    () => getAvailableFormats(selectedAssetDetail, selectedResolution),
    [selectedAssetDetail, selectedResolution]
  );

  useEffect(() => {
    if (!selectedAssetDetail || !selectedResolution) {
      return;
    }

    const availableFormats = getAvailableFormats(selectedAssetDetail, selectedResolution);
    if (availableFormats.length === 0) {
      if (selectedFormat !== "") {
        setSelectedFormat("");
      }
      return;
    }

    if (availableFormats.includes(selectedFormat)) {
      return;
    }

    setSelectedFormat(
      getPreferredFormatForResolution(selectedAssetDetail, selectedResolution, availableFormats)
    );
  }, [selectedAssetDetail, selectedFormat, selectedResolution]);

  const applyDetailSelection = (detail: ExternalAssetDetail) => {
    const nextSelection = getPreferredSelection(detail);
    setSelectedAssetDetail(detail);
    setSelectedResolution(nextSelection.resolution);
    setSelectedFormat(nextSelection.format);
  };

  const handleSelectAsset = (item: ExternalAssetListItem) => {
    if (isApplying) {
      return;
    }

    if (selectedAssetId === item.assetId && (selectedAssetDetail || isDetailLoading)) {
      return;
    }

    setSelectedAssetId(item.assetId);
    setSelectedAssetDetail(null);
    setSelectedDetailError(null);
    setIsDetailOpen(false);
    setSelectedResolution("");
    setSelectedFormat("");

    const cacheKey = getDetailCacheKey(item.assetType, item.assetId);
    const cachedDetail = detailCacheRef.current.get(cacheKey);
    if (cachedDetail) {
      detailRequestId.current += 1;
      setIsDetailLoading(false);
      applyDetailSelection(cachedDetail);
      return;
    }

    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;
    setIsDetailLoading(true);

    void getPolyhavenAssetDetail(item.assetId, item.assetType)
      .then((detail) => {
        if (detailRequestId.current !== requestId) {
          return;
        }

        detailCacheRef.current.set(cacheKey, detail);
        applyDetailSelection(detail);
      })
      .catch((error: unknown) => {
        if (detailRequestId.current !== requestId) {
          return;
        }

        setSelectedDetailError(getApiErrorMessage(error, t("editor.assets.detailLoadFailed")));
      })
      .finally(() => {
        if (detailRequestId.current === requestId) {
          setIsDetailLoading(false);
        }
      });
  };

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

    try {
      if (asset.assetType === "hdri") {
        const file = selectHdriFile(asset.fileOptions, resolution, format);
        if (!file) {
          setErrorMessage(t("editor.assets.noCompatibleFile"));
          return;
        }

        onClose();
        beginSceneLoading(t("editor.scene.loadingTitle"));
        sceneLoadingStarted = true;
        await onApplyHdri?.({
          asset,
          file
        });
        return;
      }

      if (asset.assetType === "model") {
        const file = selectModelFile(asset.modelFiles, resolution, format);
        if (!file) {
          setErrorMessage(t("editor.assets.noCompatibleFile"));
          return;
        }

        onClose();
        beginSceneLoading(t("editor.scene.loadingTitle"));
        sceneLoadingStarted = true;
        await onApplyModel?.({
          asset,
          file
        });
        return;
      }

      const selections = selectTextureImportFiles(asset, resolution, format);
      if (selections.length === 0) {
        setErrorMessage(t("editor.assets.noCompatibleMaps"));
        return;
      }

      onClose();
      beginSceneLoading(t("editor.scene.loadingTitle"));
      sceneLoadingStarted = true;
      await preloadTextureSelections(selections, t("editor.assets.loadFailed"));
      await onApplyTexture?.({
        asset,
        selections
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t("editor.import.modelLoadError"));
    } finally {
      if (sceneLoadingStarted) {
        endSceneLoading();
      }
      setIsApplying(false);
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
    </>
  );
}
