import type { Dimensions } from "../../types";
import { projectView } from "../../projections/ProjectView";
import { editorState } from "../EditorState";
import type { ViewState } from "./ViewState";
import type { PreviewData } from "../tools/ToolBase";
import type { GridBlock } from "./GridBlock";
import { GuideGeometryRenderer } from "./GuideGeometryRenderer";
import { drawGrid } from "./drawGrid";
import { drawPersistentBlocks } from "./drawBlocks";
import { drawCoordinateAxes, drawLayerIndicators, drawMetaBlock } from "./drawOverlays";
import { drawSharedPreview, drawToolPreview } from "./drawPreview";

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
const DARK_MODE_COLORS: Canvas2DColorConfig = {
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
 * Canvas2DRenderer - Compositor for 2D canvas rendering
 *
 * Orchestrates drawing phases by calling focused drawing functions.
 * Receives only pre-resolved GridBlock[] data — zero coordinate conversions.
 *
 * Drawing order:
 * 1. Grid lines
 * 2. Persistent blocks (pre-resolved)
 * 3. Meta block
 * 4. Coordinate axes legend
 * 5. Layer indicators
 * 6. Guide geometry (tool control points/lines)
 * 7. Shared preview (draft + editor, pre-resolved)
 * 8. Tool preview (hover highlight, uses UniversalPosition)
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
   * Main render method — composes all drawing phases.
   *
   * All block data arrives pre-resolved to grid coordinates.
   * The renderer does zero model→grid conversions.
   */
  render(
    viewState: ViewState,
    previewData: PreviewData | null,
    persistentBlocks: GridBlock[],
    draftBlocks: GridBlock[],
    editorPreview: GridBlock[],
  ): void {
    const project = projectView.getCached();
    if (!project) return;

    const { width, height } = this.canvas;
    const dimensions: Dimensions = project.dimensions;
    const { gridWidth, gridHeight } = viewState.getGridDimensions(dimensions);
    const activeLayers = editorState.getActiveLayers();
    const cellSize = viewState.getCellSize();
    const pan = viewState.getPan();
    const viewType = viewState.getViewType();

    // Clear
    this.ctx.clearRect(0, 0, width, height);

    // 1. Grid
    drawGrid(this.ctx, gridWidth, gridHeight, cellSize, pan, this.colors);

    // 2. Persistent blocks
    drawPersistentBlocks(this.ctx, persistentBlocks, cellSize, pan, viewType);

    // 3. Meta block (single block, left as direct render — negligible cost)
    drawMetaBlock(
      this.ctx,
      project.metaBlock ?? null,
      viewState,
      dimensions,
      activeLayers,
      cellSize,
      pan,
      this.colors,
    );

    // 4. Coordinate axes
    drawCoordinateAxes(this.ctx, viewState, height, this.colors);

    // 5. Layer indicators
    drawLayerIndicators(this.ctx, viewState, dimensions, activeLayers);

    // 6. Guide geometry
    if (previewData?.guide) {
      GuideGeometryRenderer.draw(
        this.ctx,
        previewData.guide,
        viewState,
        dimensions,
        cellSize,
        pan,
      );
    }

    // 7. Shared preview (draft + editor)
    const deleteMode = editorState.getDeleteMode();
    drawSharedPreview(
      this.ctx,
      draftBlocks,
      editorPreview,
      cellSize,
      pan,
      deleteMode,
      viewType,
    );

    // 8. Tool preview (hover)
    const selectedBlock = editorState.getSelectedBlock();
    drawToolPreview(
      this.ctx,
      previewData,
      gridWidth,
      gridHeight,
      cellSize,
      pan,
      selectedBlock,
    );
  }
}
