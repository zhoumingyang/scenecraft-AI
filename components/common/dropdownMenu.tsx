"use client";

import { ReactNode } from "react";
import { Menu, MenuItem, MenuProps } from "@mui/material";
import type { EditorThemeMode } from "@/stores/editorStore";
import { getEditorThemeTokens } from "@/components/editor/theme";

export type DropdownMenuItem = {
  key: string;
  label: ReactNode;
  onClick: () => void;
  selected?: boolean;
  disabled?: boolean;
};

type DropdownMenuProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  items: DropdownMenuItem[];
  anchorOrigin?: MenuProps["anchorOrigin"];
  transformOrigin?: MenuProps["transformOrigin"];
  minWidth?: number;
  themeMode?: EditorThemeMode;
};

export default function DropdownMenu({
  anchorEl,
  open,
  onClose,
  items,
  anchorOrigin = { vertical: "bottom", horizontal: "left" },
  transformOrigin = { vertical: "top", horizontal: "left" },
  minWidth = 188,
  themeMode = "dark"
}: DropdownMenuProps) {
  const theme = getEditorThemeTokens(themeMode);

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      slotProps={{
        paper: {
          elevation: 0,
          sx: {
            mt: 1,
            minWidth,
            borderRadius: 1,
            border: theme.menuBorder,
            background: theme.menuBg,
            backdropFilter: "blur(14px)",
            boxShadow: theme.panelShadow,
            overflow: "hidden"
          }
        }
      }}
      MenuListProps={{
        sx: {
          py: 0.7
        }
      }}
    >
      {items.map((item) => (
        <MenuItem
          key={item.key}
          selected={item.selected}
          disabled={item.disabled}
          onClick={item.onClick}
          sx={{
            mx: 0.7,
            my: 0.35,
            borderRadius: 1.2,
            minHeight: 36,
            color: theme.menuItemText,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: 0.2,
            transition: "all .16s ease",
            "&:hover": {
              background: theme.menuItemHoverBg,
              color: theme.pillText
            },
            "&.Mui-selected": {
              background: theme.menuItemSelectedBg,
              color: theme.pillText
            },
            "&.Mui-selected:hover": {
              background: theme.menuItemSelectedBg
            },
            "&.Mui-disabled": {
              color: theme.menuItemDisabledText
            }
          }}
        >
          {item.label}
        </MenuItem>
      ))}
    </Menu>
  );
}
