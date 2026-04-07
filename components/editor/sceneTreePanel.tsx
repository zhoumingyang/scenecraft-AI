"use client";

import { useMemo, useState } from "react";
import { Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { useI18n } from "@/lib/i18n";
import { SCENE_NODE_ID } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import { getEditorThemeTokens } from "@/components/editor/theme";

type SceneTreeNode = {
  id: string;
  label: string;
  type: "scene" | "model" | "mesh" | "light";
  locked: boolean;
  visible: boolean;
};

type SceneTreeSection = {
  id: "scene" | "model" | "mesh" | "light";
  label: string;
  icon: typeof FolderRoundedIcon;
  nodes: SceneTreeNode[];
};

function formatTitleCase(value: string) {
  if (!value) return "Mesh";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getLightLabel(lightType: number, index: number, t: ReturnType<typeof useI18n>["t"]) {
  const key =
    lightType === 2
      ? "editor.light.directional"
      : lightType === 3
        ? "editor.light.point"
        : lightType === 4
          ? "editor.light.spot"
          : lightType === 5
            ? "editor.light.rectArea"
            : "editor.light.ambient";
  return `${t(key)} ${index + 1}`;
}

export default function SceneTreePanel() {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const selectedEntityId = useEditorStore((state) => state.selectedEntityId);
  const projectVersion = useEditorStore((state) => state.projectVersion);
  const [open, setOpen] = useState(false);
  const theme = getEditorThemeTokens(editorThemeMode);

  const sections = useMemo<SceneTreeSection[]>(() => {
    const project = app?.projectModel;
    if (!project) {
      return [
        {
          id: "scene",
          label: t("editor.sceneTree.sceneGroup"),
          icon: PublicRoundedIcon,
          nodes: [
            {
              id: SCENE_NODE_ID,
              type: "scene",
              locked: false,
              visible: true,
              label: t("editor.sceneTree.scene")
            }
          ]
        },
        {
          id: "model",
          label: t("editor.sceneTree.models"),
          icon: FolderRoundedIcon,
          nodes: []
        },
        {
          id: "mesh",
          label: t("editor.sceneTree.meshes"),
          icon: GridViewRoundedIcon,
          nodes: []
        },
        {
          id: "light",
          label: t("editor.sceneTree.lights"),
          icon: LightModeRoundedIcon,
          nodes: []
        }
      ];
    }

    return [
      {
        id: "scene",
        label: t("editor.sceneTree.sceneGroup"),
        icon: PublicRoundedIcon,
        nodes: [
          {
            id: SCENE_NODE_ID,
            type: "scene",
            locked: false,
            visible: true,
            label: t("editor.sceneTree.scene")
          }
        ]
      },
      {
        id: "model",
        label: t("editor.sceneTree.models"),
        icon: FolderRoundedIcon,
        nodes: Array.from(project.models.values()).map((model, index) => ({
          id: model.id,
          type: "model",
          locked: model.locked,
          visible: model.visible,
          label: `${t("editor.sceneTree.model")} ${index + 1}`
        }))
      },
      {
        id: "mesh",
        label: t("editor.sceneTree.meshes"),
        icon: GridViewRoundedIcon,
        nodes: Array.from(project.meshes.values()).map((mesh, index) => ({
          id: mesh.id,
          type: "mesh",
          locked: mesh.locked,
          visible: mesh.visible,
          label: `${formatTitleCase(mesh.geometryName)} ${index + 1}`
        }))
      },
      {
        id: "light",
        label: t("editor.sceneTree.lights"),
        icon: LightModeRoundedIcon,
        nodes: Array.from(project.lights.values()).map((light, index) => ({
          id: light.id,
          type: "light",
          locked: light.locked,
          visible: true,
          label: getLightLabel(light.lightType, index, t)
        }))
      }
    ];
  }, [app, projectVersion, t]);

  const onSelectEntity = async (entityId: string) => {
    if (!app) return;
    await app.dispatch({
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
              <Box
                key={section.id}
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
                  <Typography sx={{ fontSize: 12, color: theme.mutedText }}>
                    {section.nodes.length}
                  </Typography>
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
                      {t("editor.sceneTree.empty")}
                    </Typography>
                  ) : (
                    section.nodes.map((node) => {
                      const selected = node.id === selectedEntityId;
                      const actionsDisabled = node.locked || node.type === "scene";
                      const canToggleVisible = node.type !== "light" && node.type !== "scene";
                      const rowColor = node.locked
                        ? theme.mutedText
                        : selected
                          ? theme.pillText
                          : theme.text;

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
                          key={node.id}
                          direction="row"
                          spacing={0.35}
                          alignItems="center"
                          sx={{
                            px: 1.1,
                            py: 0.35,
                            borderRadius: 1.6,
                            border: selected
                              ? theme.itemSelectedBorder
                              : "1px solid transparent",
                            background: selected
                              ? theme.itemSelectedBg
                              : theme.itemBg,
                            opacity: node.visible ? 1 : 0.6
                          }}
                        >
                          <Button
                            fullWidth
                            color="inherit"
                            disabled={node.locked}
                            onClick={() => void onSelectEntity(node.id)}
                            startIcon={
                              node.type === "scene" ? (
                                <PublicRoundedIcon sx={{ fontSize: 16 }} />
                              ) : node.type === "model" ? (
                                <FolderRoundedIcon sx={{ fontSize: 16 }} />
                              ) : node.type === "mesh" ? (
                                <GridViewRoundedIcon sx={{ fontSize: 16 }} />
                              ) : (
                                <LightModeRoundedIcon sx={{ fontSize: 16 }} />
                              )
                            }
                            sx={{
                              minWidth: 0,
                              justifyContent: "flex-start",
                              px: 0,
                              py: 0.45,
                              color: rowColor,
                              textTransform: "none",
                              "&.Mui-disabled": {
                                color: rowColor
                              }
                            }}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                width: "100%",
                                textAlign: "left"
                              }}
                            >
                              {node.label}
                            </span>
                          </Button>

                          {canToggleVisible ? (
                            <Tooltip title={node.visible ? "hide" : "show"} arrow>
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={actionsDisabled}
                                  onClick={(event) => {
                                    event.stopPropagation();
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
                                disabled={actionsDisabled}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onToggleLock(node.id, node.locked);
                                }}
                                sx={iconButtonSx}
                              >
                                {node.locked ? (
                                  <LockRoundedIcon sx={{ fontSize: 16 }} />
                                ) : (
                                  <LockOpenRoundedIcon sx={{ fontSize: 16 }} />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="copy" arrow>
                            <span>
                              <IconButton
                                size="small"
                                disabled={actionsDisabled}
                                onClick={(event) => {
                                  event.stopPropagation();
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
                                disabled={actionsDisabled}
                                onClick={(event) => {
                                  event.stopPropagation();
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
                    })
                  )}
                </Stack>
              </Box>
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
