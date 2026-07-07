"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import { getEditorThemeTokens } from "@/components/editor/theme";
import SceneTreePanelRow from "./sceneTreePanelRow";
import type { SceneTreeNode, SceneTreeSection } from "./sceneTreePanel.types";

type SceneTreePanelSectionProps = {
  section: SceneTreeSection;
  emptyLabel: string;
  selectedEntityIds: string[];
  editingNodeId: string | null;
  draftLabel: string;
  theme: ReturnType<typeof getEditorThemeTokens>;
  onDraftLabelChange: (value: string) => void;
  onSelectEntity: (entityId: string, mode?: "replace" | "toggle") => void;
  onDeleteEntity: (entityId: string) => void;
  onDuplicateEntity: (entityId: string) => void;
  onToggleLock: (entityId: string, locked: boolean) => void;
  onToggleVisible: (entityId: string, visible: boolean) => void;
  onStartRenaming: (node: SceneTreeNode) => void;
  onStopRenaming: () => void;
  onSubmitRenaming: (node: SceneTreeNode) => void;
  isNodeInteractive?: (node: SceneTreeNode) => boolean;
  canUseNodeAction?: (
    node: SceneTreeNode,
    action: "select" | "delete" | "duplicate" | "rename" | "lock" | "visibility"
  ) => boolean;
};

export default function SceneTreePanelSection({
  section,
  emptyLabel,
  selectedEntityIds,
  editingNodeId,
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
  onSubmitRenaming,
  isNodeInteractive,
  canUseNodeAction
}: SceneTreePanelSectionProps) {
  const [open, setOpen] = useState(true);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(() => new Set());

  const allNodeIds = useMemo(() => {
    const ids = new Set<string>();

    const walk = (nodes: SceneTreeNode[]) => {
      nodes.forEach((node) => {
        ids.add(node.id);
        walk(node.children);
      });
    };

    walk(section.nodes);
    return ids;
  }, [section.nodes]);

  useEffect(() => {
    setCollapsedNodeIds((current) => {
      const next = new Set<string>();
      current.forEach((id) => {
        if (allNodeIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [allNodeIds]);

  useEffect(() => {
    if (selectedEntityIds.length === 0) return;

    const ancestorIds: string[] = [];
    const collectAncestorIds = (nodes: SceneTreeNode[], trail: string[]): boolean => {
      let found = false;
      for (const node of nodes) {
        if (selectedEntityIds.includes(node.id)) {
          ancestorIds.push(...trail);
          found = true;
        }
        if (collectAncestorIds(node.children, [...trail, node.id])) {
          found = true;
        }
      }
      return found;
    };

    if (!collectAncestorIds(section.nodes, [])) return;

    setCollapsedNodeIds((current) => {
      const next = new Set(current);
      ancestorIds.forEach((id) => next.delete(id));
      return next;
    });
  }, [section.nodes, selectedEntityIds]);

  const totalNodes = useMemo(() => {
    const countNodes = (nodes: SceneTreeNode[]): number =>
      nodes.reduce((count, node) => count + 1 + countNodes(node.children), 0);
    return countNodes(section.nodes);
  }, [section.nodes]);

  const toggleNode = (nodeId: string) => {
    setCollapsedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderNode = (node: SceneTreeNode, depth = 0): ReactNode => {
    const expanded = !collapsedNodeIds.has(node.id);
    const interactive = isNodeInteractive ? isNodeInteractive(node) : true;
    const canUseAction = (
      action: "select" | "delete" | "duplicate" | "rename" | "lock" | "visibility"
    ) => (canUseNodeAction ? canUseNodeAction(node, action) : interactive);

    return (
      <Stack key={node.id} spacing={0.5}>
        <SceneTreePanelRow
          node={node}
          depth={depth}
          expanded={expanded}
          onToggleExpand={toggleNode}
          selected={selectedEntityIds.includes(node.id)}
          isEditing={editingNodeId === node.id}
          draftLabel={draftLabel}
          theme={theme}
          interactive={interactive}
          canSelect={canUseAction("select")}
          canDelete={canUseAction("delete")}
          canDuplicate={canUseAction("duplicate")}
          canRename={canUseAction("rename")}
          canToggleLock={canUseAction("lock")}
          canToggleVisible={canUseAction("visibility")}
          onDraftLabelChange={onDraftLabelChange}
          onSelectEntity={onSelectEntity}
          onDeleteEntity={onDeleteEntity}
          onDuplicateEntity={onDuplicateEntity}
          onToggleLock={onToggleLock}
          onToggleVisible={onToggleVisible}
          onStartRenaming={onStartRenaming}
          onStopRenaming={onStopRenaming}
          onSubmitRenaming={onSubmitRenaming}
        />

        {expanded ? node.children.map((child) => renderNode(child, depth + 1)) : null}
      </Stack>
    );
  };

  return (
    <Box
      sx={{
        borderRadius: 1,
        border: theme.sectionBorder,
        background: theme.sectionBg
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        onClick={() => setOpen((value) => !value)}
        sx={{
          px: 1.2,
          py: 0.9,
          color: theme.text,
          cursor: "pointer"
        }}
      >
        {open ? (
          <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16, color: theme.mutedText }} />
        ) : (
          <KeyboardArrowRightRoundedIcon sx={{ fontSize: 16, color: theme.mutedText }} />
        )}
        <section.icon sx={{ fontSize: 17 }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{section.label}</Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12, color: theme.mutedText }}>{totalNodes}</Typography>
      </Stack>

      {open ? (
        <Stack spacing={0.5} sx={{ px: 0.8, pb: 0.8 }}>
          {section.nodes.length === 0 ? (
            <Typography
              sx={{
                px: 1.1,
                py: 0.8,
                fontSize: 12,
                color: theme.mutedText
              }}
            >
              {emptyLabel}
            </Typography>
          ) : (
            section.nodes.map((node) => renderNode(node))
          )}
        </Stack>
      ) : null}
    </Box>
  );
}
