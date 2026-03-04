import type { ViewType, Vector3D, Dimensions } from '../../types';
import { editorStateManager } from '../EditorStateManager';
import { projectManager } from '../ProjectManager';

/**
 * Canvas2DViewport - Manages viewport state and coordinate conversions
 *
 * Responsibilities:
 * - Zoom level management
 * - Pan offset management
 * - Coordinate conversions (pixel ↔ grid ↔ world)
 * - Grid dimensions calculation
 *
 * This class is pure logic with no rendering or DOM interaction.
 */
export class Canvas2DViewport {
  private zoom = 1.0;
  private pan = { x: 0, y: 0 };
  private canvasWidth: number;
  private canvasHeight: number;

  private readonly BASE_CELL_SIZE = 20;
  private readonly MIN_ZOOM = 0.25;
  private readonly MAX_ZOOM = 4.0;

  constructor(
    private viewType: ViewType,
    canvasWidth: number,
    canvasHeight: number
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.initializePan();
  }

  /**
   * Update canvas dimensions (on resize)
   */
  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initializePan();
  }

  /**
   * Update view type
   */
  setViewType(viewType: ViewType): void {
    this.viewType = viewType;
    this.initializePan();
  }

  /**
   * Initialize pan to center the grid
   */
  private initializePan(): void {
    const project = projectManager.getProject();
    if (!project) return;

    const { gridWidth, gridHeight } = this.getGridDimensions(project.dimensions);
    const gridPixelWidth = gridWidth * this.BASE_CELL_SIZE;
    const gridPixelHeight = gridHeight * this.BASE_CELL_SIZE;

    this.pan.x = (this.canvasWidth - gridPixelWidth) / 2;
    this.pan.y = (this.canvasHeight - gridPixelHeight) / 2;
  }

  /**
   * Get grid dimensions for current view
   */
  getGridDimensions(dimensions: Dimensions): { gridWidth: number; gridHeight: number } {
    switch (this.viewType) {
      case 'front':
      case 'back':
        return { gridWidth: dimensions.width, gridHeight: dimensions.depth };
      case 'left':
      case 'right':
        return { gridWidth: dimensions.height, gridHeight: dimensions.depth };
      case 'top':
      case 'bottom':
        return { gridWidth: dimensions.width, gridHeight: dimensions.height };
    }
  }

  /**
   * Convert pixel coordinates to grid coordinates
   */
  pixelToGrid(pixelX: number, pixelY: number): { gridX: number; gridY: number } | null {
    const project = projectManager.getProject();
    if (!project) return null;

    const { gridWidth, gridHeight } = this.getGridDimensions(project.dimensions);
    const cellSize = this.BASE_CELL_SIZE * this.zoom;

    const gridX = Math.floor((pixelX - this.pan.x) / cellSize);
    const gridY = Math.floor((pixelY - this.pan.y) / cellSize);

    if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
      return null;
    }

    return { gridX, gridY };
  }

  /**
   * Convert grid coordinates to 3D world position
   */
  gridToPosition(gridX: number, gridY: number): Vector3D {
    const activeLayers = editorStateManager.getActiveLayers();
    const project = projectManager.getProject();
    if (!project) return { x: 0, y: 0, z: 0 };

    switch (this.viewType) {
      case 'front':
      case 'back':
        return { x: gridX, y: activeLayers.y, z: project.dimensions.depth - 1 - gridY };
      case 'left':
      case 'right':
        return { x: activeLayers.x, y: gridX, z: project.dimensions.depth - 1 - gridY };
      case 'top':
      case 'bottom':
        return { x: gridX, y: project.dimensions.height - 1 - gridY, z: activeLayers.z };
    }
  }

  /**
   * Convert 3D world position to grid coordinates (for rendering)
   */
  positionToGrid(position: Vector3D): { gridX: number; gridY: number } {
    const project = projectManager.getProject();
    if (!project) return { gridX: 0, gridY: 0 };

    switch (this.viewType) {
      case 'front':
      case 'back':
        return { gridX: position.x, gridY: project.dimensions.depth - 1 - position.z };
      case 'left':
      case 'right':
        return { gridX: position.y, gridY: project.dimensions.depth - 1 - position.z };
      case 'top':
      case 'bottom':
        return { gridX: position.x, gridY: project.dimensions.height - 1 - position.y };
    }
  }

  /**
   * Apply zoom centered on a point
   */
  applyZoom(delta: number, centerX: number, centerY: number): boolean {
    const oldZoom = this.zoom;
    const newZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, oldZoom + delta));

    if (Math.abs(newZoom - oldZoom) < 0.001) return false;

    // Get center point in canvas space before zoom
    const beforeX = (centerX - this.pan.x) / oldZoom;
    const beforeY = (centerY - this.pan.y) / oldZoom;

    this.zoom = newZoom;

    // Get center point in canvas space after zoom
    const afterX = (centerX - this.pan.x) / newZoom;
    const afterY = (centerY - this.pan.y) / newZoom;

    // Adjust pan to keep center point stable
    this.pan.x += (afterX - beforeX) * newZoom;
    this.pan.y += (afterY - beforeY) * newZoom;

    return true;
  }

  /**
   * Apply pan offset
   */
  applyPan(deltaX: number, deltaY: number): void {
    this.pan.x += deltaX;
    this.pan.y += deltaY;
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
   * Get base cell size
   */
  getBaseCellSize(): number {
    return this.BASE_CELL_SIZE;
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
}
