"use client";

import { useMemo, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";

type SceneTreeNode = {
  id: string;
  label: string;
  type: "model" | "mesh" | "light";
};

type SceneTreeSection = {
  id: "model" | "mesh" | "light";
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
  const selectedEntityId = useEditorStore((state) => state.selectedEntityId);
  const projectVersion = useEditorStore((state) => state.projectVersion);
  const [open, setOpen] = useState(false);

  const sections = useMemo<SceneTreeSection[]>(() => {
    const project = app?.projectModel;
    if (!project) {
      return [
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
        id: "model",
        label: t("editor.sceneTree.models"),
        icon: FolderRoundedIcon,
        nodes: Array.from(project.models.values()).map((model, index) => ({
          id: model.id,
          type: "model",
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

  return (
    <>
      {open ? (
        <Box
          sx={{
            position: "absolute",
            right: 20,
            bottom: 76,
            zIndex: 21,
            width: 300,
            maxHeight: "42vh",
            overflowY: "auto",
            borderRadius: 2.5,
            border: "1px solid rgba(180,205,255,0.26)",
            background: "rgba(8,12,24,0.78)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.28)"
          }}
        >
          <Stack spacing={1.5} sx={{ p: 1.5 }}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(220,232,255,0.92)"
              }}
            >
              {t("editor.sceneTree.title")}
            </Typography>

            {sections.map((section) => (
              <Box
                key={section.id}
                sx={{
                  borderRadius: 2,
                  border: "1px solid rgba(160,190,255,0.14)",
                  background: "rgba(255,255,255,0.03)"
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{
                    px: 1.2,
                    py: 0.9,
                    color: "rgba(211,224,255,0.8)"
                  }}
                >
                  <section.icon sx={{ fontSize: 17 }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{section.label}</Typography>
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: 12, color: "rgba(170,188,225,0.74)" }}>
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
                        color: "rgba(165,180,212,0.62)"
                      }}
                    >
                      {t("editor.sceneTree.empty")}
                    </Typography>
                  ) : (
                    section.nodes.map((node) => {
                      const selected = node.id === selectedEntityId;
                      return (
                        <Button
                          key={node.id}
                          fullWidth
                          color="inherit"
                          onClick={() => void onSelectEntity(node.id)}
                          startIcon={
                            node.type === "model" ? (
                              <FolderRoundedIcon sx={{ fontSize: 16 }} />
                            ) : node.type === "mesh" ? (
                              <GridViewRoundedIcon sx={{ fontSize: 16 }} />
                            ) : (
                              <LightModeRoundedIcon sx={{ fontSize: 16 }} />
                            )
                          }
                          sx={{
                            justifyContent: "flex-start",
                            px: 1.1,
                            py: 0.8,
                            borderRadius: 1.6,
                            border: selected
                              ? "1px solid rgba(124,183,255,0.8)"
                              : "1px solid transparent",
                            background: selected
                              ? "rgba(78,140,255,0.18)"
                              : "rgba(255,255,255,0.02)",
                            color: selected ? "#e9f3ff" : "rgba(219,230,255,0.84)",
                            textTransform: "none"
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
          right: 20,
          bottom: 20,
          zIndex: 21,
          borderRadius: 99,
          border: "1px solid rgba(180,205,255,0.3)",
          background: "rgba(8,12,24,0.72)",
          backdropFilter: "blur(10px)"
        }}
      >
        {t("editor.sceneTree.button")}
      </Button>
    </>
  );
}
