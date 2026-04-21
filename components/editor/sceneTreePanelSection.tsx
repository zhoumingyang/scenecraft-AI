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
  selectedEntityId: string | null;
  editingNodeId: string | null;
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

export default function SceneTreePanelSection({
  section,
  emptyLabel,
  selectedEntityId,
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
  onSubmitRenaming
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
    if (!selectedEntityId) return;

    const ancestorIds: string[] = [];
    const collectAncestorIds = (nodes: SceneTreeNode[], trail: string[]): boolean => {
      for (const node of nodes) {
        if (node.id === selectedEntityId) {
          ancestorIds.push(...trail);
          return true;
        }
        if (collectAncestorIds(node.children, [...trail, node.id])) {
          return true;
        }
      }
      return false;
    };

    if (!collectAncestorIds(section.nodes, [])) return;

    setCollapsedNodeIds((current) => {
      const next = new Set(current);
      ancestorIds.forEach((id) => next.delete(id));
      return next;
    });
  }, [section.nodes, selectedEntityId]);

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

    return (
      <Stack key={node.id} spacing={0.5}>
        <SceneTreePanelRow
          node={node}
          depth={depth}
          expanded={expanded}
          onToggleExpand={toggleNode}
          selected={node.id === selectedEntityId}
          isEditing={editingNodeId === node.id}
          draftLabel={draftLabel}
          theme={theme}
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
