import { IconButton, Stack, Tooltip } from "@mui/material";
import RedoRoundedIcon from "@mui/icons-material/RedoRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import type { SxProps, Theme } from "@mui/material/styles";
import { useEditorTheme } from "@/components/editor/editorThemeContext";
import type { EditorHistoryState } from "@/render/editor";
import type { TopBarTranslate } from "./types";

type TopBarHistoryControlsProps = {
  disabled?: boolean;
  historyState: EditorHistoryState;
  onRedo: () => void | Promise<void>;
  onUndo: () => void | Promise<void>;
  sx?: SxProps<Theme>;
  t: TopBarTranslate;
};

export default function TopBarHistoryControls({
  disabled = false,
  historyState,
  onRedo,
  onUndo,
  sx,
  t
}: TopBarHistoryControlsProps) {
  const { theme } = useEditorTheme();
  const iconButtonSx = {
    width: 32,
    height: 32,
    color: theme.pillText,
    border: theme.sectionBorder,
    background: theme.iconButtonBg,
    "&:hover": {
      background: theme.itemHoverBg
    },
    "&.Mui-disabled": {
      color: theme.mutedText,
      opacity: 0.48
    }
  } as const;

  return (
    <Stack
      direction="row"
      spacing={0.4}
      alignItems="center"
      sx={{
        px: 0.7,
        py: 0.65,
        borderRadius: 2,
        border: theme.pillBorder,
        background: theme.pillBg,
        backdropFilter: "blur(10px)",
        boxShadow: theme.pillShadow,
        color: theme.pillText,
        pointerEvents: "auto",
        ...sx
      }}
    >
      <Tooltip title={`${t("editor.history.undo")} (⌘Z)`}>
        <span>
          <IconButton
            size="small"
            aria-label={t("editor.history.undo")}
            disabled={disabled || !historyState.canUndo}
            onClick={onUndo}
            sx={iconButtonSx}
          >
            <UndoRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={`${t("editor.history.redo")} (⇧⌘Z)`}>
        <span>
          <IconButton
            size="small"
            aria-label={t("editor.history.redo")}
            disabled={disabled || !historyState.canRedo}
            onClick={onRedo}
            sx={iconButtonSx}
          >
            <RedoRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
