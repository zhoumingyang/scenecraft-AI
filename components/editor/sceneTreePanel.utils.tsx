"use client";

import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import type { EditorProjectModel } from "@/render/editor";
import { useI18n } from "@/lib/i18n";
import type { SceneTreeNode, SceneTreeNodeType, SceneTreeSection } from "./sceneTreePanel.types";

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

function createSceneNode(
  sceneNodeId: string,
  t: ReturnType<typeof useI18n>["t"]
): SceneTreeNode {
  const label = t("editor.sceneTree.scene");
  return {
    id: sceneNodeId,
    type: "scene",
    locked: false,
    visible: true,
    effectivelyVisible: true,
    label,
    fallbackLabel: label
  };
}

export function getNodeIcon(nodeType: SceneTreeNodeType) {
  if (nodeType === "scene") return <PublicRoundedIcon sx={{ fontSize: 16 }} />;
  if (nodeType === "group") return <AccountTreeRoundedIcon sx={{ fontSize: 16 }} />;
  if (nodeType === "model") return <FolderRoundedIcon sx={{ fontSize: 16 }} />;
  if (nodeType === "mesh") return <GridViewRoundedIcon sx={{ fontSize: 16 }} />;
  return <LightModeRoundedIcon sx={{ fontSize: 16 }} />;
}

export function buildSceneTreeSections(
  project: EditorProjectModel | null | undefined,
  t: ReturnType<typeof useI18n>["t"],
  sceneNodeId: string
): SceneTreeSection[] {
  const sceneSection: SceneTreeSection = {
    id: "scene",
    label: t("editor.sceneTree.sceneGroup"),
    icon: PublicRoundedIcon,
    nodes: [createSceneNode(sceneNodeId, t)]
  };

  if (!project) {
    return [
      sceneSection,
      {
        id: "group",
        label: t("editor.sceneTree.groups"),
        icon: AccountTreeRoundedIcon,
        nodes: []
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
    sceneSection,
    {
      id: "group",
      label: t("editor.sceneTree.groups"),
      icon: AccountTreeRoundedIcon,
      nodes: Array.from(project.groups.values()).map((group, index) => {
        const fallbackLabel = `${t("editor.sceneTree.group")} ${index + 1}`;
        return {
          id: group.id,
          type: "group",
          locked: group.locked,
          visible: group.visible,
          effectivelyVisible: project.isEntityEffectivelyVisible(group.id),
          label: group.label || fallbackLabel,
          fallbackLabel
        };
      })
    },
    {
      id: "model",
      label: t("editor.sceneTree.models"),
      icon: FolderRoundedIcon,
      nodes: Array.from(project.models.values()).map((model, index) => {
        const fallbackLabel = `${t("editor.sceneTree.model")} ${index + 1}`;
        return {
          id: model.id,
          type: "model",
          locked: model.locked,
          visible: model.visible,
          effectivelyVisible: project.isEntityEffectivelyVisible(model.id),
          label: model.label || fallbackLabel,
          fallbackLabel
        };
      })
    },
    {
      id: "mesh",
      label: t("editor.sceneTree.meshes"),
      icon: GridViewRoundedIcon,
      nodes: Array.from(project.meshes.values()).map((mesh, index) => {
        const fallbackLabel = `${formatTitleCase(mesh.geometryName)} ${index + 1}`;
        return {
          id: mesh.id,
          type: "mesh",
          locked: mesh.locked,
          visible: mesh.visible,
          effectivelyVisible: project.isEntityEffectivelyVisible(mesh.id),
          label: mesh.label || fallbackLabel,
          fallbackLabel
        };
      })
    },
    {
      id: "light",
      label: t("editor.sceneTree.lights"),
      icon: LightModeRoundedIcon,
      nodes: Array.from(project.lights.values()).map((light, index) => {
        const fallbackLabel = getLightLabel(light.lightType, index, t);
        return {
          id: light.id,
          type: "light",
          locked: light.locked,
          visible: true,
          effectivelyVisible: project.isEntityEffectivelyVisible(light.id),
          label: light.label || fallbackLabel,
          fallbackLabel
        };
      })
    }
  ];
}
