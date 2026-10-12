import type { Vector3D } from "../../types";
import type { ViewState } from "../canvas2d/ViewState";
import type { GuideGeometry } from "../painting/strategies/GuideGeometry";
import { throttled } from "../../utils/throttle";
import { wheelZoomFactor } from "../../utils/wheelZoom";
import { isModalOpen } from "../../utils/keyboardFocus";

/**
 * Modifier key state
 */
export interface ModifierKeys {
  space: boolean;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
}

/**
 * Position resolved from a pointer event — carries all coordinate forms
 * so concrete tools never need to do coordinate conversion.
 */
export interface UniversalPosition {
  /** Canvas-local pixel X (from e.offsetX) */
  pixelX: number;
  /** Canvas-local pixel Y (from e.offsetY) */
  pixelY: number;
  /** Grid column in the 2D view */
  gridX: number;
  /** Grid row in the 2D view */
  gridY: number;
  /** 3D model X coordinate */
  modelX: number;
  /** 3D model Y coordinate */
  modelY: number;
  /** 3D model Z coordinate */
  modelZ: number;
}

/**
 * Preview data produced by a tool — read by the renderer each tick.
 */
export interface PreviewData {
  blocks: { position: UniversalPosition }[];
  guide?: GuideGeometry;
}

/**
 * ToolBase - Abstract base for all canvas tools
 *
 * Handles:
 * - Pan (space+drag / middle mouse) and zoom (wheel) as global concerns
 * - DOM listener add/remove abstractions for behavioral subclasses
 * - Modifier key tracking
 * - Coordinate resolution (offsetX/Y → grid → model, zero getBoundingClientRect)
 * - Preview data property for the renderer
 */
export abstract class ToolBase {
  protected modifiers: ModifierKeys = {
    space: false,
    shift: false,
    alt: false,
    ctrl: false,
    meta: false,
  };

  public previewData: PreviewData = { blocks: [] };

  // Pan state
  private panning = false;
  private lastPanX = 0;
  private lastPanY = 0;

  // Cursor state: toolCursor is what the tool wants, canvas.style.cursor is what's shown
  private toolCursor: string = "crosshair";

  constructor(
    protected canvas: HTMLCanvasElement,
    protected viewState: ViewState,
    protected requestRender: () => void,
  ) {}

  // ============================================================================
  // Lifecycle — subclasses call listen*/unlisten* in these
  // ============================================================================

  activate(): void {
    this.canvas.addEventListener("wheel", this._onWheel, { passive: false });
    this.canvas.addEventListener("pointerenter", this._onPointerEnter);
    this.canvas.addEventListener("pointerleave", this._onPointerLeave);
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    this.onActivate();
  }

  deactivate(): void {
    this.onDeactivate();
    this.canvas.removeEventListener("wheel", this._onWheel);
    this.canvas.removeEventListener("pointerenter", this._onPointerEnter);
    this.canvas.removeEventListener("pointerleave", this._onPointerLeave);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    this.unlistenPointerDown();
    this.unlistenPointerMove();
    this.unlistenPointerUp();
    this.previewData = { blocks: [] };
  }

  cancel(): void {
    if (this.panning) {
      this.panning = false;
    }
    this.onCancel();
  }

  // ============================================================================
  // DOM listener abstractions
  // ============================================================================

  private pointerDownBound = false;
  private pointerMoveBound = false;
  private pointerUpBound = false;

  protected listenPointerDown(): void {
    if (this.pointerDownBound) return;
    this.pointerDownBound = true;
    this.canvas.addEventListener("pointerdown", this._onPointerDown);
  }

  protected unlistenPointerDown(): void {
    if (!this.pointerDownBound) return;
    this.pointerDownBound = false;
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
  }

  protected listenPointerMove(): void {
    if (this.pointerMoveBound) return;
    this.pointerMoveBound = true;
    this.canvas.addEventListener("pointermove", this._onPointerMoveThrottled);
  }

  protected unlistenPointerMove(): void {
    if (!this.pointerMoveBound) return;
    this.pointerMoveBound = false;
    this.canvas.removeEventListener(
      "pointermove",
      this._onPointerMoveThrottled,
    );
  }

  protected listenPointerUp(): void {
    if (this.pointerUpBound) return;
    this.pointerUpBound = true;
    this.canvas.addEventListener("pointerup", this._onPointerUp);
  }

  protected unlistenPointerUp(): void {
    if (!this.pointerUpBound) return;
    this.pointerUpBound = false;
    this.canvas.removeEventListener("pointerup", this._onPointerUp);
  }

  // ============================================================================
  // Cursor
  // ============================================================================

  protected setCursor(style: string): void {
    this.toolCursor = style;
    this.canvas.style.cursor = style;
  }

  /** Override the displayed cursor without changing the tool's desired cursor */
  private setOverrideCursor(style: string): void {
    this.canvas.style.cursor = style;
  }

  /** Restore the displayed cursor to whatever the tool set */
  private restoreCursor(): void {
    this.canvas.style.cursor = this.toolCursor;
  }

  // ============================================================================
  // Internal handlers — pan/zoom interception, then delegation
  // ============================================================================

  private _onPointerDown = (e: PointerEvent): void => {
    // Pan: space+left or middle button
    if ((e.button === 0 && this.modifiers.space) || e.button === 1) {
      this.panning = true;
      this.lastPanX = e.offsetX;
      this.lastPanY = e.offsetY;
      this.canvas.setPointerCapture(e.pointerId);
      this.setOverrideCursor("grabbing");
      return;
    }

    const pos = this.resolvePosition(e);
    if (!pos) return;
    this.onDown(e, pos);
  };

  private _onPointerMoveRaw = (e: PointerEvent): void => {
    if (this.panning) {
      const dx = e.offsetX - this.lastPanX;
      const dy = e.offsetY - this.lastPanY;
      this.lastPanX = e.offsetX;
      this.lastPanY = e.offsetY;
      this.viewState.applyPan(dx, dy);
      this.requestRender();
      return;
    }

    const pos = this.resolvePosition(e);
    if (!pos) return;
    this.onMove(e, pos);
  };

  private _onPointerMoveThrottled = throttled(this._onPointerMoveRaw, 10);

  private _onPointerUp = (e: PointerEvent): void => {
    // A move held by the throttle would otherwise run after the release and miss the drag
    this._onPointerMoveThrottled.flush();

    if (this.panning) {
      this.panning = false;
      this.canvas.releasePointerCapture(e.pointerId);
      if (this.modifiers.space) {
        this.setOverrideCursor("grab");
      } else {
        this.restoreCursor();
      }
      return;
    }

    const pos = this.resolvePosition(e);
    if (!pos) return;
    this.onUp(e, pos);
  };

  private _onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const changed = this.viewState.applyZoom(
      wheelZoomFactor(e),
      e.offsetX,
      e.offsetY,
    );
    if (changed) this.requestRender();
  };

  private _onPointerEnter = (e: PointerEvent): void => {
    const pos = this.resolvePosition(e);
    if (!pos) return;
    this.onEnter(e, pos);
  };

  private _onPointerLeave = (_e: PointerEvent): void => {
    if (this.panning) {
      this.panning = false;
      this.restoreCursor();
    }
    this.onLeave();
  };

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    // Space and Alt call preventDefault below, which would stop typing and button presses in a dialog
    if (isModalOpen()) return;

    if (e.code === "Escape") {
      e.preventDefault();
      this.cancel();
      return;
    }

    let changed = false;

    if (e.code === "Space") {
      e.preventDefault();
      this.modifiers.space = true;
      this.setOverrideCursor("grab");
      changed = true;
    }
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      this.modifiers.shift = true;
      changed = true;
    }
    if (e.code === "AltLeft" || e.code === "AltRight") {
      e.preventDefault();
      this.modifiers.alt = true;
      changed = true;
    }
    if (e.code === "ControlLeft" || e.code === "ControlRight") {
      this.modifiers.ctrl = true;
      changed = true;
    }
    if (e.code === "MetaLeft" || e.code === "MetaRight") {
      this.modifiers.meta = true;
      changed = true;
    }

    if (changed) this.onModifiersChanged(this.modifiers);
  };

  private _onKeyUp = (e: KeyboardEvent): void => {
    let changed = false;

    if (e.code === "Space") {
      e.preventDefault();
      this.modifiers.space = false;
      this.panning = false;
      this.restoreCursor();
      changed = true;
    }
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      this.modifiers.shift = false;
      changed = true;
    }
    if (e.code === "AltLeft" || e.code === "AltRight") {
      e.preventDefault();
      this.modifiers.alt = false;
      changed = true;
    }
    if (e.code === "ControlLeft" || e.code === "ControlRight") {
      this.modifiers.ctrl = false;
      changed = true;
    }
    if (e.code === "MetaLeft" || e.code === "MetaRight") {
      this.modifiers.meta = false;
      changed = true;
    }

    if (changed) this.onModifiersChanged(this.modifiers);
  };

  // ============================================================================
  // Coordinate resolution — zero getBoundingClientRect()
  // ============================================================================

  protected resolvePosition(e: PointerEvent | WheelEvent): UniversalPosition | null {
    const grid = this.viewState.pixelToGrid(e.offsetX, e.offsetY);
    if (!grid) return null;

    const model = this.viewState.gridToModel(grid.gridX, grid.gridY);
    return {
      pixelX: e.offsetX,
      pixelY: e.offsetY,
      gridX: grid.gridX,
      gridY: grid.gridY,
      modelX: model.x,
      modelY: model.y,
      modelZ: model.z,
    };
  }

  /**
   * Extract a Vector3D from a UniversalPosition (convenience)
   */
  protected toModel(pos: UniversalPosition): Vector3D {
    return { x: pos.modelX, y: pos.modelY, z: pos.modelZ };
  }

  // ============================================================================
  // Subclass hooks (no-ops)
  // ============================================================================

  protected onActivate(): void {}
  protected onDeactivate(): void {}
  protected onCancel(): void {}

  protected onDown(_e: PointerEvent, _pos: UniversalPosition): void {}
  protected onMove(_e: PointerEvent, _pos: UniversalPosition): void {}
  protected onUp(_e: PointerEvent, _pos: UniversalPosition): void {}
  protected onEnter(_e: PointerEvent, _pos: UniversalPosition): void {}
  protected onLeave(): void {}
  protected onModifiersChanged(_modifiers: ModifierKeys): void {}
}
