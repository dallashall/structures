import type {
  GuideGeometry,
  ControlPointHandle,
  GuideLine,
} from "../painting/strategies/GuideGeometry";
import type { ViewState } from "./ViewState";
import type { Dimensions } from "../../types";

/**
 * GuideGeometryRenderer - Renders control point handles and guide lines
 *
 * Pure rendering module with static methods. Receives guide geometry in
 * world space, converts to pixel space via ViewState, and draws onto canvas.
 *
 * Visual conventions:
 * - Placed handles: filled gold diamonds with black outline
 * - Cursor handles: hollow light-blue circles
 * - Baseline: solid gold line
 * - Control line: dashed pink line
 * - Tangent line: dotted light-blue line
 * - Labels: white text with black stroke above each handle
 */
export class GuideGeometryRenderer {
  private static readonly HANDLE_PLACED_COLOR = "#FFD700";
  private static readonly HANDLE_CURSOR_COLOR = "#87CEEB";
  private static readonly BASELINE_COLOR = "#FFD700";
  private static readonly CONTROL_LINE_COLOR = "#FF69B4";
  private static readonly TANGENT_LINE_COLOR = "#87CEEB";
  private static readonly HANDLE_RADIUS = 5;
  private static readonly LABEL_FONT = "bold 10px sans-serif";

  /**
   * Draw guide geometry onto the canvas
   */
  static draw(
    ctx: CanvasRenderingContext2D,
    geometry: GuideGeometry,
    viewState: ViewState,
    dimensions: Dimensions,
    cellSize: number,
    pan: { x: number; y: number },
  ): void {
    ctx.save();

    // Draw lines first (beneath handles)
    for (const line of geometry.lines) {
      this.drawLine(ctx, line, viewState, dimensions, cellSize, pan);
    }

    // Draw handles on top
    for (const handle of geometry.handles) {
      this.drawHandle(ctx, handle, viewState, dimensions, cellSize, pan);
    }

    ctx.restore();
  }

  /**
   * Convert a world position to the pixel center of its grid cell
   */
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

  /**
   * Draw a single guide line
   */
  private static drawLine(
    ctx: CanvasRenderingContext2D,
    line: GuideLine,
    viewState: ViewState,
    dimensions: Dimensions,
    cellSize: number,
    pan: { x: number; y: number },
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
        ctx.strokeStyle = this.BASELINE_COLOR;
        ctx.setLineDash([]);
        break;
      case "control":
        ctx.strokeStyle = this.CONTROL_LINE_COLOR;
        ctx.setLineDash([6, 4]);
        break;
      case "tangent":
        ctx.strokeStyle = this.TANGENT_LINE_COLOR;
        ctx.setLineDash([2, 3]);
        ctx.globalAlpha = 0.5;
        break;
    }

    ctx.moveTo(from.px, from.py);
    ctx.lineTo(to.px, to.py);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Draw a single control point handle
   */
  private static drawHandle(
    ctx: CanvasRenderingContext2D,
    handle: ControlPointHandle,
    viewState: ViewState,
    dimensions: Dimensions,
    cellSize: number,
    pan: { x: number; y: number },
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
      // Filled diamond for placed points
      ctx.fillStyle = this.HANDLE_PLACED_COLOR;
      ctx.strokeStyle = "#000000";
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
      // Hollow circle for cursor point
      ctx.strokeStyle = this.HANDLE_CURSOR_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw label above handle
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.font = this.LABEL_FONT;
    ctx.textAlign = "center";
    const labelY = py - r - 6;
    ctx.strokeText(handle.label, px, labelY);
    ctx.fillText(handle.label, px, labelY);
  }
}
