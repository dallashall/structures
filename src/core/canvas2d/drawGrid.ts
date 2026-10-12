import type { Canvas2DColorConfig } from "./Canvas2DRenderer";

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  gridWidth: number,
  gridHeight: number,
  cellSize: number,
  pan: { x: number; y: number },
  colors: Canvas2DColorConfig,
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
