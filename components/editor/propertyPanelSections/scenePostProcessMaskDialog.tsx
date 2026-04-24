"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from "@mui/material";
import { SCENE_NODE_ID } from "@/render/editor";
import { buildSceneTreeNodes, getNodeIcon } from "@/components/editor/sceneTreePanel.utils";
import type { SceneTreeNode } from "@/components/editor/sceneTreePanel.types";
import type { EditorApp } from "@/render/editor/app";

type ScenePostProcessMaskDialogProps = {
  app: EditorApp | null;
  open: boolean;
  targetEntityIds: string[];
  t: (key: string, values?: Record<string, string | number>) => string;
  onClose: () => void;
  onConfirm: (targetEntityIds: string[]) => void;
};

function isSelectableNode(node: SceneTreeNode) {
  return node.type !== "scene" && node.type !== "light";
}

function collectSelectableEntityIds(node: SceneTreeNode): string[] {
  const childIds = node.children.flatMap((child) => collectSelectableEntityIds(child));
  if (!isSelectableNode(node)) {
    return childIds;
  }
  return [node.id, ...childIds];
}

type TreeRowProps = {
  node: SceneTreeNode;
  depth: number;
  selection: Set<string>;
  t: ScenePostProcessMaskDialogProps["t"];
  onToggleNode: (node: SceneTreeNode, checked: boolean) => void;
};

function TreeRow({ node, depth, selection, t, onToggleNode }: TreeRowProps) {
  const selectableIds = useMemo(() => collectSelectableEntityIds(node), [node]);
  const selectedCount = selectableIds.filter((id) => selection.has(id)).length;
  const checked = selectableIds.length > 0 && selectedCount === selectableIds.length;
  const indeterminate = selectedCount > 0 && selectedCount < selectableIds.length;
  const disabled = !isSelectableNode(node) && selectableIds.length === 0;

  return (
    <Stack spacing={0.2}>
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{
          pl: depth * 1.4,
          py: 0.25
        }}
      >
        <Checkbox
          size="small"
          checked={checked}
          indeterminate={indeterminate}
          disabled={disabled}
          onChange={(event) => onToggleNode(node, event.target.checked)}
          sx={{ p: 0.35 }}
        />
        <Box sx={{ display: "flex", color: "rgba(178,198,236,0.85)" }}>{getNodeIcon(node.type)}</Box>
        <Typography sx={{ fontSize: 12, color: "rgba(232,240,255,0.92)" }}>{node.label}</Typography>
        {node.type === "scene" ? (
          <Typography sx={{ fontSize: 10, color: "rgba(176,197,238,0.62)" }}>
            {t("editor.post.mask.sceneNotSelectable")}
          </Typography>
        ) : null}
        {node.type === "light" ? (
          <Typography sx={{ fontSize: 10, color: "rgba(176,197,238,0.62)" }}>
            {t("editor.post.mask.lightNotSelectable")}
          </Typography>
        ) : null}
      </Stack>

      {node.children.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          selection={selection}
          t={t}
          onToggleNode={onToggleNode}
        />
      ))}
    </Stack>
  );
}

export function ScenePostProcessMaskDialog({
  app,
  open,
  targetEntityIds,
  t,
  onClose,
  onConfirm
}: ScenePostProcessMaskDialogProps) {
  const [selection, setSelection] = useState<Set<string>>(new Set(targetEntityIds));

  useEffect(() => {
    if (!open) return;
    setSelection(new Set(targetEntityIds));
  }, [open, targetEntityIds]);

  const nodes = useMemo(
    () => buildSceneTreeNodes(app?.projectModel, t, SCENE_NODE_ID),
    [app, t]
  );

  const handleToggleNode = (node: SceneTreeNode, checked: boolean) => {
    const selectableIds = collectSelectableEntityIds(node);
    if (selectableIds.length === 0) return;

    setSelection((current) => {
      const next = new Set(current);
      selectableIds.forEach((id) => {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          background: "rgba(10,18,38,0.96)",
          color: "#eef5ff",
          border: "1px solid rgba(160,190,255,0.16)"
        }
      }}
    >
      <DialogTitle sx={{ fontSize: 15 }}>{t("editor.post.mask.dialogTitle")}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: "rgba(160,190,255,0.12)" }}>
        <Stack spacing={1.1}>
          <Typography sx={{ fontSize: 12, color: "rgba(176,197,238,0.74)" }}>
            {t("editor.post.mask.dialogDescription")}
          </Typography>
          <Stack
            spacing={0.35}
            sx={{
              maxHeight: 360,
              overflowY: "auto",
              borderRadius: 1,
              border: "1px solid rgba(160,190,255,0.12)",
              background: "rgba(255,255,255,0.02)",
              p: 1
            }}
          >
            {nodes.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                depth={0}
                selection={selection}
                t={t}
                onToggleNode={handleToggleNode}
              />
            ))}
          </Stack>
          <Typography sx={{ fontSize: 11, color: "rgba(219,230,255,0.7)" }}>
            {t("editor.post.mask.selectedCount", { count: selection.size })}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={() => setSelection(new Set())}>{t("editor.post.mask.clear")}</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>{t("editor.post.mask.cancel")}</Button>
        <Button variant="contained" onClick={() => onConfirm(Array.from(selection))}>
          {t("editor.post.mask.apply")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
