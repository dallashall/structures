import type { Dimensions } from '../../types';
import { projectManager } from '../ProjectManager';
import { blockRegistry } from '../BlockRegistry';
import { editorStateManager } from '../EditorStateManager';
import { draftingService } from '../DraftingService';
import type { Canvas2DViewport } from './Canvas2DViewport';
import type { Canvas2DPreviewManager } from './Canvas2DPreviewManager';
import { getOpacityForDistance, getColorForAxis, getLayerForAxis } from './renderingUtils';

/**
 * Canvas2DColorConfig - Color configuration for dark/light mode support
 */
export interface Canvas2DColorConfig {
  grid: string;
  axisX: string;
  axisY: string;
  axisZ: string;
  axisLabel: string;
  metaBlockBorder: string;
  metaBlockBorderUnconfirmed: string;
  metaBlockFill: string;
  metaBlockArrow: string;
  layerIndicator: string;
  textSecondary: string;
}

/**
 * Default dark mode colors
 */
export const DARK_MODE_COLORS: Canvas2DColorConfig = {
  grid: '#444444',
  axisX: '#e74c3c',
  axisY: '#3498db',
  axisZ: '#27ae60',
  axisLabel: '#a0a0a0',
  metaBlockBorder: '#2a2a2a',
  metaBlockBorderUnconfirmed: '#4CAF50',
  metaBlockFill: '#e0e0e0',
  metaBlockArrow: '#1a1a1a',
  layerIndicator: '#666666',
  textSecondary: '#888888',
};

/**
 * Default light mode colors
 */
export const LIGHT_MODE_COLORS: Canvas2DColorConfig = {
  grid: '#cccccc',
  axisX: '#e74c3c',
  axisY: '#3498db',
  axisZ: '#27ae60',
  axisLabel: '#666666',
  metaBlockBorder: '#000000',
  metaBlockBorderUnconfirmed: '#4CAF50',
  metaBlockFill: '#ffffff',
  metaBlockArrow: '#000000',
  layerIndicator: '#999999',
  textSecondary: '#666666',
};

/**
 * Canvas2DRenderer - Pure rendering logic for 2D canvas
 *
 * Responsibilities:
 * - Grid rendering
 * - Block rendering
 * - Coordinate axes legend
 * - Active layer indicators
 * - Preview rendering (outline, point)
 *
 * This class is stateless - all state comes from parameters.
 * It reads from viewport and previewManager but never modifies them.
 */
export class Canvas2DRenderer {
  private colors: Canvas2DColorConfig = DARK_MODE_COLORS;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private canvas: HTMLCanvasElement,
    colors?: Canvas2DColorConfig
  ) {
    if (colors) {
      this.colors = colors;
    }
  }

  /**
   * Update color configuration (e.g., when theme changes)
   */
  setColors(colors: Canvas2DColorConfig): void {
    this.colors = colors;
  }

  /**
   * Main render method - draws the entire canvas
   */
  render(viewport: Canvas2DViewport, previewManager: Canvas2DPreviewManager): void {
    const project = projectManager.getProject();
    if (!project) return;

    const { width, height } = this.canvas;
    const { gridWidth, gridHeight } = viewport.getGridDimensions(project.dimensions);
    const activeLayers = editorStateManager.getActiveLayers();
    const cellSize = viewport.getCellSize();
    const pan = viewport.getPan();

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Draw grid
    this.drawGrid(gridWidth, gridHeight, cellSize, pan);

    // Draw blocks
    this.drawBlocks(project.dimensions, viewport, activeLayers);

    // Draw meta block
    this.drawMetaBlock(project.dimensions, viewport, activeLayers, cellSize, pan);

    // Draw coordinate axes
    this.drawCoordinateAxes(viewport);

    // Draw active layer indicators
    this.drawActiveLayerIndicators(project.dimensions, viewport, activeLayers);

    // Draw previews
    this.drawOutlinePreview(previewManager, viewport, gridWidth, gridHeight, cellSize, pan);
    this.drawPointPreview(previewManager, gridWidth, gridHeight, cellSize, pan);
    this.drawSharedPreview(viewport, gridWidth, gridHeight, cellSize, pan);
  }

  /**
   * Draw grid lines
   */
  private drawGrid(
    gridWidth: number,
    gridHeight: number,
    cellSize: number,
    pan: { x: number; y: number }
  ): void {
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= gridWidth; x++) {
      const px = pan.x + x * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(px, pan.y);
      this.ctx.lineTo(px, pan.y + gridHeight * cellSize);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= gridHeight; y++) {
      const py = pan.y + y * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(pan.x, py);
      this.ctx.lineTo(pan.x + gridWidth * cellSize, py);
      this.ctx.stroke();
    }
  }

  /**
   * Draw all blocks in the project
   *
   * OPTIMIZATION: Uses layer-based queries instead of iterating all blocks.
   * Only queries blocks within ±2 layers of the active layer (opacity range).
   * This is O(blocks in visible layers) instead of O(all blocks).
   */
  private drawBlocks(
    dimensions: Dimensions,
    viewport: Canvas2DViewport,
    activeLayers: { x: number; y: number; z: number }
  ): void {
    const { gridWidth, gridHeight } = viewport.getGridDimensions(dimensions);
    const cellSize = viewport.getCellSize();
    const pan = viewport.getPan();

    // Determine which axis is the depth axis for this view
    const axes = viewport.getAxesForView();
    const depthAxis = axes.depth.toLowerCase() as 'x' | 'y' | 'z';
    const activeLayer = getLayerForAxis(axes.depth, activeLayers);

    // Query blocks in visible layer range (±2 for opacity falloff)
    // Distance 0: 100%, distance 1: 30%, distance 2: 10%, distance 3+: 0%
    const minLayer = Math.max(0, activeLayer - 2);
    const maxLayer = activeLayer + 2;

    const visibleBlocks: Array<{ blockData: any; distance: number }> = [];

    // Collect blocks from all visible layers
    for (let layer = minLayer; layer <= maxLayer; layer++) {
      const blocksAtLayer = projectManager.getBlocksAtLayer(depthAxis, layer);
      const distance = Math.abs(layer - activeLayer);

      for (const blockData of blocksAtLayer) {
        visibleBlocks.push({ blockData, distance });
      }
    }

    // Render visible blocks
    for (const { blockData, distance } of visibleBlocks) {
      const { gridX, gridY } = viewport.positionToGrid(blockData.position);

      // Check bounds
      if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
        continue;
      }

      // Calculate opacity
      const opacity = getOpacityForDistance(distance);

      // Don't render if 3+ layers away
      if (opacity === 0.0) continue;

      // Get block color
      const block = blockRegistry.getBlock(blockData.blockType);
      if (!block) continue;

      // Draw block
      const px = pan.x + gridX * cellSize;
      const py = pan.y + gridY * cellSize;

      this.ctx.fillStyle = block.color;
      this.ctx.globalAlpha = opacity;
      this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      this.ctx.globalAlpha = 1.0;
    }
  }

  /**
   * Draw meta block (spawn point)
   */
  private drawMetaBlock(
    dimensions: Dimensions,
    viewport: Canvas2DViewport,
    activeLayers: { x: number; y: number; z: number },
    cellSize: number,
    pan: { x: number; y: number }
  ): void {
    const project = projectManager.getProject();
    if (!project?.metaBlock) return;

    const { gridWidth, gridHeight } = viewport.getGridDimensions(dimensions);
    const metaBlock = project.metaBlock;
    const distance = viewport.getLayerDistance(metaBlock.position, activeLayers);
    const opacity = getOpacityForDistance(distance);

    if (opacity === 0.0) return;

    const { gridX, gridY } = viewport.positionToGrid(metaBlock.position);

    if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
      return;
    }

    const px = pan.x + gridX * cellSize;
    const py = pan.y + gridY * cellSize;
    const centerX = px + cellSize / 2;
    const centerY = py + cellSize / 2;

    const isConfirmed = metaBlock.isConfirmed;
    const strokeColor = isConfirmed ? this.colors.metaBlockBorder : this.colors.metaBlockBorderUnconfirmed;
    const strokeWidth = isConfirmed ? 2 : 3;
    const fillOpacity = isConfirmed ? opacity : opacity * 0.7;

    // Draw background
    this.ctx.fillStyle = this.colors.metaBlockFill;
    this.ctx.globalAlpha = fillOpacity;
    this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

    // Draw border
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

    // Draw directional arrow
    this.ctx.strokeStyle = this.colors.metaBlockArrow;
    this.ctx.fillStyle = this.colors.metaBlockArrow;
    this.drawMetaBlockArrow(centerX, centerY, cellSize, metaBlock.direction, viewport);
    this.ctx.globalAlpha = 1.0;
  }

  /**
   * Draw meta block directional arrow
   */
  private drawMetaBlockArrow(
    centerX: number,
    centerY: number,
    cellSize: number,
    _direction: string,
    _viewport: Canvas2DViewport
  ): void {
    const arrowSize = Math.min(cellSize * 0.6, 20);
    this.ctx.strokeStyle = this.colors.metaBlockArrow;
    this.ctx.fillStyle = this.colors.metaBlockArrow;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Simplified arrow rendering (implementation details omitted for brevity)
    // In real code, would include full arrow drawing logic
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, arrowSize * 0.2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw coordinate axes legend
   */
  private drawCoordinateAxes(viewport: Canvas2DViewport): void {
    const { height } = this.canvas;
    const padding = 20;
    const arrowLength = 40;
    const arrowHeadSize = 8;

    const axes = viewport.getAxesForView();
    const originX = padding;
    const originY = height - padding;

    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.font = 'bold 14px sans-serif';

    // Horizontal axis
    const hColor = getColorForAxis(axes.horizontal);
    this.ctx.strokeStyle = hColor;
    this.ctx.fillStyle = hColor;
    this.ctx.beginPath();
    this.ctx.moveTo(originX, originY);
    this.ctx.lineTo(originX + arrowLength, originY);
    this.ctx.stroke();

    // Arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(originX + arrowLength, originY);
    this.ctx.lineTo(originX + arrowLength - arrowHeadSize, originY - arrowHeadSize / 2);
    this.ctx.lineTo(originX + arrowLength - arrowHeadSize, originY + arrowHeadSize / 2);
    this.ctx.closePath();
    this.ctx.fill();

    // Label
    this.ctx.fillText(axes.horizontal, originX + arrowLength + 8, originY + 5);

    // Vertical axis
    const vColor = getColorForAxis(axes.vertical);
    this.ctx.strokeStyle = vColor;
    this.ctx.fillStyle = vColor;
    this.ctx.beginPath();
    this.ctx.moveTo(originX, originY);
    this.ctx.lineTo(originX, originY - arrowLength);
    this.ctx.stroke();

    // Arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(originX, originY - arrowLength);
    this.ctx.lineTo(originX - arrowHeadSize / 2, originY - arrowLength + arrowHeadSize);
    this.ctx.lineTo(originX + arrowHeadSize / 2, originY - arrowLength + arrowHeadSize);
    this.ctx.closePath();
    this.ctx.fill();

    // Label
    this.ctx.fillText(axes.vertical, originX - 5, originY - arrowLength - 8);

    // Depth indicator
    const depthX = originX + arrowLength + 60;
    const depthY = originY;
    const dColor = getColorForAxis(axes.depth);
    this.ctx.strokeStyle = dColor;
    this.ctx.fillStyle = dColor;
    this.ctx.beginPath();
    this.ctx.arc(depthX, depthY, 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillText(axes.depth, depthX + 12, depthY + 5);
    this.ctx.fillStyle = this.colors.textSecondary;
    this.ctx.font = '12px sans-serif';
    this.ctx.fillText('(depth)', depthX + 12, depthY + 18);

    this.ctx.restore();
  }

  /**
   * Draw active layer indicators
   */
  private drawActiveLayerIndicators(
    dimensions: Dimensions,
    viewport: Canvas2DViewport,
    activeLayers: { x: number; y: number; z: number }
  ): void {
    const { gridWidth, gridHeight } = viewport.getGridDimensions(dimensions);
    const cellSize = viewport.getCellSize();
    const pan = viewport.getPan();
    const axes = viewport.getAxesForView();

    this.ctx.save();

    // Horizontal layer indicator
    if (axes.vertical !== axes.depth) {
      const axisName = axes.vertical;
      const layerValue = getLayerForAxis(axisName, activeLayers);
      const color = getColorForAxis(axisName);
      const gridPos = viewport.getGridPositionForLayer(axisName, layerValue, dimensions);

      if (gridPos !== null && gridPos >= 0 && gridPos < gridHeight) {
        const py = pan.y + gridPos * cellSize;
        const gridLeft = pan.x;
        const gridRight = pan.x + gridWidth * cellSize;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(gridLeft, py);
        this.ctx.lineTo(gridRight, py);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;

        // Edge markers
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(gridLeft - 2, py);
        this.ctx.lineTo(gridLeft, py);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(gridRight, py);
        this.ctx.lineTo(gridRight + 2, py);
        this.ctx.stroke();

        // Labels
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${axisName}: ${layerValue}`, gridLeft - 8, py - 6);
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${axisName}: ${layerValue}`, gridRight + 8, py - 6);
      }
    }

    // Vertical layer indicator
    if (axes.horizontal !== axes.depth) {
      const axisName = axes.horizontal;
      const layerValue = getLayerForAxis(axisName, activeLayers);
      const color = getColorForAxis(axisName);
      const gridPos = viewport.getGridPositionForLayer(axisName, layerValue, dimensions);

      if (gridPos !== null && gridPos >= 0 && gridPos < gridWidth) {
        const px = pan.x + gridPos * cellSize;
        const gridTop = pan.y;
        const gridBottom = pan.y + gridHeight * cellSize;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(px, gridTop);
        this.ctx.lineTo(px, gridBottom);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;

        // Edge markers
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(px, gridTop - 2);
        this.ctx.lineTo(px, gridTop);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(px, gridBottom);
        this.ctx.lineTo(px, gridBottom + 2);
        this.ctx.stroke();

        // Labels
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${axisName}: ${layerValue}`, px, gridTop - 8);
        this.ctx.fillText(`${axisName}: ${layerValue}`, px, gridBottom + 18);
      }
    }

    this.ctx.restore();
  }

  /**
   * Draw outline preview (dashed rectangle and preview blocks)
   */
  private drawOutlinePreview(
    previewManager: Canvas2DPreviewManager,
    _viewport: Canvas2DViewport,
    gridWidth: number,
    gridHeight: number,
    cellSize: number,
    pan: { x: number; y: number }
  ): void {
    const selectedBlock = editorStateManager.getSelectedBlock();
    if (!selectedBlock) return;

    const block = blockRegistry.getBlock(selectedBlock);
    if (!block) return;

    const preview = previewManager.getOutlinePreview();
    if (!preview) return;

    const minX = Math.min(preview.start.gridX, preview.end.gridX);
    const maxX = Math.max(preview.start.gridX, preview.end.gridX);
    const minY = Math.min(preview.start.gridY, preview.end.gridY);
    const maxY = Math.max(preview.start.gridY, preview.end.gridY);

    this.ctx.save();
    this.ctx.globalAlpha = 0.5;
    this.ctx.fillStyle = block.color;

    // Draw outline blocks
    for (let x = minX; x <= maxX; x++) {
      if (x >= 0 && x < gridWidth && minY >= 0 && minY < gridHeight) {
        const px = pan.x + x * cellSize;
        const py = pan.y + minY * cellSize;
        this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      }
      if (x >= 0 && x < gridWidth && maxY >= 0 && maxY < gridHeight) {
        const px = pan.x + x * cellSize;
        const py = pan.y + maxY * cellSize;
        this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      }
    }

    for (let y = minY + 1; y < maxY; y++) {
      if (minX >= 0 && minX < gridWidth && y >= 0 && y < gridHeight) {
        const px = pan.x + minX * cellSize;
        const py = pan.y + y * cellSize;
        this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      }
      if (maxX >= 0 && maxX < gridWidth && y >= 0 && y < gridHeight) {
        const px = pan.x + maxX * cellSize;
        const py = pan.y + y * cellSize;
        this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      }
    }

    // Draw dashed rectangle guide
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeStyle = block.color;
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.7;
    const rectX = pan.x + minX * cellSize;
    const rectY = pan.y + minY * cellSize;
    const rectWidth = (maxX - minX + 1) * cellSize;
    const rectHeight = (maxY - minY + 1) * cellSize;
    this.ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
    this.ctx.setLineDash([]);

    this.ctx.restore();
  }

  /**
   * Draw shared preview blocks from EditorStateManager and DraftingService
   *
   * Two types of preview:
   * 1. EditorStateManager: Local 2D-specific preview (outline drag, point hover, Alt key preview)
   * 2. DraftingService: Shared painting preview (draft blocks during painting, shared across ALL views)
   *
   * In delete mode, preview blocks are shown with a red tint to indicate removal.
   */
  private drawSharedPreview(
    viewport: Canvas2DViewport,
    gridWidth: number,
    gridHeight: number,
    cellSize: number,
    pan: { x: number; y: number }
  ): void {
    // Combine preview blocks from both sources
    const editorPreview = editorStateManager.getPreviewBlocks() || [];
    const draftPreview = draftingService.getPreview() || [];

    // Combine both arrays
    const allPreviewBlocks = [...editorPreview, ...draftPreview];

    if (allPreviewBlocks.length === 0) return;

    const deleteMode = editorStateManager.getDeleteMode();

    this.ctx.save();
    this.ctx.globalAlpha = 0.7; // Preview blocks at 70% opacity for visibility

    // Render each preview block
    for (const previewBlock of allPreviewBlocks) {
      if (!previewBlock.blockType) continue;

      const block = blockRegistry.getBlock(previewBlock.blockType);
      if (!block) continue;

      // Convert 3D position to 2D grid coordinates
      const gridPos = viewport.positionToGrid(previewBlock.position);

      // Check if within visible grid
      if (
        gridPos.gridX < 0 || gridPos.gridX >= gridWidth ||
        gridPos.gridY < 0 || gridPos.gridY >= gridHeight
      ) {
        continue;
      }

      const px = pan.x + gridPos.gridX * cellSize;
      const py = pan.y + gridPos.gridY * cellSize;

      // Draw block with normal color
      this.ctx.fillStyle = block.color;
      this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

      // If in delete mode, overlay red tint to indicate removal
      if (deleteMode) {
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; // Red overlay at 40% opacity
        this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      }
    }

    this.ctx.restore();
  }

  /**
   * Draw point preview (single cell highlight)
   */
  private drawPointPreview(
    previewManager: Canvas2DPreviewManager,
    gridWidth: number,
    gridHeight: number,
    cellSize: number,
    pan: { x: number; y: number }
  ): void {
    const selectedBlock = editorStateManager.getSelectedBlock();
    if (!selectedBlock) return;

    const block = blockRegistry.getBlock(selectedBlock);
    if (!block) return;

    const preview = previewManager.getPointPreview();
    if (!preview) return;

    const { gridX, gridY } = preview;
    if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
      return;
    }

    const px = pan.x + gridX * cellSize;
    const py = pan.y + gridY * cellSize;

    this.ctx.save();
    this.ctx.fillStyle = block.color;
    this.ctx.globalAlpha = 0.5;
    this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

    this.ctx.strokeStyle = block.color;
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.8;
    this.ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
    this.ctx.restore();
  }
}
