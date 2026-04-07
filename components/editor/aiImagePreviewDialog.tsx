"use client";

import { Box, Dialog, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";

type AiImagePreviewDialogProps = {
  imageUrl: string | null;
  onClose: () => void;
};

export default function AiImagePreviewDialog({ imageUrl, onClose }: AiImagePreviewDialogProps) {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  return (
    <Dialog
      open={Boolean(imageUrl)}
      onClose={onClose}
      fullWidth
      maxWidth="md"
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
          overflow: "hidden",
          borderRadius: 1.5,
          border: theme.panelBorder,
          background: theme.panelBg
        }
      }}
    >
      <Box sx={{ position: "relative", p: 1.25 }}>
        <IconButton
          size="small"
          onClick={onClose}
          aria-label={t("dialog.close")}
          sx={{
            position: "absolute",
            top: 14,
            right: 14,
            zIndex: 1,
            color: theme.pillText,
            border: theme.sectionBorder,
            background: theme.pillBg
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 16 }} />
        </IconButton>

        {imageUrl ? (
          <Box
            component="img"
            src={imageUrl}
            alt={t("editor.ai.previewTitle")}
            sx={{
              width: "100%",
              maxHeight: "80vh",
              display: "block",
              objectFit: "contain",
              borderRadius: 1
            }}
          />
        ) : null}
      </Box>
    </Dialog>
  );
}
