"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import FormatPaintRoundedIcon from "@mui/icons-material/FormatPaintRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import AiImagePreviewDialog from "@/components/editor/aiImagePreviewDialog";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import type { ProjectAiLibraryJSON } from "@/render/editor";
import type { PendingAiImageGeneration } from "@/stores/editorStore";
import { useEditorStore } from "@/stores/editorStore";

type ProjectAiLibraryDialogProps = {
  open: boolean;
  theme: EditorThemeTokens;
  loadedLibrary: ProjectAiLibraryJSON;
  pendingGenerations: PendingAiImageGeneration[];
  mode?: "manage" | "apply";
  onClose: () => void;
  onDeleteAsset?: (payload: {
    source: "loaded" | "pending";
    generationId: string;
    resultId: string;
  }) => void;
  onApplyAsset?: (payload: { imageUrl: string; assetId?: string }) => void;
};

type AiAssetListItem = {
  key: string;
  source: "loaded" | "pending";
  generationId: string;
  resultId: string;
  imageUrl: string;
  assetId?: string;
  prompt: string;
  model: string;
  createdAt: string;
};

export default function ProjectAiLibraryDialog({
  open,
  theme,
  loadedLibrary,
  pendingGenerations,
  mode = "manage",
  onClose,
  onDeleteAsset,
  onApplyAsset
}: ProjectAiLibraryDialogProps) {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const [previewItem, setPreviewItem] = useState<Pick<AiAssetListItem, "imageUrl" | "prompt"> | null>(
    null
  );

  const items = useMemo<AiAssetListItem[]>(() => {
    const savedItems = loadedLibrary.imageGenerations.flatMap((generation) =>
      generation.results.map((result) => ({
        key: `loaded:${generation.id}:${result.id}`,
        source: "loaded" as const,
        generationId: generation.id,
        resultId: result.id,
        imageUrl: result.url,
        assetId: result.assetId,
        prompt: generation.prompt,
        model: generation.model,
        createdAt: generation.createdAt
      }))
    );
    const pendingItems = pendingGenerations.flatMap((generation) =>
      generation.results.map((result) => ({
        key: `pending:${generation.id}:${result.id}`,
        source: "pending" as const,
        generationId: generation.id,
        resultId: result.id,
        imageUrl: result.sourceUrl,
        prompt: generation.prompt,
        model: generation.model,
        createdAt: generation.createdAt
      }))
    );

    return [...pendingItems, ...savedItems].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  }, [loadedLibrary.imageGenerations, pendingGenerations]);

  const handleDelete = (item: AiAssetListItem) => {
    if (!window.confirm(t("editor.project.aiAssetDeleteConfirm"))) {
      return;
    }

    onDeleteAsset?.({
      source: item.source,
      generationId: item.generationId,
      resultId: item.resultId
    });
  };

  const handleApply = (item: AiAssetListItem) => {
    onApplyAsset?.({
      imageUrl: item.imageUrl,
      assetId: item.assetId
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
              {t("editor.project.aiLibraryCount", { count: items.length })}
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
          {items.length === 0 ? (
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
              {items.map((item) => (
                <Box
                  key={item.key}
                  sx={{
                    borderRadius: 1.5,
                    border: theme.sectionBorder,
                    background: theme.sectionBg,
                    overflow: "hidden"
                  }}
                >
                  <Box
                    component="img"
                    src={item.imageUrl}
                    alt={item.prompt}
                    sx={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      objectFit: "cover",
                      display: "block",
                      borderBottom: theme.sectionBorder
                    }}
                  />
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
                    <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Typography>
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
