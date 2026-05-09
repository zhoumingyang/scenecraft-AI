"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { getPolyhavenAssetDetail } from "@/frontend/api/externalAssets";
import { useI18n } from "@/lib/i18n";
import {
  getPreferredHdriFormat,
  getPreferredHdriResolution,
  getPreferredModelFormat,
  getPreferredModelResolution,
  getPreferredTextureFormat,
  getPreferredTextureResolution,
  selectHdriFile,
  selectModelFile,
  selectTextureImportFiles
} from "@/lib/externalAssets/source";
import type {
  ExternalAssetDetail,
  ExternalAssetListItem,
  ExternalAssetType,
  ExternalTextureAssetDetail
} from "@/lib/externalAssets/types";
import { getApiErrorMessage } from "@/lib/http/axios";
import { useEditorStore } from "@/stores/editorStore";
import type { EditorThemeTokens } from "./theme";
import { ExternalAssetBrowserCard } from "./externalAssets/externalAssetBrowserCard";
import { ExternalAssetDetailDialog } from "./externalAssets/externalAssetDetailDialog";
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

const DETAIL_CACHE_LIMIT = 48;

function getDetailCacheKey(assetType: ExternalAssetType, assetId: string) {
  return `${assetType}:${assetId}`;
}

function getTextureFormats(asset: ExternalTextureAssetDetail, resolution: string) {
  const formats = new Set<string>();
  asset.textureMaps.forEach((textureMap) => {
    textureMap.fileOptions.forEach((file) => {
      if (file.resolution === resolution) {
        formats.add(file.format);
      }
    });
  });

  return Array.from(formats).sort((left, right) => left.localeCompare(right));
}

function getAvailableResolutions(asset: ExternalAssetDetail | null) {
  if (!asset) {
    return [];
  }

  if (asset.assetType === "hdri") {
    return Array.from(new Set(asset.fileOptions.map((file) => file.resolution)));
  }

  return asset.availableResolutions;
}

function getAvailableFormats(asset: ExternalAssetDetail | null, resolution: string) {
  if (!asset || !resolution) {
    return [];
  }

  if (asset.assetType === "hdri") {
    return Array.from(
      new Set(
        asset.fileOptions
          .filter((file) => file.resolution === resolution)
          .map((file) => file.format)
      )
    );
  }

  if (asset.assetType === "model") {
    return Array.from(
      new Set(
        asset.modelFiles
          .filter((file) => file.resolution === resolution)
          .map((file) => file.format)
      )
    );
  }

  return getTextureFormats(asset, resolution);
}

function getPreferredSelection(asset: ExternalAssetDetail) {
  if (asset.assetType === "hdri") {
    const resolution = getPreferredHdriResolution(asset.fileOptions);
    return {
      resolution,
      format: getPreferredHdriFormat(asset.fileOptions, resolution)
    };
  }

  if (asset.assetType === "model") {
    const resolution = getPreferredModelResolution(asset);
    return {
      resolution,
      format: getPreferredModelFormat(asset.modelFiles, resolution)
    };
  }

  return {
    resolution: getPreferredTextureResolution(asset),
    format: getPreferredTextureFormat(asset)
  };
}

function preloadImageUrl(url: string, errorMessage: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(errorMessage));
    image.src = url;
  });
}

async function preloadTextureSelections(
  selections: ExternalTextureApplyPayload["selections"],
  errorMessage: string
) {
  await Promise.all(
    Array.from(new Set(selections.map((selection) => selection.file.url))).map((url) =>
      preloadImageUrl(url, errorMessage)
    )
  );
}

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

    if (selectedAssetDetail.assetType === "hdri") {
      setSelectedFormat(getPreferredHdriFormat(selectedAssetDetail.fileOptions, selectedResolution));
      return;
    }

    if (selectedAssetDetail.assetType === "model") {
      setSelectedFormat(getPreferredModelFormat(selectedAssetDetail.modelFiles, selectedResolution));
      return;
    }

    setSelectedFormat(availableFormats[0] ?? "");
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
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder={t("editor.assets.searchPlaceholder")}
                  disabled={isApplying}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: theme.pillText,
                      background: theme.inputBg
                    }
                  }}
                />
                <Button
                  color="inherit"
                  onClick={submitSearch}
                  disabled={isApplying}
                  startIcon={<SearchRoundedIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    minWidth: 110,
                    borderRadius: 1,
                    border: theme.sectionBorder,
                    background: theme.iconButtonBg,
                    color: theme.pillText,
                    textTransform: "none"
                  }}
                >
                  {t("editor.assets.searchAction")}
                </Button>
              </Stack>

              <TextField
                select
                size="small"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                disabled={isApplying}
                sx={{
                  minWidth: { xs: "100%", md: 220 },
                  "& .MuiOutlinedInput-root": {
                    color: theme.pillText,
                    background: theme.inputBg
                  }
                }}
              >
                <MenuItem value="">{t("editor.assets.categoryAll")}</MenuItem>
                {categories.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label} ({item.assetCount})
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

            <Stack
              spacing={1}
              sx={{
                minHeight: 420,
                borderRadius: 1.5,
                border: theme.sectionBorder,
                background: theme.sectionBg,
                p: 1
              }}
            >
              {isListLoading ? (
                <Stack
                  spacing={1}
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    minHeight: 372,
                    color: theme.mutedText
                  }}
                >
                  <CircularProgress size={22} sx={{ color: theme.pillText }} />
                  <Typography sx={{ fontSize: 12 }}>{t("common.processing")}</Typography>
                </Stack>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gap: 1,
                    gridTemplateColumns: {
                      xs: "repeat(1, minmax(0, 1fr))",
                      sm: "repeat(2, minmax(0, 1fr))",
                      lg: "repeat(3, minmax(0, 1fr))",
                      xl: "repeat(4, minmax(0, 1fr))"
                    }
                  }}
                >
                  {assets.map((item) => (
                    <ExternalAssetBrowserCard
                      key={item.assetId}
                      item={item}
                      theme={theme}
                      isApplying={isApplying}
                      isSelected={selectedAssetId === item.assetId}
                      detail={selectedAssetId === item.assetId ? selectedAssetDetail : null}
                      detailError={selectedAssetId === item.assetId ? selectedDetailError : null}
                      isDetailLoading={selectedAssetId === item.assetId ? isDetailLoading : false}
                      selectedResolution={selectedAssetId === item.assetId ? selectedResolution : ""}
                      selectedFormat={selectedAssetId === item.assetId ? selectedFormat : ""}
                      availableResolutions={
                        selectedAssetId === item.assetId ? selectedAvailableResolutions : []
                      }
                      availableFormats={selectedAssetId === item.assetId ? selectedAvailableFormats : []}
                      onSelect={() => handleSelectAsset(item)}
                      onResolutionChange={setSelectedResolution}
                      onFormatChange={setSelectedFormat}
                      onViewDetails={() => setIsDetailOpen(true)}
                      onApply={handleApply}
                    />
                  ))}
                </Box>
              )}

              {!isListLoading && assets.length === 0 ? (
                <Box
                  sx={{
                    py: 4,
                    textAlign: "center",
                    color: theme.mutedText
                  }}
                >
                  <Typography sx={{ fontSize: 13 }}>{t("editor.assets.empty")}</Typography>
                </Box>
              ) : null}

              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 0.5 }}>
                <Typography sx={{ fontSize: 12, color: theme.mutedText }}>
                  {t("editor.assets.pageStatus", { page, total: pageCount })}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    color="inherit"
                    disabled={isApplying || isListLoading || page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    sx={{
                      minWidth: 84,
                      borderRadius: 1,
                      border: theme.sectionBorder,
                      color: theme.pillText,
                      textTransform: "none"
                    }}
                  >
                    {t("editor.assets.previousPage")}
                  </Button>
                  <Button
                    color="inherit"
                    disabled={isApplying || isListLoading || page >= pageCount}
                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                    sx={{
                      minWidth: 84,
                      borderRadius: 1,
                      border: theme.sectionBorder,
                      color: theme.pillText,
                      textTransform: "none"
                    }}
                  >
                    {t("editor.assets.nextPage")}
                  </Button>
                </Stack>
              </Stack>
            </Stack>

            {isApplying ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: theme.mutedText }}>
                <CircularProgress size={16} sx={{ color: theme.pillText }} />
                <Typography sx={{ fontSize: 12 }}>{t("common.processing")}</Typography>
              </Stack>
            ) : null}
          </Stack>
        </DialogContent>
      </Dialog>

      <ExternalAssetDetailDialog
        open={isDetailOpen}
        asset={selectedAssetDetail}
        theme={theme}
        selectedResolution={selectedResolution}
        selectedFormat={selectedFormat}
        onResolutionChange={setSelectedResolution}
        onFormatChange={setSelectedFormat}
        onClose={() => setIsDetailOpen(false)}
      />

      <Backdrop
        open={isApplying}
        sx={{
          zIndex: (muiTheme) => muiTheme.zIndex.modal + 1,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          color: theme.titleText,
          backdropFilter: "blur(10px)",
          background:
            editorThemeMode === "dark"
              ? "radial-gradient(circle at 50% 28%, rgba(114,234,255,0.16), transparent 38%), rgba(4,7,16,0.78)"
              : "radial-gradient(circle at 50% 28%, rgba(145,198,255,0.22), transparent 38%), rgba(245,249,255,0.78)"
        }}
      >
        <CircularProgress size={34} thickness={4.2} sx={{ color: theme.titleText }} />
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: theme.titleText }}>
          {t("editor.scene.loadingTitle")}
        </Typography>
      </Backdrop>
    </>
  );
}
