"use client";

import { MouseEvent, ReactNode, useMemo, useState } from "react";
import { IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { IMAGE_GENERATION_MODELS, getImageGenerationModelConfig } from "@/lib/ai/image-generation/models";
import { useEditorStore, type AiImageModelId } from "@/stores/editorStore";

const MODELS: Array<{
  id: AiImageModelId;
  icon: ReactNode;
  label: string;
}> = IMAGE_GENERATION_MODELS.map((model) => ({
  id: model.id,
  icon:
    model.maxReferenceImages > 0 ? (
      <EditRoundedIcon sx={{ fontSize: 18 }} />
    ) : (
      <ImageRoundedIcon sx={{ fontSize: 18 }} />
    ),
  label: model.label
}));

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
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const theme = getEditorThemeTokens(editorThemeMode);
  const activeModelMeta = useMemo(
    () => MODELS.find((item) => item.id === model) ?? MODELS[0],
    [model]
  );
  const activeModelConfig = getImageGenerationModelConfig(activeModelMeta.id);

  return (
    <>
      <Tooltip title={`${activeModelMeta.label} (${activeModelConfig.providerId})`}>
        <IconButton
          size="small"
          onClick={(event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}
          sx={{
            color: theme.pillText,
            background: theme.itemBg,
            border: theme.sectionBorder
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
              border: theme.menuBorder,
              background: theme.menuBg,
              backdropFilter: "blur(12px)",
              color: theme.pillText
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
            sx={{
              gap: 1,
              minWidth: 240,
              fontSize: 13,
              color: theme.menuItemText,
              "&.Mui-selected": {
                background: theme.menuItemSelectedBg,
                color: theme.pillText
              },
              "&.Mui-selected:hover": {
                background: theme.menuItemSelectedBg
              },
              "&:hover": {
                background: theme.menuItemHoverBg
              }
            }}
          >
            {item.icon}
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
