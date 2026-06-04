import { PICK_POINTER_MOVE_THRESHOLD_PX } from "../constants/input";
import type { EditorRuntime } from "../runtime/editorRuntime";

type PendingPick = {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

export class EditorAppPointerPicking {
  private readonly runtime: EditorRuntime;
  private readonly pickEntity: (clientX: number, clientY: number) => string | null;
  private readonly setSelectedEntity: (entityId: string | null) => void;
  private pendingPick: PendingPick | null = null;

  constructor({
    runtime,
    pickEntity,
    setSelectedEntity
  }: {
    runtime: EditorRuntime;
    pickEntity: (clientX: number, clientY: number) => string | null;
    setSelectedEntity: (entityId: string | null) => void;
  }) {
    this.runtime = runtime;
    this.pickEntity = pickEntity;
    this.setSelectedEntity = setSelectedEntity;
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
  }

  onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    this.pendingPick = null;
    if (this.runtime.beginTransformInteraction(event.clientX, event.clientY)) return;
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
    if (!this.pendingPick || this.pendingPick.pointerId !== event.pointerId) return;
    const shouldPick = !this.pendingPick.moved;
    this.pendingPick = null;
    if (!shouldPick) return;

    this.setSelectedEntity(this.pickEntity(event.clientX, event.clientY));
  };

  private onPointerCancel = (event: PointerEvent) => {
    if (!this.pendingPick || this.pendingPick.pointerId !== event.pointerId) return;
    this.pendingPick = null;
  };
}
