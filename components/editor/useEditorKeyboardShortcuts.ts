"use client";

import { useEffect, useRef } from "react";
import type { EditorApp } from "@/render/editor";
import {
  getEditorDuplicatePositionOffset,
  getEditorShortcutAction,
  shouldIgnoreEditorShortcutTarget
} from "@/components/editor/keyboardShortcuts";

type UseEditorKeyboardShortcutsOptions = {
  app: EditorApp | null;
  onSaveProject: (() => void) | null;
  saveDisabled?: boolean;
  selectedEntityId: string | null;
};

function getSelectedEntityRecord(app: EditorApp, entityId: string | null) {
  if (!entityId) return null;
  return app.projectModel?.getEntityById(entityId) ?? null;
}

export function useEditorKeyboardShortcuts({
  app,
  onSaveProject,
  saveDisabled = false,
  selectedEntityId
}: UseEditorKeyboardShortcutsOptions) {
  const copiedEntityIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!app || shouldIgnoreEditorShortcutTarget(event.target)) return;

      const action = getEditorShortcutAction(event);
      if (!action) return;

      const activeSelectedEntityId = app.getSelectedEntityId() ?? selectedEntityId;

      switch (action) {
        case "delete-selection":
          if (!activeSelectedEntityId) return;
          event.preventDefault();
          app.removeEntity(activeSelectedEntityId);
          return;
        case "copy-selection":
          if (!activeSelectedEntityId) return;
          event.preventDefault();
          copiedEntityIdRef.current = activeSelectedEntityId;
          return;
        case "paste-selection":
          if (!copiedEntityIdRef.current) return;
          event.preventDefault();
          app.duplicateEntity(copiedEntityIdRef.current, "ui", {
            positionOffset: getEditorDuplicatePositionOffset(action) ?? undefined
          });
          return;
        case "duplicate-selection":
          if (!activeSelectedEntityId) return;
          event.preventDefault();
          app.duplicateEntity(activeSelectedEntityId, "ui", {
            positionOffset: getEditorDuplicatePositionOffset(action) ?? undefined
          });
          return;
        case "clear-selection":
          if (!activeSelectedEntityId) return;
          event.preventDefault();
          app.setSelectedEntity(null);
          return;
        case "toggle-visibility": {
          const record = getSelectedEntityRecord(app, activeSelectedEntityId);
          if (!activeSelectedEntityId || !record || !("visible" in record.item)) return;
          event.preventDefault();
          app.setEntityVisible(activeSelectedEntityId, !record.item.visible);
          return;
        }
        case "lock-selection": {
          const record = getSelectedEntityRecord(app, activeSelectedEntityId);
          if (!activeSelectedEntityId || !record || record.item.locked) return;
          event.preventDefault();
          app.setEntityLocked(activeSelectedEntityId, true);
          return;
        }
        case "save-project":
          if (!onSaveProject) return;
          event.preventDefault();
          if (saveDisabled) return;
          onSaveProject();
          return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [app, onSaveProject, saveDisabled, selectedEntityId]);
}
