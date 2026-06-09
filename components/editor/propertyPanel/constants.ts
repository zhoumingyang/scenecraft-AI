"use client";

import type { PendingAiAsset } from "@/stores/editorStore";
import type { ProjectAiLibraryV2JSON, StudioTransientEntityRole } from "@/render/editor";

export const PANEL_WIDTH = 272;
export const COLLAPSED_VISIBLE_WIDTH = 44;
export const CLOSED_AI_LIBRARY: ProjectAiLibraryV2JSON = { version: 2, assets: [] };
export const CLOSED_PENDING_AI_ASSETS: PendingAiAsset[] = [];

export const STUDIO_RESETTABLE_ENTITY_ROLES = new Set<StudioTransientEntityRole>([
  "background",
  "cove",
  "floor",
  "backWall",
  "sideWall",
  "plinth",
  "decoration",
  "light",
  "studioLight",
  "keyLight",
  "keyShadowLight",
  "fillLight",
  "rimLight",
  "topLight",
  "accentLight",
  "roomFillLight",
  "wallWashLight",
  "ceilingWashLight",
  "lightModifier",
  "reflector",
  "negativeFill",
  "stripPanel"
]);
