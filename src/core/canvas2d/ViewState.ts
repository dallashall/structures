import type { ViewType, Vector3D, Dimensions, LayerState } from "../../types";
import { editorState } from "../EditorState";
import { projectView } from "../../projections/ProjectView";
import { CoordinateConverter } from "../painting/CoordinateConverter";

/**
 * ViewState - Manages viewport state and coordinate conversions for a 2D canvas
 *
 * Responsibilities:
 * - Zoom level management
 * - Pan offset management
 * - Coordinate conversions (pixel → grid → model)
 * - Grid dimensions calculation
 *
 * Pure logic with no rendering or DOM interaction.
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

  /**
   * Update canvas dimensions (on resize)
   */
  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.fitIfUnadjusted();
  }

  /**
   * Re-fit the grid unless the user has zoomed or panned
   */
  fitIfUnadjusted(): void {
    if (!this.isUserAdjusted) this.fitToCanvas();
  }

  /**
   * Zoom so the whole grid fits inside the canvas, then center it
   */
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

  /**
   * Get grid dimensions for current view
   */
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
   * Convert pixel coordinates to grid coordinates
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
   * Convert grid coordinates to 3D model position
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

  /**
   * Convert 3D model position to grid coordinates
   */
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

  /**
   * Apply pan offset
   */
  applyPan(deltaX: number, deltaY: number): void {
    this.pan.x += deltaX;
    this.pan.y += deltaY;
    this.isUserAdjusted = true;
  }

  /**
   * Get current zoom level
   */
  getZoom(): number {
    return this.zoom;
  }

  /**
   * Get current pan offset
   */
  getPan(): { x: number; y: number } {
    return { ...this.pan };
  }

  /**
   * Get current cell size (base * zoom)
   */
  getCellSize(): number {
    return this.BASE_CELL_SIZE * this.zoom;
  }

  /**
   * Get view type
   */
  getViewType(): ViewType {
    return this.viewType;
  }

  /**
   * Get axis labels for current view
   */
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
   * Convert layer value to grid position for a given axis
   * Returns null if the axis is the depth axis (not visible in this view)
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

  /**
   * Calculate distance from a 3D position to the active layer
   */
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
