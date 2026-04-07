"use client";

import { Box, Dialog, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useI18n } from "@/lib/i18n";

type AiImagePreviewDialogProps = {
  imageUrl: string | null;
  onClose: () => void;
};

export default function AiImagePreviewDialog({ imageUrl, onClose }: AiImagePreviewDialogProps) {
  const { t } = useI18n();

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
              "radial-gradient(circle at 20% 18%, rgba(114,234,255,0.14), transparent 48%), rgba(5,8,19,0.82)",
            backdropFilter: "blur(6px)"
          }
        }
      }}
      PaperProps={{
        sx: {
          overflow: "hidden",
          borderRadius: 1.5,
          border: "1px solid rgba(160,190,255,0.18)",
          background: "rgba(8,12,24,0.96)"
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
            color: "#eef5ff",
            border: "1px solid rgba(190,210,255,0.24)",
            background: "rgba(8,12,24,0.72)"
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
