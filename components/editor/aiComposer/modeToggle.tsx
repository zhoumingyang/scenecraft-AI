"use client";

import { useMemo, useState } from "react";
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import FormatPaintRoundedIcon from "@mui/icons-material/FormatPaintRounded";
import ViewInArRoundedIcon from "@mui/icons-material/ViewInArRounded";
import type { EditorThemeTokens } from "@/components/editor/theme";
import type { AiMode } from "@/stores/editorStore";

type Props = {
  aiMode: AiMode;
  theme: EditorThemeTokens;
  t: (key: any, params?: Record<string, string | number>) => string;
  onChange: (mode: AiMode) => void;
};

type ModeOption = {
  mode: AiMode;
  label: string;
  icon: typeof AutoAwesomeRoundedIcon;
};

export default function ModeToggle({ aiMode, theme, t, onChange }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const options = useMemo<ModeOption[]>(
    () => [
      {
        mode: "image",
        label: t("editor.ai.modeImage"),
        icon: AutoAwesomeRoundedIcon
      },
      {
        mode: "texture",
        label: t("editor.ai.modeTexture"),
        icon: FormatPaintRoundedIcon
      },
      {
        mode: "3d",
        label: t("editor.ai.mode3d"),
        icon: ViewInArRoundedIcon
      }
    ],
    [t]
  );
  const activeOption = options.find((option) => option.mode === aiMode) ?? options[0];
  const ActiveIcon = activeOption.icon;

  return (
    <>
      <IconButton
        size="small"
        title={activeOption.label}
        aria-label={activeOption.label}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          width: 42,
          height: 36,
          borderRadius: "10px",
          border: theme.sectionBorder,
          color: theme.pillText,
          background: theme.iconButtonBg,
          "&:hover": {
            background: theme.itemHoverBg
          }
        }}
      >
        <Stack direction="row" spacing={0.2} alignItems="center">
          <ActiveIcon sx={{ fontSize: 18 }} />
          <ExpandLessRoundedIcon sx={{ fontSize: 14, color: theme.mutedText }} />
        </Stack>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mb: 0.8,
              minWidth: 164,
              borderRadius: 1.2,
              border: theme.sectionBorder,
              background: theme.panelBg,
              color: theme.pillText,
              boxShadow: theme.panelShadow
            }
          }
        }}
      >
        {options.map((option) => {
          const Icon = option.icon;
          const selected = option.mode === aiMode;

          return (
            <MenuItem
              key={option.mode}
              selected={selected}
              onClick={() => {
                setAnchorEl(null);
                onChange(option.mode);
              }}
              sx={{
                gap: 0.8,
                minHeight: 36,
                color: selected ? theme.titleText : theme.text,
                background: selected ? theme.itemSelectedBg : "transparent",
                "&:hover": {
                  background: theme.itemHoverBg
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 24, color: "inherit" }}>
                <Icon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box component="span" sx={{ display: "block", minWidth: 0 }}>
                    <Typography component="span" sx={{ fontSize: 12, fontWeight: 700 }}>
                      {option.label}
                    </Typography>
                  </Box>
                }
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
