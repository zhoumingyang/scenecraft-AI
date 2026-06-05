import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";

export function ProjectAiLibraryHeader({
  count,
  onClose,
  t,
  theme
}: {
  count: number;
  onClose: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  theme: EditorThemeTokens;
}) {
  return (
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
          {t("editor.project.aiLibraryCount", { count })}
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
  );
}
