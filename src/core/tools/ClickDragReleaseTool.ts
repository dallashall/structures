import { ToolBase } from "./ToolBase";
import type { UniversalPosition } from "./ToolBase";
/**
 * ClickDragReleaseTool - Behavioral base for click-drag-release interactions
 *
 * State machine: idle → hovering → dragging → hovering
 *
 * Subclasses implement:
 * - onHover(pos)       — cursor is moving over the canvas (no button held)
 * - onDragStart(pos)   — left button pressed
 * - onDrag(start, cur) — pointer moving with button held
 * - onDragEnd(start, end) — left button released
 * - onDragCancel()     — operation cancelled (Escape or deactivate)
 */
export abstract class ClickDragReleaseTool extends ToolBase {
  private state: "idle" | "hovering" | "dragging" = "idle";
  protected downPosition?: UniversalPosition;
  private dragPosition?: UniversalPosition;

  protected onActivate(): void {
    this.state = "hovering";
    this.listenPointerDown();
    this.listenPointerMove();
  }

  protected onDeactivate(): void {
    if (this.state === "dragging") {
      this.onDragCancel();
    }
    this.state = "idle";
    this.unlistenPointerDown();
    this.unlistenPointerMove();
    this.unlistenPointerUp();
  }

  protected onCancel(): void {
    if (this.state === "dragging") {
      this.onDragCancel();
      this.state = "hovering";
      this.unlistenPointerUp();
      this.listenPointerDown();
    }
  }

  protected onDown(e: PointerEvent, pos: UniversalPosition): void {
    if (e.button !== 0) return;
    this.state = "dragging";
    this.downPosition = pos;
    this.dragPosition = pos;
    this.unlistenPointerDown();
    this.listenPointerUp();
    this.onDragStart(pos);
  }

  protected onMove(_e: PointerEvent, pos: UniversalPosition): void {
    if (this.state === "hovering") {
      this.onHover(pos);
    } else if (this.state === "dragging" && this.downPosition) {
      this.dragPosition = pos;
      this.onDrag(this.downPosition, pos);
    }
  }

  // A held modifier reshapes the drag in place, without waiting for the pointer to move
  protected onModifiersChanged(): void {
    if (this.state === "dragging" && this.downPosition && this.dragPosition) {
      this.onDrag(this.downPosition, this.dragPosition);
    }
  }

  protected onUp(_e: PointerEvent, pos: UniversalPosition): void {
    if (this.state !== "dragging" || !this.downPosition) return;
    this.state = "hovering";
    this.unlistenPointerUp();
    this.listenPointerDown();
    this.onDragEnd(this.downPosition, pos);
  }

  // Subclass hooks
  protected onHover(_pos: UniversalPosition): void {}
  protected onDragStart(_pos: UniversalPosition): void {}
  protected onDrag(
    _start: UniversalPosition,
    _current: UniversalPosition,
  ): void {}
  protected onDragEnd(
    _start: UniversalPosition,
    _end: UniversalPosition,
  ): void {}
  protected onDragCancel(): void {}
}
