"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useI18n } from "@/lib/i18n";
import {
  selectHdriFile,
  selectTextureImportFiles
} from "@/lib/externalAssets/source";
import type {
  ExternalAssetType,
} from "@/lib/externalAssets/types";
import { useEditorStore } from "@/stores/editorStore";
import type { EditorThemeTokens } from "./theme";
import type {
  ExternalHdriApplyPayload,
  ExternalTextureApplyPayload
} from "./externalAssets/types";
import { HdriAssetDetailPanel } from "./externalAssets/hdriAssetDetailPanel";
import { TextureAssetDetailPanel } from "./externalAssets/textureAssetDetailPanel";
import { useExternalAssetBrowser } from "./externalAssets/useExternalAssetBrowser";

export type { ExternalHdriApplyPayload, ExternalTextureApplyPayload } from "./externalAssets/types";

type ExternalAssetBrowserDialogProps = {
  open: boolean;
  theme: EditorThemeTokens;
  assetType: ExternalAssetType;
  onClose: () => void;
  onApplyHdri?: (payload: ExternalHdriApplyPayload) => void;
  onApplyTexture?: (payload: ExternalTextureApplyPayload) => void;
};

export function ExternalAssetBrowserDialog({
  open,
  theme,
  assetType,
  onClose,
  onApplyHdri,
  onApplyTexture
}: ExternalAssetBrowserDialogProps) {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const {
    assets,
    categories,
    selectedAssetId,
    setSelectedAssetId,
    selectedAssetDetail,
    isListLoading,
    isDetailLoading,
    errorMessage,
    setErrorMessage,
    queryInput,
    setQueryInput,
    category,
    setCategory,
    page,
    setPage,
    pageCount,
    selectedResolution,
    setSelectedResolution,
    selectedFormat,
    setSelectedFormat,
    submitSearch,
    hdriDetail,
    textureDetail
  } = useExternalAssetBrowser({
    open,
    assetType
  });

  const handleApply = () => {
    if (!selectedAssetDetail) {
      return;
    }

    if (selectedAssetDetail.assetType === "hdri") {
      const file = selectHdriFile(selectedAssetDetail.fileOptions, selectedResolution, selectedFormat);
      if (!file) {
        setErrorMessage(t("editor.assets.noCompatibleFile"));
        return;
      }

      onApplyHdri?.({
        asset: selectedAssetDetail,
        file
      });
      onClose();
      return;
    }

    const selections = selectTextureImportFiles(selectedAssetDetail, selectedResolution);
    if (selections.length === 0) {
      setErrorMessage(t("editor.assets.noCompatibleMaps"));
      return;
    }

    onApplyTexture?.({
      asset: selectedAssetDetail,
      selections
    });
    onClose();
  };

  const dialogTitle =
    assetType === "hdri" ? t("editor.assets.hdriLibraryTitle") : t("editor.assets.textureLibraryTitle");

  return (
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
          onClick={onClose}
          aria-label={t("dialog.close")}
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

          <Box
            sx={{
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(0, 1.2fr) minmax(340px, 0.8fr)"
              }
            }}
          >
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
              <Box
                sx={{
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: {
                    xs: "repeat(1, minmax(0, 1fr))",
                    sm: "repeat(2, minmax(0, 1fr))",
                    xl: "repeat(3, minmax(0, 1fr))"
                  }
                }}
              >
                {assets.map((item) => {
                  const selected = item.assetId === selectedAssetId;
                  return (
                    <Box
                      key={item.assetId}
                      onClick={() => setSelectedAssetId(item.assetId)}
                      sx={{
                        cursor: "pointer",
                        overflow: "hidden",
                        borderRadius: 1.2,
                        border: selected ? theme.itemSelectedBorder : theme.sectionBorder,
                        background: selected ? theme.itemSelectedBg : theme.itemBg
                      }}
                    >
                      <Box
                        component="img"
                        src={item.thumbnailUrl}
                        alt={item.displayName}
                        sx={{
                          width: "100%",
                          aspectRatio: "1 / 1",
                          display: "block",
                          objectFit: "cover",
                          borderBottom: theme.sectionBorder
                        }}
                      />
                      <Stack spacing={0.5} sx={{ p: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.titleText }}>
                          {item.displayName}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
                          {item.authorLabel}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: theme.text }}>
                          {item.maxResolutionLabel}
                        </Typography>
                      </Stack>
                    </Box>
                  );
                })}
              </Box>

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
                    disabled={page <= 1}
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
                    disabled={page >= pageCount}
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

            <Stack
              spacing={1}
              sx={{
                minHeight: 420,
                borderRadius: 1.5,
                border: theme.sectionBorder,
                background: theme.sectionBg,
                p: 1.25
              }}
            >
              {!selectedAssetDetail || isDetailLoading ? (
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: theme.mutedText
                  }}
                >
                  <Typography sx={{ fontSize: 13 }}>
                    {isDetailLoading ? t("common.processing") : t("editor.assets.selectAssetHint")}
                  </Typography>
                </Box>
              ) : (
                hdriDetail ? (
                  <HdriAssetDetailPanel
                    asset={hdriDetail}
                    theme={theme}
                    selectedResolution={selectedResolution}
                    selectedFormat={selectedFormat}
                    onResolutionChange={setSelectedResolution}
                    onFormatChange={setSelectedFormat}
                    onApply={handleApply}
                  />
                ) : textureDetail ? (
                  <TextureAssetDetailPanel
                    asset={textureDetail}
                    theme={theme}
                    selectedResolution={selectedResolution}
                    onResolutionChange={setSelectedResolution}
                    onApply={handleApply}
                  />
                ) : null
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
