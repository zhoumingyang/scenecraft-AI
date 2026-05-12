"use client";

import { useMemo, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import { useI18n } from "@/lib/i18n";
import { SCENE_NODE_ID } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import { getEditorThemeTokens } from "@/components/editor/theme";
import SceneTreePanelSection from "./sceneTreePanelSection";
import { buildSceneTreeSections } from "./sceneTreePanel.utils";
import type { SceneTreeNode } from "./sceneTreePanel.types";

export default function SceneTreePanel() {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const selectedEntityId = useEditorStore((state) => state.selectedEntityId);
  const sceneTreeVersion = useEditorStore((state) => state.sceneTreeVersion);
  const [open, setOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const theme = getEditorThemeTokens(editorThemeMode);

  const sections = useMemo(
    () => buildSceneTreeSections(app?.projectModel, t, SCENE_NODE_ID),
    [app, sceneTreeVersion, t]
  );

  const onSelectEntity = (entityId: string) => {
    if (!app) return;
    void app.dispatch({
      type: "selection.set",
      entityId,
      source: "ui"
    });
  };

  const onDeleteEntity = (entityId: string) => {
    app?.removeEntity(entityId);
  };

  const onDuplicateEntity = (entityId: string) => {
    app?.duplicateEntity(entityId);
  };

  const onToggleLock = (entityId: string, locked: boolean) => {
    app?.setEntityLocked(entityId, !locked);
  };

  const onToggleVisible = (entityId: string, visible: boolean) => {
    app?.setEntityVisible(entityId, !visible);
  };

  const startRenaming = (node: SceneTreeNode) => {
    if (node.type === "scene" || node.type === "gridHelper") return;
    setEditingNodeId(node.id);
    setDraftLabel(node.label);
  };

  const stopRenaming = () => {
    setEditingNodeId(null);
    setDraftLabel("");
  };

  const submitRenaming = (node: SceneTreeNode) => {
    if (node.type === "scene" || node.type === "gridHelper") return;
    const nextLabel = draftLabel.trim() || node.fallbackLabel;
    app?.updateEntityLabel(node.id, nextLabel);
    stopRenaming();
  };

  return (
    <>
      {open ? (
        <Box
          sx={{
            position: "absolute",
            left: 20,
            bottom: 116,
            zIndex: 21,
            width: 300,
            maxHeight: "42vh",
            overflowY: "auto",
            borderRadius: 1,
            border: theme.panelBorder,
            background: theme.panelBg,
            backdropFilter: "blur(12px)",
            boxShadow: theme.panelShadow
          }}
        >
          <Stack spacing={1.5} sx={{ p: 1.5 }}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: theme.titleText
              }}
            >
              {t("editor.sceneTree.title")}
            </Typography>

            {sections.map((section) => (
              <SceneTreePanelSection
                key={section.id}
                section={section}
                emptyLabel={t("editor.sceneTree.empty")}
                selectedEntityId={selectedEntityId}
                editingNodeId={editingNodeId}
                draftLabel={draftLabel}
                theme={theme}
                onDraftLabelChange={setDraftLabel}
                onSelectEntity={onSelectEntity}
                onDeleteEntity={onDeleteEntity}
                onDuplicateEntity={onDuplicateEntity}
                onToggleLock={onToggleLock}
                onToggleVisible={onToggleVisible}
                onStartRenaming={startRenaming}
                onStopRenaming={stopRenaming}
                onSubmitRenaming={submitRenaming}
              />
            ))}
          </Stack>
        </Box>
      ) : null}

      <Button
        size="small"
        color="inherit"
        startIcon={<AccountTreeRoundedIcon />}
        endIcon={open ? <KeyboardArrowDownRoundedIcon /> : <KeyboardArrowUpRoundedIcon />}
        onClick={() => setOpen((value) => !value)}
        sx={{
          position: "absolute",
          left: 20,
          bottom: 72,
          zIndex: 21,
          borderRadius: 99,
          border: theme.pillBorder,
          background: theme.pillBg,
          backdropFilter: "blur(10px)",
          boxShadow: theme.pillShadow,
          color: theme.pillText
        }}
      >
        {t("editor.sceneTree.button")}
      </Button>
    </>
  );
}
