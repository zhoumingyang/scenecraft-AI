"use client";

import { Box, Stack, Typography } from "@mui/material";
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
        sx={{
          px: 1.2,
          py: 0.9,
          color: theme.text
        }}
      >
        <section.icon sx={{ fontSize: 17 }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{section.label}</Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12, color: theme.mutedText }}>{section.nodes.length}</Typography>
      </Stack>

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
          section.nodes.map((node) => (
            <SceneTreePanelRow
              key={node.id}
              node={node}
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
          ))
        )}
      </Stack>
    </Box>
  );
}
