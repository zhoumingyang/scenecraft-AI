"use client";

import type { EditorApp, EditorViewHelperVisibility } from "@/render/editor";

const VIEW_HELPER_STORAGE_PREFIX = "editor:view-helper-visibility";
const DEFAULT_VIEW_HELPER_STORAGE_KEY = "default";

export const DEFAULT_VIEW_HELPER_VISIBILITY: EditorViewHelperVisibility = {
  gridHelper: true,
  transformGizmo: true,
  lightHelper: true,
  shadow: false
};

function getViewHelperStorageKey(projectId: string | null) {
  return `${VIEW_HELPER_STORAGE_PREFIX}:${projectId ?? DEFAULT_VIEW_HELPER_STORAGE_KEY}`;
}

function isValidViewHelperVisibility(value: unknown): value is EditorViewHelperVisibility {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.gridHelper === "boolean" &&
    typeof candidate.transformGizmo === "boolean" &&
    typeof candidate.lightHelper === "boolean" &&
    typeof candidate.shadow === "boolean"
  );
}

export function loadViewHelperVisibility(projectId: string | null): EditorViewHelperVisibility {
  if (typeof window === "undefined") {
    return DEFAULT_VIEW_HELPER_VISIBILITY;
  }

  const rawValue = window.localStorage.getItem(getViewHelperStorageKey(projectId));
  if (!rawValue) {
    return DEFAULT_VIEW_HELPER_VISIBILITY;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return isValidViewHelperVisibility(parsed) ? parsed : DEFAULT_VIEW_HELPER_VISIBILITY;
  } catch {
    return DEFAULT_VIEW_HELPER_VISIBILITY;
  }
}

export function hasStoredViewHelperVisibility(projectId: string | null) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(getViewHelperStorageKey(projectId)) !== null;
}

export function persistViewHelperVisibility(
  projectId: string | null,
  visibility: EditorViewHelperVisibility
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getViewHelperStorageKey(projectId), JSON.stringify(visibility));
}

export function restoreViewHelperVisibility(app: EditorApp, projectId: string | null) {
  const visibility = loadViewHelperVisibility(projectId);

  app.setViewHelperVisibility("gridHelper", visibility.gridHelper);
  app.setViewHelperVisibility("transformGizmo", visibility.transformGizmo);
  app.setViewHelperVisibility("lightHelper", visibility.lightHelper);
  app.setViewHelperVisibility("shadow", visibility.shadow);
}
