"use client";

import { Box, IconButton, InputBase, Stack, Tooltip, Typography } from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { getNodeIcon } from "./sceneTreePanel.utils";
import type { SceneTreeNode } from "./sceneTreePanel.types";

type SceneTreePanelRowProps = {
  node: SceneTreeNode;
  selected: boolean;
  isEditing: boolean;
  draftLabel: string;
  theme: ReturnType<typeof getEditorThemeTokens>;
  onDraftLabelChange: (value: string) => void;
  onSelectEntity: (entityId: string) => void;
  onDeleteEntity: (entityId: string) => void;
  onDuplicateEntity: (entityId: string) => void;
  onToggleLock: (entityId: string, locked: boolean) => void;
  onToggleVisible: (entityId: string, visible: boolean) => void;
  onStartRenaming: (node: SceneTreeNode) => void;
  onStopRenaming: () => void;
  onSubmitRenaming: (node: SceneTreeNode) => void;
};

export default function SceneTreePanelRow({
  node,
  selected,
  isEditing,
  draftLabel,
  theme,
  onDraftLabelChange,
  onSelectEntity,
  onDeleteEntity,
  onDuplicateEntity,
  onToggleLock,
  onToggleVisible,
  onStartRenaming,
  onStopRenaming,
  onSubmitRenaming
}: SceneTreePanelRowProps) {
  const selectionDisabled = node.type !== "scene" && (!node.effectivelyVisible || node.locked);
  const lockDisabled = node.type === "scene" || !node.effectivelyVisible;
  const canToggleVisible = node.type !== "light" && node.type !== "scene";
  const canDuplicate = node.type !== "scene" && !node.locked && node.effectivelyVisible;
  const canDelete = node.type !== "scene" && !node.locked && node.effectivelyVisible;
  const canToggleLock = !lockDisabled;
  const rowColor = node.locked ? theme.mutedText : selected ? theme.pillText : theme.text;

  const iconButtonSx = {
    color: rowColor,
    opacity: 0.9,
    p: 0.45,
    "&:hover": {
      background: theme.itemHoverBg
    },
    "&.Mui-disabled": {
      color: theme.menuItemDisabledText
    }
  };

  return (
    <Stack
      direction="row"
      spacing={0.35}
      alignItems="center"
      sx={{
        px: 1.1,
        py: 0.35,
        borderRadius: 1.6,
        border: selected ? theme.itemSelectedBorder : "1px solid transparent",
        background: selected ? theme.itemSelectedBg : theme.itemBg,
        opacity: node.effectivelyVisible ? 1 : 0.6,
        cursor: selectionDisabled ? "default" : "pointer"
      }}
      onClick={() => {
        if (selectionDisabled || isEditing) return;
        onSelectEntity(node.id);
      }}
    >
      <Stack
        direction="row"
        spacing={0.8}
        alignItems="center"
        sx={{
          minWidth: 0,
          flex: 1,
          py: 0.45,
          color: rowColor
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{getNodeIcon(node.type)}</Box>

        {isEditing ? (
          <InputBase
            autoFocus
            value={draftLabel}
            onChange={(event) => onDraftLabelChange(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onBlur={() => onSubmitRenaming(node)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmitRenaming(node);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onStopRenaming();
              }
            }}
            sx={{
              minWidth: 0,
              flex: 1,
              px: 0.75,
              py: 0.2,
              borderRadius: 1,
              border: theme.itemSelectedBorder,
              background: theme.itemSelectedBg,
              fontSize: 13,
              color: theme.text,
              "& input": {
                p: 0,
                minWidth: 0
              }
            }}
          />
        ) : (
          <Box
            onDoubleClick={(event) => {
              event.stopPropagation();
              onStartRenaming(node);
            }}
            sx={{
              minWidth: 0,
              flex: 1,
              overflow: "hidden"
            }}
          >
            <Typography
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 13,
                color: rowColor
              }}
            >
              {node.label}
            </Typography>
          </Box>
        )}
      </Stack>

      {canToggleVisible ? (
        <Tooltip title={node.visible ? "hide" : "show"} arrow>
          <span>
            <IconButton
              size="small"
              disabled={node.locked}
              onClick={(event) => {
                event.stopPropagation();
                if (isEditing) onStopRenaming();
                onToggleVisible(node.id, node.visible);
              }}
              sx={iconButtonSx}
            >
              {node.visible ? (
                <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
              ) : (
                <VisibilityOffRoundedIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      ) : null}

      <Tooltip title={node.locked ? "unlock" : "lock"} arrow>
        <span>
          <IconButton
            size="small"
            disabled={!canToggleLock}
            onClick={(event) => {
              event.stopPropagation();
              if (isEditing) onStopRenaming();
              onToggleLock(node.id, node.locked);
            }}
            sx={iconButtonSx}
          >
            {node.locked ? <LockRoundedIcon sx={{ fontSize: 16 }} /> : <LockOpenRoundedIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="copy" arrow>
        <span>
          <IconButton
            size="small"
            disabled={!canDuplicate}
            onClick={(event) => {
              event.stopPropagation();
              if (isEditing) onStopRenaming();
              onDuplicateEntity(node.id);
            }}
            sx={iconButtonSx}
          >
            <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="delete" arrow>
        <span>
          <IconButton
            size="small"
            disabled={!canDelete}
            onClick={(event) => {
              event.stopPropagation();
              if (isEditing) onStopRenaming();
              onDeleteEntity(node.id);
            }}
            sx={iconButtonSx}
          >
            <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
