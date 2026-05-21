"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import FormatPaintRoundedIcon from "@mui/icons-material/FormatPaintRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import AiImagePreviewDialog from "@/components/editor/aiImagePreviewDialog";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import type { ProjectAiAssetJSON, ProjectAiAssetKindJSON, ProjectAiLibraryV2JSON } from "@/render/editor";
import type { PendingAiAsset } from "@/stores/editorStore";
import { useEditorStore } from "@/stores/editorStore";

type ProjectAiLibraryDialogProps = {
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
  }) => void;
  onApplyAsset?: (payload: { imageUrl: string; assetId?: string }) => void;
  onApplyPbrAtlas?: (payload: { imageUrl: string; assetId?: string }) => void;
};

type AiAssetListItem = {
  key: string;
  source: "loaded" | "pending";
  assetId: string;
  kind: ProjectAiAssetJSON["kind"];
  imageUrl: string;
  uploadedAssetId?: string;
  prompt: string;
  model: string;
  createdAt: string;
  traceId?: string | null;
};

type AiAssetTab = "all" | ProjectAiAssetKindJSON;

const ALL_ASSET_KINDS: ProjectAiAssetKindJSON[] = ["image", "pbr_atlas", "panorama"];

function getAssetAspectRatio(kind: ProjectAiAssetKindJSON) {
  if (kind === "panorama") return "2 / 1";
  return "1 / 1";
}

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
  onApplyPbrAtlas
}: ProjectAiLibraryDialogProps) {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const [previewItem, setPreviewItem] = useState<Pick<AiAssetListItem, "imageUrl" | "prompt"> | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<AiAssetTab>("all");
  const allowedKindSet = useMemo(() => new Set(allowedKinds), [allowedKinds]);

  const items = useMemo<AiAssetListItem[]>(() => {
    const savedItems = loadedLibrary.assets.map((asset) => ({
      key: `loaded:${asset.id}`,
      source: "loaded" as const,
      assetId: asset.id,
      kind: asset.kind,
      imageUrl: asset.url,
      uploadedAssetId: asset.assetId,
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

  const getAssetKindLabel = (kind: ProjectAiAssetKindJSON) => {
    if (kind === "pbr_atlas") return t("editor.project.aiPbrAtlas");
    if (kind === "panorama") return t("editor.project.aiPanorama");
    return t("editor.project.aiImage");
  };

  const getTabCount = (tab: AiAssetTab) =>
    items.filter((item) => allowedKindSet.has(item.kind) && (tab === "all" || item.kind === tab)).length;

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
          <Stack direction="row" spacing={1} alignItems="baseline" sx={{ minWidth: 0 }}>
            <Typography component="span" sx={{ fontSize: 18, fontWeight: 700, color: theme.titleText }}>
              {t("editor.project.aiLibraryTitle")}
            </Typography>
            <Typography component="span" sx={{ fontSize: 12, color: theme.mutedText }}>
              {t("editor.project.aiLibraryCount", { count: filteredItems.length })}
            </Typography>
          </Stack>
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
          {items.length > 0 ? (
            <Tabs
              value={activeTab}
              onChange={(_, value: AiAssetTab) => setActiveTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 36,
                mb: 1.4,
                borderBottom: theme.sectionBorder,
                "& .MuiTab-root": {
                  minHeight: 36,
                  px: 1.2,
                  color: theme.text,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "none"
                },
                "& .Mui-selected": {
                  color: theme.titleText
                },
                "& .MuiTabs-indicator": {
                  background: theme.titleText
                }
              }}
            >
              <Tab value="all" label={`${t("editor.project.aiLibraryAll")} (${getTabCount("all")})`} />
              {visibleTabs.map((kind) => (
                <Tab key={kind} value={kind} label={`${getAssetKindLabel(kind)} (${getTabCount(kind)})`} />
              ))}
            </Tabs>
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
            <Box
              sx={{
                display: "grid",
                gap: 1.25,
                gridTemplateColumns: {
                  xs: "repeat(1, minmax(0, 1fr))",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                  lg: "repeat(5, minmax(0, 1fr))"
                }
              }}
            >
              {filteredItems.map((item) => (
                <Box
                  key={item.key}
                  sx={{
                    borderRadius: 1.5,
                    border: theme.sectionBorder,
                    background: theme.sectionBg,
                    overflow: "hidden"
                  }}
                >
                  <Box sx={{ position: "relative", borderBottom: theme.sectionBorder }}>
                    <Box
                      component="img"
                      src={item.imageUrl}
                      alt={item.prompt}
                      sx={{
                        width: "100%",
                        aspectRatio: getAssetAspectRatio(item.kind),
                        objectFit: "cover",
                        display: "block"
                      }}
                    />
                    <Typography
                      sx={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        borderRadius: 0.75,
                        px: 0.7,
                        py: 0.25,
                        fontSize: 10,
                        fontWeight: 800,
                        color: theme.titleText,
                        background: theme.panelBg,
                        border: theme.sectionBorder,
                        boxShadow: "0 8px 18px rgba(0,0,0,0.22)"
                      }}
                    >
                      {getAssetKindLabel(item.kind)}
                    </Typography>
                  </Box>
                  <Stack spacing={0.6} sx={{ p: 1 }}>
                    <Typography
                      title={item.prompt}
                      sx={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: theme.titleText,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {item.prompt}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: theme.text }}>
                      {item.model}
                    </Typography>
                    <Tooltip title={item.traceId ? `${t("editor.project.aiTraceId")}: ${item.traceId}` : ""}>
                      <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </Typography>
                    </Tooltip>
                    <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                      {mode === "manage" ? (
                        <>
                          <Tooltip title={t("editor.ai.viewResult")}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setPreviewItem({
                                  imageUrl: item.imageUrl,
                                  prompt: item.prompt
                                });
                              }}
                              sx={{
                                color: theme.pillText,
                                border: theme.sectionBorder,
                                background: theme.iconButtonBg
                              }}
                            >
                              <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t("editor.project.delete")}>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(item)}
                              sx={{
                                color: theme.pillText,
                                border: theme.sectionBorder,
                                background: theme.iconButtonBg
                              }}
                            >
                              <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip title={t("editor.properties.applyAiAsset")}>
                            <IconButton
                              size="small"
                              onClick={() => handleApply(item)}
                              sx={{
                                color: theme.pillText,
                                border: theme.sectionBorder,
                                background: theme.iconButtonBg
                              }}
                            >
                              <FormatPaintRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          {item.kind === "pbr_atlas" && onApplyPbrAtlas ? (
                            <Tooltip title={t("editor.project.applyPbrAtlas")}>
                              <IconButton
                                size="small"
                                onClick={() => handleApplyPbrAtlas(item)}
                                sx={{
                                  color: theme.pillText,
                                  border: theme.sectionBorder,
                                  background: theme.iconButtonBg
                                }}
                              >
                                <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </>
                      )}
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Box>
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
