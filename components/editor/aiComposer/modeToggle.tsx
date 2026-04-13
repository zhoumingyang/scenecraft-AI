"use client";

import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ViewInArRoundedIcon from "@mui/icons-material/ViewInArRounded";
import type { EditorThemeTokens } from "@/components/editor/theme";
import type { AiMode } from "@/stores/editorStore";

type Props = {
  aiMode: AiMode;
  theme: EditorThemeTokens;
  t: (key: any, params?: Record<string, string | number>) => string;
  onChange: (mode: AiMode) => void;
};

export default function ModeToggle({ aiMode, theme, t, onChange }: Props) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={aiMode}
      onChange={(_, nextMode: AiMode | null) => {
        if (!nextMode) return;
        onChange(nextMode);
      }}
      sx={{
        gap: 0.8,
        "& .MuiToggleButtonGroup-grouped": {
          m: 0,
          borderRadius: "10px",
          border: theme.sectionBorder
        }
      }}
    >
      <ToggleButton
        value="image"
        title={t("editor.ai.modeImage")}
        aria-label={t("editor.ai.modeImage")}
        sx={buttonSx(theme)}
      >
        <AutoAwesomeRoundedIcon sx={{ fontSize: 18 }} />
      </ToggleButton>
      <ToggleButton
        value="3d"
        title={t("editor.ai.mode3d")}
        aria-label={t("editor.ai.mode3d")}
        sx={buttonSx(theme)}
      >
        <ViewInArRoundedIcon sx={{ fontSize: 18 }} />
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

function buttonSx(theme: EditorThemeTokens) {
  return {
    width: 36,
    height: 36,
    color: theme.mutedText,
    background: "transparent",
    "&.Mui-selected": {
      color: theme.pillText,
      background: theme.iconButtonBg
    },
    "&.Mui-selected:hover": {
      background: theme.iconButtonBg
    },
    "&:hover": {
      background: theme.itemHoverBg
    }
  } as const;
}
