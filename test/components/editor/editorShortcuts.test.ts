import { strict as assert } from "node:assert";
import test from "node:test";

import {
  getEditorDuplicatePositionOffset,
  getEditorShortcutAction,
  shouldIgnoreEditorShortcutTarget
} from "../../../components/editor/keyboardShortcuts";

function eventFor(input: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}) {
  return {
    key: input.key,
    metaKey: input.metaKey ?? false,
    ctrlKey: input.ctrlKey ?? false,
    shiftKey: input.shiftKey ?? false,
    altKey: input.altKey ?? false
  };
}

test("editor shortcut actions map only the supported first-pass shortcuts", () => {
  assert.equal(getEditorShortcutAction(eventFor({ key: "Delete" })), "delete-selection");
  assert.equal(getEditorShortcutAction(eventFor({ key: "Backspace" })), "delete-selection");
  assert.equal(getEditorShortcutAction(eventFor({ key: "Escape" })), "clear-selection");
  assert.equal(getEditorShortcutAction(eventFor({ key: "c", metaKey: true })), "copy-selection");
  assert.equal(getEditorShortcutAction(eventFor({ key: "v", ctrlKey: true })), "paste-selection");
  assert.equal(getEditorShortcutAction(eventFor({ key: "d", metaKey: true })), "duplicate-selection");
  assert.equal(getEditorShortcutAction(eventFor({ key: "s", ctrlKey: true })), "save-project");
  assert.equal(
    getEditorShortcutAction(eventFor({ key: "h", ctrlKey: true, shiftKey: true })),
    "toggle-visibility"
  );
  assert.equal(
    getEditorShortcutAction(eventFor({ key: "l", ctrlKey: true, shiftKey: true })),
    "lock-selection"
  );
});

test("editor shortcut actions avoid browser history and address bar shortcuts", () => {
  assert.equal(getEditorShortcutAction(eventFor({ key: "h" })), null);
  assert.equal(getEditorShortcutAction(eventFor({ key: "l" })), null);
  assert.equal(getEditorShortcutAction(eventFor({ key: "h", ctrlKey: true })), null);
  assert.equal(getEditorShortcutAction(eventFor({ key: "l", ctrlKey: true })), null);
});

test("duplicate and paste shortcuts use the same position offset", () => {
  assert.deepEqual(getEditorDuplicatePositionOffset("duplicate-selection"), [0.4, 0, 0.4]);
  assert.deepEqual(getEditorDuplicatePositionOffset("paste-selection"), [0.4, 0, 0.4]);
  assert.equal(getEditorDuplicatePositionOffset("copy-selection"), null);
});

test("editor shortcuts are ignored in editable targets and dialogs", () => {
  const input = { tagName: "INPUT", isContentEditable: false } as HTMLElement;
  const textarea = { tagName: "TEXTAREA", isContentEditable: false } as HTMLElement;
  const editable = { tagName: "DIV", isContentEditable: true } as HTMLElement;
  const menuItem = {
    tagName: "DIV",
    isContentEditable: false,
    closest: (selector: string) => (selector === "[role='menu']" ? {} : null)
  } as unknown as HTMLElement;
  const canvasArea = {
    tagName: "DIV",
    isContentEditable: false,
    closest: () => null
  } as unknown as HTMLElement;

  assert.equal(shouldIgnoreEditorShortcutTarget(input), true);
  assert.equal(shouldIgnoreEditorShortcutTarget(textarea), true);
  assert.equal(shouldIgnoreEditorShortcutTarget(editable), true);
  assert.equal(shouldIgnoreEditorShortcutTarget(menuItem), true);
  assert.equal(shouldIgnoreEditorShortcutTarget(canvasArea), false);
});
