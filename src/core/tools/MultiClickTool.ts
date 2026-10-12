import { ToolBase } from "./ToolBase";
import type { UniversalPosition } from "./ToolBase";

/**
 * MultiClickTool - Base for tools that collect maxPoints clicks, then call onComplete
 *
 * onHoverWithPoints runs on every move, even before the first click, so the preview treats the cursor as the next point.
 */
export abstract class MultiClickTool extends ToolBase {
  protected points: UniversalPosition[] = [];
  protected abstract readonly maxPoints: number;
  private clicking = false;

  protected onActivate(): void {
    this.points = [];
    this.listenPointerDown();
    this.listenPointerMove();
  }

  protected onDeactivate(): void {
    if (this.points.length > 0) {
      this.onMultiClickCancel();
      this.points = [];
    }
    this.clicking = false;
    this.unlistenPointerDown();
    this.unlistenPointerMove();
    this.unlistenPointerUp();
  }

  protected onCancel(): void {
    if (this.points.length > 0) {
      this.onMultiClickCancel();
      this.points = [];
    }
    this.clicking = false;
    this.unlistenPointerUp();
    this.listenPointerDown();
  }

  protected onDown(e: PointerEvent, _pos: UniversalPosition): void {
    if (e.button !== 0) return;
    this.clicking = true;
    this.unlistenPointerDown();
    this.listenPointerUp();
  }

  protected onUp(_e: PointerEvent, pos: UniversalPosition): void {
    if (!this.clicking) return;
    this.clicking = false;
    this.unlistenPointerUp();
    this.listenPointerDown();

    this.points.push(pos);
    this.onPointPlaced(pos, this.points.length);

    if (this.points.length >= this.maxPoints) {
      this.onComplete([...this.points]);
      this.points = [];
    }
  }

  protected onMove(_e: PointerEvent, pos: UniversalPosition): void {
    this.onHoverWithPoints(pos, this.points);
  }

  protected onHoverWithPoints(
    _cursor: UniversalPosition,
    _placed: UniversalPosition[],
  ): void {}
  protected onPointPlaced(
    _pos: UniversalPosition,
    _count: number,
  ): void {}
  protected onComplete(_points: UniversalPosition[]): void {}
  protected onMultiClickCancel(): void {}
}
