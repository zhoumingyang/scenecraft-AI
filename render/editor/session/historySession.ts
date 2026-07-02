import type { EditorProjectJSON } from "../core/types";

export type EditorHistorySnapshot = {
  project: EditorProjectJSON;
  selectedEntityId: string | null;
};

export type EditorHistoryState = {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
};

export type EditorHistoryRestore = {
  direction: "undo" | "redo";
  label: string;
  snapshot: EditorHistorySnapshot;
};

type EditorHistoryEntry = {
  label: string;
  before: EditorHistorySnapshot;
  after: EditorHistorySnapshot;
  coalesceKey: string | null;
};

type EditorHistorySessionOptions = {
  maxEntries?: number;
  onChange?: (state: EditorHistoryState) => void;
};

type CaptureOptions = {
  coalesceKey?: string | null;
};

const DEFAULT_MAX_HISTORY_ENTRIES = 100;

export class EditorHistorySession {
  private readonly maxEntries: number;
  private readonly onChange: ((state: EditorHistoryState) => void) | null;
  private readonly undoStack: EditorHistoryEntry[] = [];
  private readonly redoStack: EditorHistoryEntry[] = [];
  private restoring = false;

  constructor(options: EditorHistorySessionOptions = {}) {
    this.maxEntries = Math.max(1, Math.floor(options.maxEntries ?? DEFAULT_MAX_HISTORY_ENTRIES));
    this.onChange = options.onChange ?? null;
  }

  getState(): EditorHistoryState {
    const undoEntry = this.undoStack[this.undoStack.length - 1] ?? null;
    const redoEntry = this.redoStack[this.redoStack.length - 1] ?? null;

    return {
      canUndo: Boolean(undoEntry),
      canRedo: Boolean(redoEntry),
      undoLabel: undoEntry?.label ?? null,
      redoLabel: redoEntry?.label ?? null
    };
  }

  capture(
    label: string,
    before: EditorHistorySnapshot | null,
    after: EditorHistorySnapshot | null,
    options: CaptureOptions = {}
  ) {
    if (this.restoring || !before || !after || snapshotsEqual(before, after)) {
      return false;
    }

    const coalesceKey = options.coalesceKey ?? null;
    const previous = this.undoStack[this.undoStack.length - 1] ?? null;
    if (coalesceKey && previous?.coalesceKey === coalesceKey) {
      previous.after = cloneSnapshot(after);
      previous.label = label;
      this.redoStack.length = 0;
      this.emitChange();
      return true;
    }

    this.undoStack.push({
      label,
      before: cloneSnapshot(before),
      after: cloneSnapshot(after),
      coalesceKey
    });
    if (this.undoStack.length > this.maxEntries) {
      this.undoStack.splice(0, this.undoStack.length - this.maxEntries);
    }
    this.redoStack.length = 0;
    this.emitChange();
    return true;
  }

  undo(): EditorHistoryRestore | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;

    this.redoStack.push(entry);
    this.emitChange();
    return {
      direction: "undo",
      label: entry.label,
      snapshot: cloneSnapshot(entry.before)
    };
  }

  redo(): EditorHistoryRestore | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;

    this.undoStack.push(entry);
    this.emitChange();
    return {
      direction: "redo",
      label: entry.label,
      snapshot: cloneSnapshot(entry.after)
    };
  }

  clear() {
    if (this.undoStack.length === 0 && this.redoStack.length === 0) return;
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.emitChange();
  }

  hasReferencedAssetUrl(url: string) {
    if (!url) return false;
    return this.getReferencedAssetUrls().has(url);
  }

  isRestoring() {
    return this.restoring;
  }

  withRestoreGuard<T>(callback: () => T): T {
    this.restoring = true;
    try {
      return callback();
    } finally {
      this.restoring = false;
    }
  }

  async withRestoreGuardAsync<T>(callback: () => Promise<T>): Promise<T> {
    this.restoring = true;
    try {
      return await callback();
    } finally {
      this.restoring = false;
    }
  }

  private emitChange() {
    this.onChange?.(this.getState());
  }

  private getReferencedAssetUrls() {
    const urls = new Set<string>();
    this.undoStack.forEach((entry) => collectEntryAssetUrls(entry, urls));
    this.redoStack.forEach((entry) => collectEntryAssetUrls(entry, urls));
    return urls;
  }
}

function cloneSnapshot(snapshot: EditorHistorySnapshot): EditorHistorySnapshot {
  return {
    project: structuredClone(snapshot.project),
    selectedEntityId: snapshot.selectedEntityId
  };
}

function snapshotsEqual(
  left: EditorHistorySnapshot,
  right: EditorHistorySnapshot
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function collectEntryAssetUrls(entry: EditorHistoryEntry, urls: Set<string>) {
  collectBlobUrls(entry.before.project, urls);
  collectBlobUrls(entry.after.project, urls);
}

function collectBlobUrls(value: unknown, urls: Set<string>) {
  if (!value) return;
  if (typeof value === "string") {
    if (value.startsWith("blob:")) {
      urls.add(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectBlobUrls(entry, urls));
    return;
  }
  if (typeof value !== "object") return;
  Object.values(value).forEach((entry) => collectBlobUrls(entry, urls));
}
