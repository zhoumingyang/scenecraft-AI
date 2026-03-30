"use client";

import { ReactNode } from "react";
import { Menu, MenuItem, MenuProps } from "@mui/material";

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
};

export default function DropdownMenu({
  anchorEl,
  open,
  onClose,
  items,
  anchorOrigin = { vertical: "bottom", horizontal: "left" },
  transformOrigin = { vertical: "top", horizontal: "left" },
  minWidth = 188
}: DropdownMenuProps) {
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
            border: "1px solid rgba(150,190,255,0.24)",
            background: "linear-gradient(160deg, rgba(16,24,44,0.96), rgba(7,11,22,0.94))",
            backdropFilter: "blur(14px)",
            boxShadow: "0 14px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(130,180,255,0.08) inset",
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
            color: "rgba(232,241,255,0.92)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: 0.2,
            transition: "all .16s ease",
            "&:hover": {
              background: "rgba(115,170,255,0.18)",
              color: "#f4f8ff"
            },
            "&.Mui-selected": {
              background: "linear-gradient(135deg, rgba(110,170,255,0.35), rgba(88,150,255,0.2))",
              color: "#ffffff"
            },
            "&.Mui-selected:hover": {
              background: "linear-gradient(135deg, rgba(120,180,255,0.42), rgba(98,160,255,0.24))"
            },
            "&.Mui-disabled": {
              color: "rgba(232,241,255,0.45)"
            }
          }}
        >
          {item.label}
        </MenuItem>
      ))}
    </Menu>
  );
}
