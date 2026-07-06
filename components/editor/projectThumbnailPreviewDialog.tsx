"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Box, Dialog, DialogContent, IconButton, Typography } from "@mui/material";
import { useEditorTheme } from "@/components/editor/editorThemeContext";

type ProjectThumbnailPreviewDialogProps = {
  open: boolean;
  title: string;
  thumbnailUrl: string | null;
  onClose: () => void;
};

export default function ProjectThumbnailPreviewDialog({
  open,
  title,
  thumbnailUrl,
  onClose
}: ProjectThumbnailPreviewDialogProps) {
  const { theme } = useEditorTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          background: theme.sectionBg,
          border: theme.sectionBorder,
          boxShadow: theme.panelShadow,
          overflow: "hidden"
        }
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: 2,
          py: 1.5,
          borderBottom: theme.sectionBorder
        }}
      >
        <Typography sx={{ color: theme.titleText, fontSize: 14, fontWeight: 700 }}>
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: theme.mutedText,
            border: theme.sectionBorder,
            background: theme.itemBg,
            "&:hover": {
              color: theme.titleText,
              background: theme.itemHoverBg
            }
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
      <DialogContent
        sx={{
          p: 0,
          background: theme.panelBgMuted
        }}
      >
        {thumbnailUrl ? (
          <Box
            component="img"
            src={thumbnailUrl}
            alt={title}
            sx={{
              display: "block",
              width: "100%",
              maxHeight: "80vh",
              objectFit: "contain",
              background: theme.panelBgMuted
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
