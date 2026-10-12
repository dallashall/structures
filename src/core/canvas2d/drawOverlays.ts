import type { Dimensions, LayerState, MetaBlock } from "../../types";
import { addOffset, directionToOffset } from "../DirectionMath";
import type { Canvas2DColorConfig } from "./Canvas2DRenderer";
import type { ViewState } from "./ViewState";
import { getColorForAxis, getLayerForAxis } from "./renderingUtils";

export function drawCoordinateAxes(
  ctx: CanvasRenderingContext2D,
  viewState: ViewState,
  canvasHeight: number,
  colors: Canvas2DColorConfig,
): void {
  const padding = 20;
  const arrowLength = 40;
  const arrowHeadSize = 8;

  const axes = viewState.getAxesForView();
  const originX = padding;
  const originY = canvasHeight - padding;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.font = "bold 14px sans-serif";

  const hColor = getColorForAxis(axes.horizontal);
  ctx.strokeStyle = hColor;
  ctx.fillStyle = hColor;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(originX + arrowLength, originY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(originX + arrowLength, originY);
  ctx.lineTo(
    originX + arrowLength - arrowHeadSize,
    originY - arrowHeadSize / 2,
  );
  ctx.lineTo(
    originX + arrowLength - arrowHeadSize,
    originY + arrowHeadSize / 2,
  );
  ctx.closePath();
  ctx.fill();

  ctx.fillText(axes.horizontal, originX + arrowLength + 8, originY + 5);

  const vColor = getColorForAxis(axes.vertical);
  ctx.strokeStyle = vColor;
  ctx.fillStyle = vColor;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(originX, originY - arrowLength);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(originX, originY - arrowLength);
  ctx.lineTo(
    originX - arrowHeadSize / 2,
    originY - arrowLength + arrowHeadSize,
  );
  ctx.lineTo(
    originX + arrowHeadSize / 2,
    originY - arrowLength + arrowHeadSize,
  );
  ctx.closePath();
  ctx.fill();

  ctx.fillText(axes.vertical, originX - 5, originY - arrowLength - 8);

  const depthX = originX + arrowLength + 60;
  const depthY = originY;
  const dColor = getColorForAxis(axes.depth);
  ctx.strokeStyle = dColor;
  ctx.fillStyle = dColor;
  ctx.beginPath();
  ctx.arc(depthX, depthY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText(axes.depth, depthX + 12, depthY + 5);
  ctx.fillStyle = colors.textSecondary;
  ctx.font = "12px sans-serif";
  ctx.fillText("(depth)", depthX + 12, depthY + 18);

  ctx.restore();
}

export function drawLayerIndicators(
  ctx: CanvasRenderingContext2D,
  viewState: ViewState,
  dimensions: Dimensions,
  activeLayers: LayerState,
): void {
  const { gridWidth, gridHeight } = viewState.getGridDimensions(dimensions);
  const cellSize = viewState.getCellSize();
  const pan = viewState.getPan();
  const axes = viewState.getAxesForView();

  ctx.save();

  // A horizontal line marks the active layer of the view's vertical axis
  if (axes.vertical !== axes.depth) {
    const axisName = axes.vertical;
    const layerValue = getLayerForAxis(axisName, activeLayers);
    const color = getColorForAxis(axisName);
    const gridPos = viewState.getGridPositionForLayer(
      axisName,
      layerValue,
      dimensions,
    );

    if (gridPos !== null && gridPos >= 0 && gridPos < gridHeight) {
      const py = pan.y + gridPos * cellSize;
      const gridLeft = pan.x;
      const gridRight = pan.x + gridWidth * cellSize;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(gridLeft, py);
      ctx.lineTo(gridRight, py);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(gridLeft - 2, py);
      ctx.lineTo(gridLeft, py);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gridRight, py);
      ctx.lineTo(gridRight + 2, py);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${axisName}: ${layerValue}`, gridLeft - 8, py - 6);
      ctx.textAlign = "left";
      ctx.fillText(`${axisName}: ${layerValue}`, gridRight + 8, py - 6);
    }
  }

  // A vertical line marks the active layer of the view's horizontal axis
  if (axes.horizontal !== axes.depth) {
    const axisName = axes.horizontal;
    const layerValue = getLayerForAxis(axisName, activeLayers);
    const color = getColorForAxis(axisName);
    const gridPos = viewState.getGridPositionForLayer(
      axisName,
      layerValue,
      dimensions,
    );

    if (gridPos !== null && gridPos >= 0 && gridPos < gridWidth) {
      const px = pan.x + gridPos * cellSize;
      const gridTop = pan.y;
      const gridBottom = pan.y + gridHeight * cellSize;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(px, gridTop);
      ctx.lineTo(px, gridBottom);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(px, gridTop - 2);
      ctx.lineTo(px, gridTop);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, gridBottom);
      ctx.lineTo(px, gridBottom + 2);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${axisName}: ${layerValue}`, px, gridTop - 8);
      ctx.fillText(`${axisName}: ${layerValue}`, px, gridBottom + 18);
    }
  }

  ctx.restore();
}

export function drawMetaBlock(
  ctx: CanvasRenderingContext2D,
  metaBlock: MetaBlock | null,
  viewState: ViewState,
  dimensions: Dimensions,
  activeLayers: LayerState,
  cellSize: number,
  pan: { x: number; y: number },
  colors: Canvas2DColorConfig,
): void {
  if (!metaBlock) return;

  const { gridWidth, gridHeight } = viewState.getGridDimensions(dimensions);
  const distance = viewState.getLayerDistance(
    metaBlock.position,
    activeLayers,
  );

  // Same fade as getOpacityForDistance in renderingUtils
  let opacity: number;
  if (distance === 0) opacity = 1.0;
  else if (distance === 1) opacity = 0.3;
  else if (distance === 2) opacity = 0.1;
  else return;

  const { gridX, gridY } = viewState.modelToGrid(
    metaBlock.position,
    dimensions,
  );

  if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
    return;
  }

  const px = pan.x + gridX * cellSize;
  const py = pan.y + gridY * cellSize;
  const centerX = px + cellSize / 2;
  const centerY = py + cellSize / 2;

  ctx.fillStyle = colors.metaBlockFill;
  ctx.globalAlpha = opacity;
  ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

  ctx.strokeStyle = colors.metaBlockBorder;
  ctx.lineWidth = 3;
  ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

  ctx.strokeStyle = colors.metaBlockArrow;
  ctx.fillStyle = colors.metaBlockArrow;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // The facing projected onto this view. A facing along the view axis has no in-plane direction, so it draws a dot.
  const ahead = viewState.modelToGrid(
    addOffset(metaBlock.position, directionToOffset(metaBlock.direction)),
    dimensions,
  );
  const stepX = ahead.gridX - gridX;
  const stepY = ahead.gridY - gridY;
  const arrowLength = cellSize * 0.32;

  if (stepX === 0 && stepY === 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, arrowLength * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const tipX = centerX + stepX * arrowLength;
    const tipY = centerY + stepY * arrowLength;
    const headX = -stepX * arrowLength * 0.55;
    const headY = -stepY * arrowLength * 0.55;
    ctx.beginPath();
    ctx.moveTo(centerX - stepX * arrowLength, centerY - stepY * arrowLength);
    ctx.lineTo(tipX, tipY);
    ctx.moveTo(tipX + headX - headY * 0.8, tipY + headY + headX * 0.8);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(tipX + headX + headY * 0.8, tipY + headY - headX * 0.8);
    ctx.stroke();
  }

  ctx.globalAlpha = 1.0;
}
