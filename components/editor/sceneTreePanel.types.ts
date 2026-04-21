import type { ElementType } from "react";

export type SceneTreeNodeType = "scene" | "group" | "model" | "mesh" | "light";

export type SceneTreeNode = {
  id: string;
  label: string;
  fallbackLabel: string;
  type: SceneTreeNodeType;
  locked: boolean;
  visible: boolean;
  effectivelyVisible: boolean;
  children: SceneTreeNode[];
};

export type SceneTreeSectionId = SceneTreeNodeType;

export type SceneTreeSection = {
  id: SceneTreeSectionId;
  label: string;
  icon: ElementType;
  nodes: SceneTreeNode[];
};
