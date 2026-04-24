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
            : lightType === 6
              ? "editor.light.hemisphere"
              : "editor.light.ambient";
  return `${t(key)} ${index + 1}`;
}

function createSceneNode(
  sceneNodeId: string,
  t: ReturnType<typeof useI18n>["t"],
  children: SceneTreeNode[] = []
): SceneTreeNode {
  const label = t("editor.sceneTree.scene");
  return {
    id: sceneNodeId,
    type: "scene",
    locked: false,
    visible: true,
    effectivelyVisible: true,
    label,
    fallbackLabel: label,
    children
  };
}

function buildEntityNodeMap(
  project: EditorProjectModel,
  t: ReturnType<typeof useI18n>["t"]
) {
  const entityNodeMap = new Map<string, Omit<SceneTreeNode, "children">>();
  const entityIdsInOrder: string[] = [];
  const childIds = new Set<string>();

  Array.from(project.groups.values()).forEach((group, index) => {
    const fallbackLabel = `${t("editor.sceneTree.group")} ${index + 1}`;
    entityNodeMap.set(group.id, {
      id: group.id,
      type: "group",
      locked: group.locked,
      visible: group.visible,
      effectivelyVisible: project.isEntityEffectivelyVisible(group.id),
      label: group.label || fallbackLabel,
      fallbackLabel
    });
    entityIdsInOrder.push(group.id);
    group.children.forEach((childId) => childIds.add(childId));
  });

  Array.from(project.models.values()).forEach((model, index) => {
    const fallbackLabel = `${t("editor.sceneTree.model")} ${index + 1}`;
    entityNodeMap.set(model.id, {
      id: model.id,
      type: "model",
      locked: model.locked,
      visible: model.visible,
      effectivelyVisible: project.isEntityEffectivelyVisible(model.id),
      label: model.label || fallbackLabel,
      fallbackLabel
    });
    entityIdsInOrder.push(model.id);
  });

  Array.from(project.meshes.values()).forEach((mesh, index) => {
    const fallbackLabel = `${formatTitleCase(mesh.geometryName)} ${index + 1}`;
    entityNodeMap.set(mesh.id, {
      id: mesh.id,
      type: "mesh",
      locked: mesh.locked,
      visible: mesh.visible,
      effectivelyVisible: project.isEntityEffectivelyVisible(mesh.id),
      label: mesh.label || fallbackLabel,
      fallbackLabel
    });
    entityIdsInOrder.push(mesh.id);
  });

  Array.from(project.lights.values()).forEach((light, index) => {
    const fallbackLabel = getLightLabel(light.lightType, index, t);
    entityNodeMap.set(light.id, {
      id: light.id,
      type: "light",
      locked: light.locked,
      visible: true,
      effectivelyVisible: project.isEntityEffectivelyVisible(light.id),
      label: light.label || fallbackLabel,
      fallbackLabel
    });
    entityIdsInOrder.push(light.id);
  });

  return { entityNodeMap, entityIdsInOrder, childIds };
}

function buildSceneRootChildren(
  project: EditorProjectModel,
  t: ReturnType<typeof useI18n>["t"]
) {
  const { entityNodeMap, entityIdsInOrder, childIds } = buildEntityNodeMap(project, t);
  const visited = new Set<string>();

  const buildEntityNode = (entityId: string, ancestry: Set<string>): SceneTreeNode | null => {
    const baseNode = entityNodeMap.get(entityId);
    if (!baseNode) return null;

    if (ancestry.has(entityId)) {
      return {
        ...baseNode,
        children: []
      };
    }

    visited.add(entityId);
    const nextAncestry = new Set(ancestry);
    nextAncestry.add(entityId);

    const record = project.getEntityById(entityId);
    const children =
      record?.kind === "group"
        ? record.item.children
            .map((childId) => buildEntityNode(childId, nextAncestry))
            .filter((childNode): childNode is SceneTreeNode => Boolean(childNode))
        : [];

    return {
      ...baseNode,
      children
    };
  };

  const rootNodes = entityIdsInOrder
    .filter((entityId) => !childIds.has(entityId))
    .map((entityId) => buildEntityNode(entityId, new Set()))
    .filter((node): node is SceneTreeNode => Boolean(node));

  const orphanNodes = entityIdsInOrder
    .filter((entityId) => !visited.has(entityId))
    .map((entityId) => buildEntityNode(entityId, new Set()))
    .filter((node): node is SceneTreeNode => Boolean(node));

  return [...rootNodes, ...orphanNodes];
}

export function getNodeIcon(nodeType: SceneTreeNodeType) {
  if (nodeType === "scene") return <PublicRoundedIcon sx={{ fontSize: 16 }} />;
  if (nodeType === "group") return <AccountTreeRoundedIcon sx={{ fontSize: 16 }} />;
  if (nodeType === "model") return <FolderRoundedIcon sx={{ fontSize: 16 }} />;
  if (nodeType === "mesh") return <GridViewRoundedIcon sx={{ fontSize: 16 }} />;
  return <LightModeRoundedIcon sx={{ fontSize: 16 }} />;
}

export function buildSceneTreeNodes(
  project: EditorProjectModel | null | undefined,
  t: ReturnType<typeof useI18n>["t"],
  sceneNodeId: string
) {
  return [createSceneNode(sceneNodeId, t, project ? buildSceneRootChildren(project, t) : [])];
}

export function buildSceneTreeSections(
  project: EditorProjectModel | null | undefined,
  t: ReturnType<typeof useI18n>["t"],
  sceneNodeId: string
): SceneTreeSection[] {
  return [
    {
      id: "scene",
      label: t("editor.sceneTree.sceneGroup"),
      icon: PublicRoundedIcon,
      nodes: buildSceneTreeNodes(project, t, sceneNodeId)
    }
  ];
}
