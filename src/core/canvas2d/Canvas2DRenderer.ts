import type { Dimensions } from "../../types";
import { projectView } from "../../projections/ProjectView";
import { editorState } from "../EditorState";
import type { ViewState } from "./ViewState";
import type { PreviewData } from "../tools/ToolBase";
import type { GridBlock } from "./GridBlock";
import { GuideGeometryRenderer } from "./GuideGeometryRenderer";
import { drawGrid, drawGridOverlay } from "./drawGrid";
import { drawPersistentBlocks, SOLID_COLOR_BELOW_PX } from "./drawBlocks";
import { drawCoordinateAxes, drawLayerIndicators, drawMetaBlock } from "./drawOverlays";
import { drawSharedPreview, drawToolPreview } from "./drawPreview";

export interface Canvas2DColorConfig {
  grid: string;
  axisX: string;
  axisY: string;
  axisZ: string;
  axisLabel: string;
  metaBlockBorder: string;
  metaBlockFill: string;
  metaBlockArrow: string;
  layerIndicator: string;
  textSecondary: string;
}

const DARK_MODE_COLORS: Canvas2DColorConfig = {
  grid: "#444444",
  axisX: "#e74c3c",
  axisY: "#3498db",
  axisZ: "#27ae60",
  axisLabel: "#a0a0a0",
  metaBlockBorder: "#4CAF50",
  metaBlockFill: "#e0e0e0",
  metaBlockArrow: "#1a1a1a",
  layerIndicator: "#666666",
  textSecondary: "#888888",
};

/**
 * Canvas2DRenderer - Draws one frame of a 2D view
 *
 * Block data arrives already resolved to grid cells (see Canvas2D), so this class converts no coordinates.
 * The draw order is the stacking order: later phases paint over earlier ones.
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

    this.ctx.clearRect(0, 0, width, height);

    drawGrid(this.ctx, gridWidth, gridHeight, cellSize, pan, this.colors);

    drawPersistentBlocks(this.ctx, persistentBlocks, cellSize, pan, viewType);

    if (cellSize < SOLID_COLOR_BELOW_PX) {
      drawGridOverlay(this.ctx, gridWidth, gridHeight, cellSize, pan);
    }

    // The meta block is one cell, so it converts its own position instead of arriving pre-resolved
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

    drawCoordinateAxes(this.ctx, viewState, height, this.colors);

    drawLayerIndicators(this.ctx, viewState, dimensions, activeLayers);

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
