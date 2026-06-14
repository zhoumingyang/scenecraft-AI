export type EditorShortcutAction =
  | "delete-selection"
  | "copy-selection"
  | "paste-selection"
  | "duplicate-selection"
  | "clear-selection"
  | "toggle-visibility"
  | "lock-selection"
  | "save-project";

export type EditorDuplicatePositionOffset = [number, number, number];

export const EDITOR_SAVE_SHORTCUT_EVENT = "scenecraft:editor-save-shortcut";
export const EDITOR_DUPLICATE_POSITION_OFFSET: EditorDuplicatePositionOffset = [0.4, 0, 0.4];

type ShortcutKeyboardEvent = Pick<
  KeyboardEvent,
  "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey"
> & {
  repeat?: boolean;
};

const EDITABLE_TAG_NAMES = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON"]);
const INTERACTIVE_ANCESTOR_SELECTORS = [
  "[role='dialog']",
  "[role='menu']",
  "[role='listbox']",
  "[role='combobox']",
  "[data-editor-shortcuts-ignore='true']"
];

function hasCommandModifier(event: ShortcutKeyboardEvent) {
  return event.metaKey || event.ctrlKey;
}

function hasOnlyCommandModifier(event: ShortcutKeyboardEvent) {
  return hasCommandModifier(event) && !event.shiftKey && !event.altKey;
}

function hasNoModifier(event: ShortcutKeyboardEvent) {
  return !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function getEditorShortcutAction(
  event: ShortcutKeyboardEvent
): EditorShortcutAction | null {
  if (event.repeat) return null;

  const key = event.key.toLowerCase();

  if (hasNoModifier(event)) {
    if (event.key === "Delete" || event.key === "Backspace") return "delete-selection";
    if (event.key === "Escape") return "clear-selection";
    return null;
  }

  if (hasOnlyCommandModifier(event)) {
    if (key === "c") return "copy-selection";
    if (key === "v") return "paste-selection";
    if (key === "d") return "duplicate-selection";
    if (key === "s") return "save-project";
    return null;
  }

  if (event.ctrlKey && event.shiftKey && !event.metaKey && !event.altKey) {
    if (key === "h") return "toggle-visibility";
    if (key === "l") return "lock-selection";
  }

  return null;
}

export function getEditorDuplicatePositionOffset(
  action: EditorShortcutAction
): EditorDuplicatePositionOffset | null {
  if (action !== "duplicate-selection" && action !== "paste-selection") return null;
  return [...EDITOR_DUPLICATE_POSITION_OFFSET];
}

export function shouldIgnoreEditorShortcutTarget(target: EventTarget | null) {
  if (!target || typeof target !== "object") return false;

  const element = target as HTMLElement;
  const tagName = typeof element.tagName === "string" ? element.tagName.toUpperCase() : "";

  if (EDITABLE_TAG_NAMES.has(tagName) || element.isContentEditable) {
    return true;
  }

  if (typeof element.closest !== "function") {
    return false;
  }

  return INTERACTIVE_ANCESTOR_SELECTORS.some((selector) => Boolean(element.closest(selector)));
}
