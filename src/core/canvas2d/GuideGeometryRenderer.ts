import type {
  GuideGeometry,
  ControlPointHandle,
  GuideLine,
} from "../painting/strategies/GuideGeometry";
import type { ViewState } from "./ViewState";
import type { Dimensions } from "../../types";
import type { CanvasColors } from "../../config/colorSchemes";

/**
 * GuideGeometryRenderer - Draws the arch and curve tools' control handles and guide lines
 *
 * Guide geometry arrives in model space and converts to pixels through ViewState here,
 * unlike blocks, because a guide changes on every pointer move.
 */
export class GuideGeometryRenderer {
  private static readonly HANDLE_RADIUS = 5;
  private static readonly LABEL_FONT = "bold 10px sans-serif";

  static draw(
    ctx: CanvasRenderingContext2D,
    geometry: GuideGeometry,
    viewState: ViewState,
    dimensions: Dimensions,
    cellSize: number,
    pan: { x: number; y: number },
    colors: CanvasColors,
  ): void {
    ctx.save();

    // Lines first, so handles draw over them
    for (const line of geometry.lines) {
      this.drawLine(ctx, line, viewState, dimensions, cellSize, pan, colors);
    }

    for (const handle of geometry.handles) {
      this.drawHandle(ctx, handle, viewState, dimensions, cellSize, pan, colors);
    }

    ctx.restore();
  }

  private static toPixelCenter(
    position: { x: number; y: number; z: number },
    viewState: ViewState,
    dimensions: Dimensions,
    cellSize: number,
    pan: { x: number; y: number },
  ): { px: number; py: number } {
    const grid = viewState.modelToGrid(position, dimensions);
    return {
      px: pan.x + grid.gridX * cellSize + cellSize / 2,
      py: pan.y + grid.gridY * cellSize + cellSize / 2,
    };
  }

  private static drawLine(
    ctx: CanvasRenderingContext2D,
    line: GuideLine,
    viewState: ViewState,
    dimensions: Dimensions,
    cellSize: number,
    pan: { x: number; y: number },
    colors: CanvasColors,
  ): void {
    const from = this.toPixelCenter(
      line.from,
      viewState,
      dimensions,
      cellSize,
      pan,
    );
    const to = this.toPixelCenter(line.to, viewState, dimensions, cellSize, pan);

    ctx.beginPath();
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;

    switch (line.style) {
      case "baseline":
        ctx.strokeStyle = colors.guidePlaced;
        ctx.setLineDash([]);
        break;
      case "control":
        ctx.strokeStyle = colors.guideControl;
        ctx.setLineDash([6, 4]);
        break;
      case "tangent":
        ctx.strokeStyle = colors.guideCursor;
        ctx.setLineDash([2, 3]);
        ctx.globalAlpha = 0.5;
        break;
    }

    ctx.moveTo(from.px, from.py);
    ctx.lineTo(to.px, to.py);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private static drawHandle(
    ctx: CanvasRenderingContext2D,
    handle: ControlPointHandle,
    viewState: ViewState,
    dimensions: Dimensions,
    cellSize: number,
    pan: { x: number; y: number },
    colors: CanvasColors,
  ): void {
    const { px, py } = this.toPixelCenter(
      handle.position,
      viewState,
      dimensions,
      cellSize,
      pan,
    );
    const r = this.HANDLE_RADIUS;

    ctx.globalAlpha = 0.9;

    if (handle.style === "placed") {
      ctx.fillStyle = colors.guidePlaced;
      ctx.strokeStyle = colors.guideOutline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, py - r);
      ctx.lineTo(px + r, py);
      ctx.lineTo(px, py + r);
      ctx.lineTo(px - r, py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.strokeStyle = colors.guideCursor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = colors.guideLabel;
    ctx.strokeStyle = colors.guideOutline;
    ctx.lineWidth = 2;
    ctx.font = this.LABEL_FONT;
    ctx.textAlign = "center";
    const labelY = py - r - 6;
    ctx.strokeText(handle.label, px, labelY);
    ctx.fillText(handle.label, px, labelY);
  }
}
