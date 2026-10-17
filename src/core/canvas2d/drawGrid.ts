import type { CanvasColors } from "../../config/colorSchemes";

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  gridWidth: number,
  gridHeight: number,
  cellSize: number,
  pan: { x: number; y: number },
  colors: CanvasColors,
): void {
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;

  for (let x = 0; x <= gridWidth; x++) {
    const px = pan.x + x * cellSize;
    ctx.beginPath();
    ctx.moveTo(px, pan.y);
    ctx.lineTo(px, pan.y + gridHeight * cellSize);
    ctx.stroke();
  }

  for (let y = 0; y <= gridHeight; y++) {
    const py = pan.y + y * cellSize;
    ctx.beginPath();
    ctx.moveTo(pan.x, py);
    ctx.lineTo(pan.x + gridWidth * cellSize, py);
    ctx.stroke();
  }
}

// Cell edges stay visible over solid-color cells down to this size. Below it the lines would cover most of the view.
const OVERLAY_MIN_CELL_PX = 3;
const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.35)';

/**
 * Dark one-device-pixel lines over the blocks at every cell edge, for cells too small for the 1px gap
 * between textured blocks. Lines snap to device pixels the same way solid cells do, so they sit on the seams.
 */
export function drawGridOverlay(
  ctx: CanvasRenderingContext2D,
  gridWidth: number,
  gridHeight: number,
  cellSize: number,
  pan: { x: number; y: number },
): void {
  if (cellSize < OVERLAY_MIN_CELL_PX) return;

  const scale = ctx.getTransform().a || 1;
  const snap = (value: number): number => Math.round(value * scale) / scale;
  const lineWidth = 1 / scale;
  const left = snap(pan.x);
  const top = snap(pan.y);
  const right = snap(pan.x + gridWidth * cellSize);
  const bottom = snap(pan.y + gridHeight * cellSize);

  ctx.fillStyle = OVERLAY_COLOR;
  for (let x = 1; x < gridWidth; x++) {
    ctx.fillRect(snap(pan.x + x * cellSize), top, lineWidth, bottom - top);
  }
  for (let y = 1; y < gridHeight; y++) {
    ctx.fillRect(left, snap(pan.y + y * cellSize), right - left, lineWidth);
  }
}
