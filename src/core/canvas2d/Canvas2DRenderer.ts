import type { Dimensions } from "../../types";
import type { CanvasColors, ColorScheme } from "../../config/colorSchemes";
import { CANVAS_COLORS } from "../../config/colorSchemes";
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

/**
 * Canvas2DRenderer - Draws one frame of a 2D view
 *
 * Block data arrives already resolved to grid cells (see Canvas2D), so this class converts no coordinates.
 * The draw order is the stacking order: later phases paint over earlier ones.
 */
export class Canvas2DRenderer {
  private colors: CanvasColors;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private canvas: HTMLCanvasElement,
    scheme: ColorScheme,
  ) {
    this.colors = CANVAS_COLORS[scheme];
  }

  setColorScheme(scheme: ColorScheme): void {
    this.colors = CANVAS_COLORS[scheme];
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

    drawLayerIndicators(this.ctx, viewState, dimensions, activeLayers, this.colors);

    if (previewData?.guide) {
      GuideGeometryRenderer.draw(
        this.ctx,
        previewData.guide,
        viewState,
        dimensions,
        cellSize,
        pan,
        this.colors,
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
