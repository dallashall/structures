import type { ViewType, Vector3D, Dimensions, LayerState } from "../../types";
import { editorState } from "../EditorState";
import { projectView } from "../../projections/ProjectView";
import { CoordinateConverter } from "../painting/CoordinateConverter";

/**
 * ViewState - Zoom, pan, and pixel → grid → model conversion for one 2D view
 *
 * Model x spans dimensions.width, y spans dimensions.height, and z spans dimensions.depth. Z points up.
 * Grid rows count down from the top of the canvas, so a vertical model axis flips: row 0 holds its highest layer.
 */
export class ViewState {
  private zoom = 1.0;
  private fitZoom = 1.0;
  private pan = { x: 0, y: 0 };
  private canvasWidth: number;
  private canvasHeight: number;
  // Set once the user zooms or pans. Until then the grid re-fits on resize and dimension changes.
  private isUserAdjusted = false;

  private readonly BASE_CELL_SIZE = 20;
  private readonly MIN_ZOOM = 0.25;
  private readonly MAX_ZOOM = 4.0;
  // Pixels kept clear on each side for the view label, layer badge, and axis gizmo
  private readonly FIT_PADDING = 40;

  constructor(
    private viewType: ViewType,
    canvasWidth: number,
    canvasHeight: number,
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.fitToCanvas();
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.fitIfUnadjusted();
  }

  fitIfUnadjusted(): void {
    if (!this.isUserAdjusted) this.fitToCanvas();
  }

  private fitToCanvas(): void {
    const project = projectView.getCached();
    if (!project) return;

    const { gridWidth, gridHeight } = this.getGridDimensions(
      project.dimensions,
    );
    const availableWidth = this.canvasWidth - this.FIT_PADDING * 2;
    const availableHeight = this.canvasHeight - this.FIT_PADDING * 2;
    if (availableWidth <= 0 || availableHeight <= 0) return;

    const fitCellSize = Math.min(
      availableWidth / gridWidth,
      availableHeight / gridHeight,
    );
    this.fitZoom = Math.min(this.MAX_ZOOM, fitCellSize / this.BASE_CELL_SIZE);
    this.zoom = this.fitZoom;

    const cellSize = this.getCellSize();
    this.pan.x = (this.canvasWidth - gridWidth * cellSize) / 2;
    this.pan.y = (this.canvasHeight - gridHeight * cellSize) / 2;
  }

  getGridDimensions(dimensions: Dimensions): {
    gridWidth: number;
    gridHeight: number;
  } {
    switch (this.viewType) {
      case "front":
      case "back":
        return { gridWidth: dimensions.width, gridHeight: dimensions.depth };
      case "left":
      case "right":
        return { gridWidth: dimensions.height, gridHeight: dimensions.depth };
      case "top":
      case "bottom":
        return { gridWidth: dimensions.width, gridHeight: dimensions.height };
    }
  }

  /**
   * Null when the pixel lies outside the grid
   */
  pixelToGrid(
    pixelX: number,
    pixelY: number,
  ): { gridX: number; gridY: number } | null {
    const project = projectView.getCached();
    if (!project) return null;

    const { gridWidth, gridHeight } = this.getGridDimensions(
      project.dimensions,
    );
    const cellSize = this.BASE_CELL_SIZE * this.zoom;

    const gridX = Math.floor((pixelX - this.pan.x) / cellSize);
    const gridY = Math.floor((pixelY - this.pan.y) / cellSize);

    if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
      return null;
    }

    return { gridX, gridY };
  }

  /**
   * The view's depth axis takes the active layer
   */
  gridToModel(gridX: number, gridY: number): Vector3D {
    const activeLayers = editorState.getActiveLayers();
    const project = projectView.getCached();
    if (!project) return { x: 0, y: 0, z: 0 };

    return CoordinateConverter.gridToPosition(
      gridX,
      gridY,
      this.viewType,
      activeLayers,
      project.dimensions,
    );
  }

  modelToGrid(
    position: Vector3D,
    dimensions: Dimensions,
  ): { gridX: number; gridY: number } {
    return (
      CoordinateConverter.positionToGrid(
        position,
        this.viewType,
        dimensions,
      ) || { gridX: 0, gridY: 0 }
    );
  }

  /**
   * Multiply zoom by a factor, keeping the point under (centerX, centerY) fixed.
   * The lower bound drops below MIN_ZOOM when a large grid needs it to fit.
   */
  applyZoom(factor: number, centerX: number, centerY: number): boolean {
    const oldZoom = this.zoom;
    const minZoom = Math.min(this.MIN_ZOOM, this.fitZoom);
    const newZoom = Math.max(minZoom, Math.min(this.MAX_ZOOM, oldZoom * factor));

    if (Math.abs(newZoom - oldZoom) < 0.001) return false;

    const scale = newZoom / oldZoom;
    this.pan.x = centerX - (centerX - this.pan.x) * scale;
    this.pan.y = centerY - (centerY - this.pan.y) * scale;
    this.zoom = newZoom;
    this.isUserAdjusted = true;

    return true;
  }

  applyPan(deltaX: number, deltaY: number): void {
    this.pan.x += deltaX;
    this.pan.y += deltaY;
    this.isUserAdjusted = true;
  }

  getZoom(): number {
    return this.zoom;
  }

  getPan(): { x: number; y: number } {
    return { ...this.pan };
  }

  getCellSize(): number {
    return this.BASE_CELL_SIZE * this.zoom;
  }

  getViewType(): ViewType {
    return this.viewType;
  }

  getAxesForView(): { horizontal: string; vertical: string; depth: string } {
    switch (this.viewType) {
      case "front":
      case "back":
        return { horizontal: "X", vertical: "Z", depth: "Y" };
      case "left":
      case "right":
        return { horizontal: "Y", vertical: "Z", depth: "X" };
      case "top":
      case "bottom":
        return { horizontal: "X", vertical: "Y", depth: "Z" };
    }
  }

  /**
   * The grid row or column where `axis` reaches `layerValue`. Null for the view's depth axis, which has no line.
   */
  getGridPositionForLayer(
    axis: string,
    layerValue: number,
    dimensions: Dimensions,
  ): number | null {
    switch (this.viewType) {
      case "front":
      case "back":
        if (axis === "X") return layerValue;
        if (axis === "Z") return dimensions.depth - 1 - layerValue;
        return null;
      case "left":
      case "right":
        if (axis === "Y") return layerValue;
        if (axis === "Z") return dimensions.depth - 1 - layerValue;
        return null;
      case "top":
      case "bottom":
        if (axis === "X") return layerValue;
        if (axis === "Y") return dimensions.height - 1 - layerValue;
        return null;
      default:
        return null;
    }
  }

  getLayerDistance(
    position: Vector3D,
    activeLayers: LayerState,
  ): number {
    switch (this.viewType) {
      case "front":
      case "back":
        return Math.abs(position.y - activeLayers.y);
      case "left":
      case "right":
        return Math.abs(position.x - activeLayers.x);
      case "top":
      case "bottom":
        return Math.abs(position.z - activeLayers.z);
    }
  }
}
