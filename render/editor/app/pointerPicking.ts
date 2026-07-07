import { PICK_POINTER_MOVE_THRESHOLD_PX } from "../constants/input";
import type { SelectionMode } from "../core/commands";
import type { EditorRuntime } from "../runtime/editorRuntime";

type PointerPickingRuntime = Pick<
  EditorRuntime,
  "beginTransformInteraction" | "isFirstPersonCamera" | "isTransformGizmoHit"
>;

type PendingPick = {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

export class EditorAppPointerPicking {
  private readonly runtime: PointerPickingRuntime;
  private readonly pickEntity: (clientX: number, clientY: number) => string | null;
  private readonly setSelectedEntity: (entityId: string | null, mode: SelectionMode) => void;
  private readonly onTransformInteractionStart: () => void;
  private readonly onTransformInteractionEnd: () => void;
  private pendingPick: PendingPick | null = null;
  private activeTransformPointerId: number | null = null;

  constructor({
    runtime,
    pickEntity,
    setSelectedEntity,
    onTransformInteractionStart,
    onTransformInteractionEnd
  }: {
    runtime: PointerPickingRuntime;
    pickEntity: (clientX: number, clientY: number) => string | null;
    setSelectedEntity: (entityId: string | null, mode: SelectionMode) => void;
    onTransformInteractionStart?: () => void;
    onTransformInteractionEnd?: () => void;
  }) {
    this.runtime = runtime;
    this.pickEntity = pickEntity;
    this.setSelectedEntity = setSelectedEntity;
    this.onTransformInteractionStart = onTransformInteractionStart ?? (() => {});
    this.onTransformInteractionEnd = onTransformInteractionEnd ?? (() => {});
  }

  addWindowListeners() {
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerCancel);
  }

  removeWindowListeners() {
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerCancel);
    this.pendingPick = null;
    this.activeTransformPointerId = null;
  }

  onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    this.pendingPick = null;
    if (this.runtime.isTransformGizmoHit(event.clientX, event.clientY)) {
      this.onTransformInteractionStart();
      if (this.runtime.beginTransformInteraction(event.clientX, event.clientY)) {
        this.activeTransformPointerId = event.pointerId;
        return;
      }
      this.onTransformInteractionEnd();
    }
    if (this.runtime.isFirstPersonCamera()) return;

    this.pendingPick = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.pendingPick || this.pendingPick.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - this.pendingPick.startX;
    const deltaY = event.clientY - this.pendingPick.startY;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    if (distanceSquared <= PICK_POINTER_MOVE_THRESHOLD_PX * PICK_POINTER_MOVE_THRESHOLD_PX) return;
    this.pendingPick.moved = true;
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.activeTransformPointerId === event.pointerId) {
      this.activeTransformPointerId = null;
      this.onTransformInteractionEnd();
      return;
    }

    if (!this.pendingPick || this.pendingPick.pointerId !== event.pointerId) return;
    const shouldPick = !this.pendingPick.moved;
    this.pendingPick = null;
    if (!shouldPick) return;

    const pickedEntityId = this.pickEntity(event.clientX, event.clientY);
    if (event.shiftKey && !pickedEntityId) return;
    this.setSelectedEntity(pickedEntityId, event.shiftKey ? "toggle" : "replace");
  };

  private onPointerCancel = (event: PointerEvent) => {
    if (this.activeTransformPointerId === event.pointerId) {
      this.activeTransformPointerId = null;
      this.onTransformInteractionEnd();
      return;
    }

    if (!this.pendingPick || this.pendingPick.pointerId !== event.pointerId) return;
    this.pendingPick = null;
  };
}
