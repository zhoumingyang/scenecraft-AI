"use client";

import { MouseEvent, ReactNode, useMemo, useState } from "react";
import { IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import type { AiImageModelId } from "@/stores/editorStore";

const MODELS: Array<{
  id: AiImageModelId;
  icon: ReactNode;
  label: string;
}> = [
  {
    id: "Qwen/Qwen-Image",
    icon: <ImageRoundedIcon sx={{ fontSize: 18 }} />,
    label: "Qwen/Qwen-Image"
  },
  {
    id: "Qwen/Qwen-Image-Edit-2509",
    icon: <EditRoundedIcon sx={{ fontSize: 18 }} />,
    label: "Qwen/Qwen-Image-Edit-2509"
  }
];

type AiImageModelMenuProps = {
  model: AiImageModelId;
  onChange: (model: AiImageModelId) => void;
  onFocus: () => void;
};

export default function AiImageModelMenu({
  model,
  onChange,
  onFocus
}: AiImageModelMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const activeModelMeta = useMemo(
    () => MODELS.find((item) => item.id === model) ?? MODELS[0],
    [model]
  );

  return (
    <>
      <Tooltip title={activeModelMeta.label}>
        <IconButton
          size="small"
          onClick={(event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}
          sx={{
            color: "rgba(230,239,255,0.96)",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(180,205,255,0.14)"
          }}
        >
          {activeModelMeta.icon}
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mb: 1,
              borderRadius: 1,
              border: "1px solid rgba(180,205,255,0.18)",
              background: "rgba(8,12,24,0.96)",
              backdropFilter: "blur(12px)",
              color: "#eef5ff"
            }
          }
        }}
      >
        {MODELS.map((item) => (
          <MenuItem
            key={item.id}
            selected={item.id === model}
            onClick={() => {
              onChange(item.id);
              setAnchorEl(null);
              onFocus();
            }}
            sx={{ gap: 1, minWidth: 240, fontSize: 13 }}
          >
            {item.icon}
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
