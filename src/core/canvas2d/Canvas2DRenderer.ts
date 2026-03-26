import type { Dimensions, ViewType, Block } from "../../types";
import { projectView } from "../../projections/ProjectView";
import { blockProjection } from "../../projections/BlockProjection";
import { blockRegistry } from "../BlockRegistry";
import { textureManager } from "../TextureManager";
import { editorState } from "../EditorState";
import { draftingService } from "../DraftingService";
import type { ViewState } from "./ViewState";
import type { PreviewData } from "../tools/ToolBase";
import {
  getOpacityForDistance,
  getColorForAxis,
  getLayerForAxis,
} from "./renderingUtils";
import { GuideGeometryRenderer } from "./GuideGeometryRenderer";

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
  grid: "#444444",
  axisX: "#e74c3c",
  axisY: "#3498db",
  axisZ: "#27ae60",
  axisLabel: "#a0a0a0",
  metaBlockBorder: "#2a2a2a",
  metaBlockBorderUnconfirmed: "#4CAF50",
  metaBlockFill: "#e0e0e0",
  metaBlockArrow: "#1a1a1a",
  layerIndicator: "#666666",
  textSecondary: "#888888",
};

/**
 * Default light mode colors
 */
export const LIGHT_MODE_COLORS: Canvas2DColorConfig = {
  grid: "#cccccc",
  axisX: "#e74c3c",
  axisY: "#3498db",
  axisZ: "#27ae60",
  axisLabel: "#666666",
  metaBlockBorder: "#000000",
  metaBlockBorderUnconfirmed: "#4CAF50",
  metaBlockFill: "#ffffff",
  metaBlockArrow: "#000000",
  layerIndicator: "#999999",
  textSecondary: "#666666",
};

/**
 * Canvas2DRenderer - Pure rendering logic for 2D canvas
 *
 * Responsibilities:
 * - Grid rendering
 * - Block rendering
 * - Coordinate axes legend
 * - Active layer indicators
 * - Tool preview rendering (hover highlights, guide geometry)
 * - Shared preview rendering (DraftingService blocks)
 *
 * This class is stateless - all state comes from parameters.
 */
export class Canvas2DRenderer {
  private colors: Canvas2DColorConfig = DARK_MODE_COLORS;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private canvas: HTMLCanvasElement,
    colors?: Canvas2DColorConfig,
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
  render(
    viewState: ViewState,
    previewData: PreviewData | null,
  ): void {
    const project = projectView.getCached();
    if (!project) return;

    const { width, height } = this.canvas;
    const { gridWidth, gridHeight } = viewState.getGridDimensions(
      project.dimensions,
    );
    const activeLayers = editorState.getActiveLayers();
    const cellSize = viewState.getCellSize();
    const pan = viewState.getPan();

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Draw grid
    this.drawGrid(gridWidth, gridHeight, cellSize, pan);

    // Draw blocks
    this.drawBlocks(project.dimensions, viewState, activeLayers);

    // Draw meta block
    this.drawMetaBlock(
      project.dimensions,
      viewState,
      activeLayers,
      cellSize,
      pan,
    );

    // Draw coordinate axes
    this.drawCoordinateAxes(viewState);

    // Draw active layer indicators
    this.drawActiveLayerIndicators(project.dimensions, viewState, activeLayers);

    // Draw guide geometry (control points + guide lines for multi-click tools)
    if (previewData?.guide) {
      GuideGeometryRenderer.draw(
        this.ctx,
        previewData.guide,
        viewState,
        project.dimensions,
        cellSize,
        pan,
      );
    }

    // Draw shared preview (draft blocks from DraftingService + EditorState)
    this.drawSharedPreview(
      viewState,
      project.dimensions,
      gridWidth,
      gridHeight,
      cellSize,
      pan,
    );

    // Draw tool-local preview (hover highlight)
    this.drawToolPreview(previewData, gridWidth, gridHeight, cellSize, pan);
  }

  /**
   * Draw grid lines
   */
  private drawGrid(
    gridWidth: number,
    gridHeight: number,
    cellSize: number,
    pan: { x: number; y: number },
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
   * Get face index for current view
   * Maps orthographic view to BabylonJS face index
   *
   * Our coordinate system: X=width, Y=depth, Z=height
   * BabylonJS: Y-up, conversion is Our (x,y,z) → Babylon (x,z,y) [NO NEGATION]
   * Face order: [front(+Z), back(-Z), right(+X), left(-X), top(+Y), bottom(-Y)]
   */
  private getFaceIndexForView(view: ViewType): number {
    const faceMap: Record<ViewType, number> = {
      front: 0,
      back: 1,
      left: 3,
      right: 2,
      top: 4,
      bottom: 5,
    };
    return faceMap[view] ?? 0;
  }

  /**
   * Render block with texture from atlas or tinted texture
   * Returns true if successful, false if texture unavailable
   */
  private renderBlockTexture(
    block: Block,
    faceIndex: number,
    px: number,
    py: number,
    cellSize: number,
    opacity: number,
  ): boolean {
    // Check for tinted texture first (glass variants)
    const tintedTexture = textureManager.getTintedTexture(block.id, faceIndex);
    if (tintedTexture) {
      this.ctx.imageSmoothingEnabled = false;

      if (block.isTransparent) {
        this.ctx.globalAlpha = opacity * 0.15;
      } else {
        this.ctx.globalAlpha = opacity;
      }

      this.ctx.drawImage(
        tintedTexture,
        0,
        0,
        tintedTexture.width,
        tintedTexture.height,
        px + 1,
        py + 1,
        cellSize - 2,
        cellSize - 2,
      );

      this.ctx.globalAlpha = 1.0;
      return true;
    }

    // Fallback to atlas texture
    const atlas = textureManager.getAtlas();
    if (!atlas || !atlas.loaded) return false;

    const coords = textureManager.getBlockFaceCoords(block.id, faceIndex);
    if (!coords) return false;

    this.ctx.imageSmoothingEnabled = false;
    this.ctx.globalAlpha = opacity;

    this.ctx.drawImage(
      atlas.image,
      coords.x,
      coords.y,
      coords.width,
      coords.height,
      px + 1,
      py + 1,
      cellSize - 2,
      cellSize - 2,
    );

    this.ctx.globalAlpha = 1.0;
    return true;
  }

  /**
   * Draw all blocks in the project
   *
   * OPTIMIZATION: Uses layer-based queries instead of iterating all blocks.
   * Only queries blocks within ±2 layers of the active layer (opacity range).
   */
  private drawBlocks(
    dimensions: Dimensions,
    viewState: ViewState,
    activeLayers: { x: number; y: number; z: number },
  ): void {
    const { gridWidth, gridHeight } = viewState.getGridDimensions(dimensions);
    const cellSize = viewState.getCellSize();
    const pan = viewState.getPan();

    const axes = viewState.getAxesForView();
    const depthAxis = axes.depth.toLowerCase() as "x" | "y" | "z";
    const activeLayer = getLayerForAxis(axes.depth, activeLayers);

    const minLayer = Math.max(0, activeLayer - 2);
    const maxLayer = activeLayer + 2;

    const visibleBlocks: Array<{ blockData: any; distance: number }> = [];

    const blockIndex = blockProjection.getCached();
    for (let layer = minLayer; layer <= maxLayer; layer++) {
      const blocksAtLayer = blockIndex.getBlocksAtLayer(depthAxis, layer);
      const distance = Math.abs(layer - activeLayer);

      for (const blockData of blocksAtLayer) {
        visibleBlocks.push({ blockData, distance });
      }
    }

    for (const { blockData, distance } of visibleBlocks) {
      const { gridX, gridY } = viewState.modelToGrid(
        blockData.position,
        dimensions,
      );

      if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
        continue;
      }

      const opacity = getOpacityForDistance(distance);
      if (opacity === 0.0) continue;

      const { block } = blockRegistry.getBlockWithState(
        blockData.blockType,
        blockData.blockState,
      );
      if (!block) continue;

      const px = pan.x + gridX * cellSize;
      const py = pan.y + gridY * cellSize;

      const faceIndex = this.getFaceIndexForView(viewState.getViewType());
      const rendered = this.renderBlockTexture(
        block,
        faceIndex,
        px,
        py,
        cellSize,
        opacity,
      );

      if (!rendered) {
        this.ctx.fillStyle = block.color;
        this.ctx.globalAlpha = opacity;
        this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        this.ctx.globalAlpha = 1.0;
      }
    }
  }

  /**
   * Draw meta block (spawn point)
   */
  private drawMetaBlock(
    dimensions: Dimensions,
    viewState: ViewState,
    activeLayers: { x: number; y: number; z: number },
    cellSize: number,
    pan: { x: number; y: number },
  ): void {
    const project = projectView.getCached();
    if (!project?.metaBlock) return;

    const { gridWidth, gridHeight } = viewState.getGridDimensions(dimensions);
    const metaBlock = project.metaBlock;
    const distance = viewState.getLayerDistance(
      metaBlock.position,
      activeLayers,
    );
    const opacity = getOpacityForDistance(distance);

    if (opacity === 0.0) return;

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

    const isConfirmed = metaBlock.isConfirmed;
    const strokeColor = isConfirmed
      ? this.colors.metaBlockBorder
      : this.colors.metaBlockBorderUnconfirmed;
    const strokeWidth = isConfirmed ? 2 : 3;
    const fillOpacity = isConfirmed ? opacity : opacity * 0.7;

    this.ctx.fillStyle = this.colors.metaBlockFill;
    this.ctx.globalAlpha = fillOpacity;
    this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

    this.ctx.strokeStyle = this.colors.metaBlockArrow;
    this.ctx.fillStyle = this.colors.metaBlockArrow;
    this.drawMetaBlockArrow(centerX, centerY, cellSize);
    this.ctx.globalAlpha = 1.0;
  }

  /**
   * Draw meta block directional arrow
   */
  private drawMetaBlockArrow(
    centerX: number,
    centerY: number,
    cellSize: number,
  ): void {
    const arrowSize = Math.min(cellSize * 0.6, 20);
    this.ctx.strokeStyle = this.colors.metaBlockArrow;
    this.ctx.fillStyle = this.colors.metaBlockArrow;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, arrowSize * 0.2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw coordinate axes legend
   */
  private drawCoordinateAxes(viewState: ViewState): void {
    const { height } = this.canvas;
    const padding = 20;
    const arrowLength = 40;
    const arrowHeadSize = 8;

    const axes = viewState.getAxesForView();
    const originX = padding;
    const originY = height - padding;

    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.font = "bold 14px sans-serif";

    // Horizontal axis
    const hColor = getColorForAxis(axes.horizontal);
    this.ctx.strokeStyle = hColor;
    this.ctx.fillStyle = hColor;
    this.ctx.beginPath();
    this.ctx.moveTo(originX, originY);
    this.ctx.lineTo(originX + arrowLength, originY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(originX + arrowLength, originY);
    this.ctx.lineTo(
      originX + arrowLength - arrowHeadSize,
      originY - arrowHeadSize / 2,
    );
    this.ctx.lineTo(
      originX + arrowLength - arrowHeadSize,
      originY + arrowHeadSize / 2,
    );
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillText(axes.horizontal, originX + arrowLength + 8, originY + 5);

    // Vertical axis
    const vColor = getColorForAxis(axes.vertical);
    this.ctx.strokeStyle = vColor;
    this.ctx.fillStyle = vColor;
    this.ctx.beginPath();
    this.ctx.moveTo(originX, originY);
    this.ctx.lineTo(originX, originY - arrowLength);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(originX, originY - arrowLength);
    this.ctx.lineTo(
      originX - arrowHeadSize / 2,
      originY - arrowLength + arrowHeadSize,
    );
    this.ctx.lineTo(
      originX + arrowHeadSize / 2,
      originY - arrowLength + arrowHeadSize,
    );
    this.ctx.closePath();
    this.ctx.fill();

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
    this.ctx.font = "12px sans-serif";
    this.ctx.fillText("(depth)", depthX + 12, depthY + 18);

    this.ctx.restore();
  }

  /**
   * Draw active layer indicators
   */
  private drawActiveLayerIndicators(
    dimensions: Dimensions,
    viewState: ViewState,
    activeLayers: { x: number; y: number; z: number },
  ): void {
    const { gridWidth, gridHeight } = viewState.getGridDimensions(dimensions);
    const cellSize = viewState.getCellSize();
    const pan = viewState.getPan();
    const axes = viewState.getAxesForView();

    this.ctx.save();

    // Horizontal layer indicator
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

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(gridLeft, py);
        this.ctx.lineTo(gridRight, py);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;

        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(gridLeft - 2, py);
        this.ctx.lineTo(gridLeft, py);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(gridRight, py);
        this.ctx.lineTo(gridRight + 2, py);
        this.ctx.stroke();

        this.ctx.fillStyle = color;
        this.ctx.font = "bold 11px sans-serif";
        this.ctx.textAlign = "right";
        this.ctx.fillText(`${axisName}: ${layerValue}`, gridLeft - 8, py - 6);
        this.ctx.textAlign = "left";
        this.ctx.fillText(`${axisName}: ${layerValue}`, gridRight + 8, py - 6);
      }
    }

    // Vertical layer indicator
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

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(px, gridTop);
        this.ctx.lineTo(px, gridBottom);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;

        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(px, gridTop - 2);
        this.ctx.lineTo(px, gridTop);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(px, gridBottom);
        this.ctx.lineTo(px, gridBottom + 2);
        this.ctx.stroke();

        this.ctx.fillStyle = color;
        this.ctx.font = "bold 11px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText(`${axisName}: ${layerValue}`, px, gridTop - 8);
        this.ctx.fillText(`${axisName}: ${layerValue}`, px, gridBottom + 18);
      }
    }

    this.ctx.restore();
  }

  /**
   * Draw shared preview blocks from EditorState and DraftingService
   *
   * Two sources:
   * 1. EditorState: Local 2D-specific preview (Alt key preview)
   * 2. DraftingService: Shared painting preview (draft blocks during painting)
   *
   * In delete mode, preview blocks are shown with a red tint to indicate removal.
   */
  private drawSharedPreview(
    viewState: ViewState,
    dimensions: Dimensions,
    gridWidth: number,
    gridHeight: number,
    cellSize: number,
    pan: { x: number; y: number },
  ): void {
    const editorPreview = editorState.getPreviewBlocks() || [];
    const draftPreview = draftingService.getPreview() || [];

    const allPreviewBlocks = [...editorPreview, ...draftPreview];
    if (allPreviewBlocks.length === 0) return;

    const deleteMode = editorState.getDeleteMode();

    this.ctx.save();
    this.ctx.globalAlpha = 0.7;

    for (const previewBlock of allPreviewBlocks) {
      if (!previewBlock.blockType) continue;

      const block = blockRegistry.getBlock(previewBlock.blockType);
      if (!block) continue;

      const gridPos = viewState.modelToGrid(
        previewBlock.position,
        dimensions,
      );

      if (
        gridPos.gridX < 0 ||
        gridPos.gridX >= gridWidth ||
        gridPos.gridY < 0 ||
        gridPos.gridY >= gridHeight
      ) {
        continue;
      }

      const px = pan.x + gridPos.gridX * cellSize;
      const py = pan.y + gridPos.gridY * cellSize;

      this.ctx.fillStyle = block.color;
      this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

      if (deleteMode) {
        this.ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
        this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      }
    }

    this.ctx.restore();
  }

  /**
   * Draw tool-local preview blocks (hover highlight)
   *
   * Reads from previewData.blocks, which contains UniversalPosition
   * with pre-resolved gridX/gridY coordinates.
   */
  private drawToolPreview(
    previewData: PreviewData | null,
    gridWidth: number,
    gridHeight: number,
    cellSize: number,
    pan: { x: number; y: number },
  ): void {
    if (!previewData || previewData.blocks.length === 0) return;

    const selectedBlock = editorState.getSelectedBlock();
    if (!selectedBlock) return;

    const block = blockRegistry.getBlock(selectedBlock);
    if (!block) return;

    this.ctx.save();

    for (const previewBlock of previewData.blocks) {
      const { gridX, gridY } = previewBlock.position;
      if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
        continue;
      }

      const px = pan.x + gridX * cellSize;
      const py = pan.y + gridY * cellSize;

      this.ctx.fillStyle = block.color;
      this.ctx.globalAlpha = 0.5;
      this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

      this.ctx.strokeStyle = block.color;
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.8;
      this.ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
    }

    this.ctx.restore();
  }
}
