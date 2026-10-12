import type { Vector3D } from "../../types";
import type { ViewState } from "../canvas2d/ViewState";
import type { GuideGeometry } from "../painting/strategies/GuideGeometry";
import { throttled } from "../../utils/throttle";
import { wheelZoomFactor } from "../../utils/wheelZoom";
import { isModalOpen } from "../../utils/keyboardFocus";
import { editorState } from "../EditorState";

interface ModifierKeys {
  space: boolean;
  shift: boolean;
  alt: boolean;
}

const isShiftCode = (code: string): boolean => code === "ShiftLeft" || code === "ShiftRight";
const isAltCode = (code: string): boolean => code === "AltLeft" || code === "AltRight";

/**
 * A pointer position in every coordinate space, so concrete tools never convert coordinates
 */
export interface UniversalPosition {
  pixelX: number;
  pixelY: number;
  gridX: number;
  gridY: number;
  modelX: number;
  modelY: number;
  modelZ: number;
}

/**
 * View-local preview. Canvas2DRenderer reads it each frame. Previews other views must see go through DraftingService.
 */
export interface PreviewData {
  blocks: { position: UniversalPosition }[];
  guide?: GuideGeometry;
}

/**
 * ToolBase - Base for every canvas tool
 *
 * Pan (Space+drag or middle button) and wheel zoom are handled here for every tool.
 * Subclasses call the listen and unlisten helpers from onActivate and onDeactivate.
 * Positions come from offsetX/offsetY, which avoids a getBoundingClientRect layout read per event.
 */
export abstract class ToolBase {
  protected modifiers: ModifierKeys = {
    space: false,
    shift: false,
    alt: false,
  };

  public previewData: PreviewData = { blocks: [] };

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

  activate(): void {
    this.canvas.addEventListener("wheel", this._onWheel, { passive: false });
    this.canvas.addEventListener("pointerenter", this._onPointerEnter);
    this.canvas.addEventListener("pointerleave", this._onPointerLeave);
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("blur", this._onWindowBlur);
    this.onActivate();
  }

  deactivate(): void {
    this.onDeactivate();
    this.canvas.removeEventListener("wheel", this._onWheel);
    this.canvas.removeEventListener("pointerenter", this._onPointerEnter);
    this.canvas.removeEventListener("pointerleave", this._onPointerLeave);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("blur", this._onWindowBlur);
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

  /** Changes the shown cursor and keeps the tool's own cursor for restoreCursor */
  private setOverrideCursor(style: string): void {
    this.canvas.style.cursor = style;
  }

  private restoreCursor(): void {
    this.canvas.style.cursor = this.toolCursor;
  }

  private _onPointerDown = (e: PointerEvent): void => {
    this.syncDrawingModifiers(e.shiftKey, e.altKey);
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
    this.syncDrawingModifiers(e.shiftKey, e.altKey);
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
    this.syncDrawingModifiers(e.shiftKey, e.altKey);
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

    if (e.code === "Space") {
      e.preventDefault();
      this.modifiers.space = true;
      this.setOverrideCursor("grab");
    }
    // Alt alone focuses the browser menu bar on Windows
    if (isAltCode(e.code)) e.preventDefault();
    if (isShiftCode(e.code) || isAltCode(e.code)) {
      this.syncDrawingModifiers(e.shiftKey, e.altKey);
    }
  };

  private _onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === "Space") {
      e.preventDefault();
      this.modifiers.space = false;
      this.panning = false;
      this.restoreCursor();
    }
    if (isAltCode(e.code)) e.preventDefault();
    if (isShiftCode(e.code) || isAltCode(e.code)) {
      this.syncDrawingModifiers(e.shiftKey, e.altKey);
    }
  };

  // A key released while another window has focus never reaches this one
  private _onWindowBlur = (): void => {
    this.modifiers.space = false;
    this.syncDrawingModifiers(false, false);
  };

  /**
   * Pointer events carry the true modifier state, so every pointer event corrects any key event this window missed.
   */
  private syncDrawingModifiers(shift: boolean, alt: boolean): void {
    editorState.setHeldModifiers({ shift, alt });
    if (this.modifiers.shift === shift && this.modifiers.alt === alt) return;
    this.modifiers.shift = shift;
    this.modifiers.alt = alt;
    this.onModifiersChanged();
  }

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

  protected toModel(pos: UniversalPosition): Vector3D {
    return { x: pos.modelX, y: pos.modelY, z: pos.modelZ };
  }

  protected onActivate(): void {}
  protected onDeactivate(): void {}
  protected onCancel(): void {}

  protected onDown(_e: PointerEvent, _pos: UniversalPosition): void {}
  protected onMove(_e: PointerEvent, _pos: UniversalPosition): void {}
  protected onUp(_e: PointerEvent, _pos: UniversalPosition): void {}
  protected onEnter(_e: PointerEvent, _pos: UniversalPosition): void {}
  protected onLeave(): void {}
  protected onModifiersChanged(): void {}
}
