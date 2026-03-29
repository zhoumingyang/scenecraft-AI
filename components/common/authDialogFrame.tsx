import { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, SxProps, Theme } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useI18n } from "@/lib/i18n";

type AuthDialogFrameProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  disableClose?: boolean;
  children: ReactNode;
  contentSx?: SxProps<Theme>;
};

const dialogPaperSx = {
  borderRadius: 1,
  overflow: "hidden"
};

const dialogBackdropSx = {
  background:
    "radial-gradient(circle at 20% 18%, rgba(114,234,255,0.16), transparent 48%), rgba(5,8,19,0.76)",
  backdropFilter: "blur(4px)"
};

export default function AuthDialogFrame({
  open,
  title,
  onClose,
  disableClose,
  children,
  contentSx
}: AuthDialogFrameProps) {
  const { t } = useI18n();

  return (
    <Dialog
      open={open}
      onClose={disableClose ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ backdrop: { sx: dialogBackdropSx } }}
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle
        sx={{ pt: 2.8, pb: 1.4, px: 3, pr: 7, fontWeight: 700, fontSize: 29, letterSpacing: "0.01em" }}
      >
        {title}
        <IconButton
          size="small"
          onClick={onClose}
          disabled={disableClose}
          aria-label={t("dialog.close")}
          sx={{
            position: "absolute",
            right: 16,
            top: 16,
            border: "1px solid rgba(190,210,255,0.34)",
            backgroundColor: "rgba(255,255,255,0.06)",
            color: "rgba(243,248,255,0.9)",
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.12)"
            }
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pb: 3, ...contentSx }}>{children}</DialogContent>
    </Dialog>
  );
}
