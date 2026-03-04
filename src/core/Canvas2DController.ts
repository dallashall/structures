import { projectManager } from './ProjectManager';
import { blockRegistry } from './BlockRegistry';
import { editorStateManager } from './EditorStateManager';
import { CanvasPainter } from './painting/CanvasPainter';
import { PointPaintStrategy } from './painting/strategies/PointPaintStrategy';
import { FillPaintStrategy } from './painting/strategies/FillPaintStrategy';
import { OutlinePaintStrategy } from './painting/strategies/OutlinePaintStrategy';
import { NormalBehavior } from './painting/behaviors/NormalBehavior';
import { OnlyReplaceBehavior } from './painting/behaviors/OnlyReplaceBehavior';
import { SelectiveReplaceBehavior } from './painting/behaviors/SelectiveReplaceBehavior';
import type { ViewType, Vector3D, Dimensions, Direction, PaintMode, PaintBehavior } from '../types';

/**
 * Canvas2DController - Pure TypeScript canvas controller
 *
 * Handles all rendering, zoom/pan, and user interactions for 2D canvas.
 * No React - just DOM and singletons.
 */
// Global registry of active controllers for meta block confirmation
const activeControllers = new Set<Canvas2DController>();

export class Canvas2DController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private viewType: ViewType;

  // Zoom and pan state
  private zoom = 1.0;
  private pan = { x: 0, y: 0 };

  // Interaction state
  private isDraggingPan = false;
  private isPainting = false;
  private isErasing = false;
  private lastMousePos = { x: 0, y: 0 };
  private lastPaintedCell: string | null = null;
  private spacebarHeld = false;
  private shiftHeld = false;
  private lastZoomTime = 0;
  private isPlacementMode = false;

  // Outline mode preview state
  private outlinePreviewStart: { gridX: number; gridY: number } | null = null;
  private outlinePreviewEnd: { gridX: number; gridY: number } | null = null;

  // Point mode preview state (tracks current hover position during drag)
  private paintPreviewCell: { gridX: number; gridY: number } | null = null;

  // Fill/point preview state (for Alt key preview)
  private previewKeyHeld = false;
  private lastMouseGridPos: { gridX: number; gridY: number } | null = null;

  // Painting orchestrator
  private canvasPainter: CanvasPainter;

  // Bound event handlers (for cleanup)
  private boundHandlers = {
    wheel: this.handleWheel.bind(this),
    mouseDown: this.handleMouseDown.bind(this),
    mouseMove: this.handleMouseMove.bind(this),
    mouseUp: this.handleMouseUp.bind(this),
    mouseLeave: this.handleMouseLeave.bind(this),
    keyDown: this.handleKeyDown.bind(this),
    keyUp: this.handleKeyUp.bind(this),
    projectChanged: this.render.bind(this),
    editorChanged: this.render.bind(this),
    paintModeChanged: this.handlePaintModeChanged.bind(this),
    paintBehaviorChanged: this.handlePaintBehaviorChanged.bind(this),
  };

  constructor(canvas: HTMLCanvasElement, viewType: ViewType) {
    this.canvas = canvas;
    this.viewType = viewType;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    // Register this controller globally
    activeControllers.add(this);

    // Initialize painting system
    const initialStrategy = this.createStrategyForMode(editorStateManager.getPaintMode());
    const initialBehavior = this.createBehaviorForType(editorStateManager.getPaintBehavior());
    this.canvasPainter = new CanvasPainter(initialStrategy, initialBehavior);

    // Initialize pan to center grid
    this.initializePan();

    // Subscribe to singleton events
    projectManager.on('project:changed', this.boundHandlers.projectChanged);
    projectManager.on('block:added', this.boundHandlers.projectChanged);
    projectManager.on('block:removed', this.boundHandlers.projectChanged);
    editorStateManager.on('block:selected', this.boundHandlers.editorChanged);
    editorStateManager.on('layer:changed', this.boundHandlers.editorChanged);
    editorStateManager.on('paintmode:changed', this.boundHandlers.paintModeChanged);
    editorStateManager.on('paintbehavior:changed', this.boundHandlers.paintBehaviorChanged);

    // Add DOM event listeners
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
    this.canvas.addEventListener('mousedown', this.boundHandlers.mouseDown);
    this.canvas.addEventListener('mousemove', this.boundHandlers.mouseMove);
    this.canvas.addEventListener('mouseup', this.boundHandlers.mouseUp);
    this.canvas.addEventListener('mouseleave', this.boundHandlers.mouseLeave);
    window.addEventListener('keydown', this.boundHandlers.keyDown);
    window.addEventListener('keyup', this.boundHandlers.keyUp);

    // Initial render
    this.render();
  }

  destroy(): void {
    // Unregister this controller
    activeControllers.delete(this);

    // Unsubscribe from singleton events
    projectManager.off('project:changed', this.boundHandlers.projectChanged);
    projectManager.off('block:added', this.boundHandlers.projectChanged);
    projectManager.off('block:removed', this.boundHandlers.projectChanged);
    editorStateManager.off('block:selected', this.boundHandlers.editorChanged);
    editorStateManager.off('layer:changed', this.boundHandlers.editorChanged);
    editorStateManager.off('paintmode:changed', this.boundHandlers.paintModeChanged);
    editorStateManager.off('paintbehavior:changed', this.boundHandlers.paintBehaviorChanged);

    // Remove DOM event listeners
    this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
    this.canvas.removeEventListener('mousedown', this.boundHandlers.mouseDown);
    this.canvas.removeEventListener('mousemove', this.boundHandlers.mouseMove);
    this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseUp);
    this.canvas.removeEventListener('mouseleave', this.boundHandlers.mouseLeave);
    window.removeEventListener('keydown', this.boundHandlers.keyDown);
    window.removeEventListener('keyup', this.boundHandlers.keyUp);
  }

  setViewType(viewType: ViewType): void {
    this.viewType = viewType;
    this.initializePan();
    this.render();
  }

  setPlacementMode(isPlacementMode: boolean): void {
    this.isPlacementMode = isPlacementMode;
    this.updateCursor();
    this.render();
  }

  static confirmAllPlacements(): void {
    // Mark the meta block as confirmed
    projectManager.confirmMetaBlock();

    // Update all controllers - exit placement mode
    activeControllers.forEach((controller) => {
      controller.isPlacementMode = false;
      controller.updateCursor();
      controller.render();
    });
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.initializePan();
    this.render();
  }

  private initializePan(): void {
    const project = projectManager.getProject();
    if (!project) return;

    const { gridWidth, gridHeight } = this.getGridDimensions(project.dimensions);
    const BASE_CELL_SIZE = 20;
    const gridPixelWidth = gridWidth * BASE_CELL_SIZE;
    const gridPixelHeight = gridHeight * BASE_CELL_SIZE;

    this.pan.x = (this.canvas.width - gridPixelWidth) / 2;
    this.pan.y = (this.canvas.height - gridPixelHeight) / 2;
  }

  private getGridDimensions(dimensions: Dimensions): { gridWidth: number; gridHeight: number } {
    // Z-up coordinate system:
    // X = East/West (width), Y = North/South (height), Z = Up/Down (depth)
    switch (this.viewType) {
      case 'front':
      case 'back':
        // Looking North/South: see X (width) and Z (depth for up/down)
        return { gridWidth: dimensions.width, gridHeight: dimensions.depth };
      case 'left':
      case 'right':
        // Looking East/West: see Y (height for north/south) and Z (depth for up/down)
        return { gridWidth: dimensions.height, gridHeight: dimensions.depth };
      case 'top':
      case 'bottom':
        // Looking Down/Up: see X (width) and Y (height for north/south)
        return { gridWidth: dimensions.width, gridHeight: dimensions.height };
      default:
        return { gridWidth: 16, gridHeight: 16 };
    }
  }

  private render(): void {
    const project = projectManager.getProject();
    if (!project) return;

    const { width, height } = this.canvas;
    const { gridWidth, gridHeight } = this.getGridDimensions(project.dimensions);
    const activeLayers = editorStateManager.getActiveLayers();

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Calculate cell size
    const BASE_CELL_SIZE = 20;
    const cellSize = BASE_CELL_SIZE * this.zoom;

    // Apply pan offset
    const offsetX = this.pan.x;
    const offsetY = this.pan.y;

    // Draw grid
    this.ctx.strokeStyle = '#cccccc';
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= gridWidth; x++) {
      const px = offsetX + x * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(px, offsetY);
      this.ctx.lineTo(px, offsetY + gridHeight * cellSize);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= gridHeight; y++) {
      const py = offsetY + y * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX, py);
      this.ctx.lineTo(offsetX + gridWidth * cellSize, py);
      this.ctx.stroke();
    }

    // Draw blocks
    project.blocks.forEach((blockData) => {
      const { gridX, gridY } = this.projectToGrid(blockData.position, activeLayers);

      // Check bounds
      if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
        return;
      }

      // Calculate layer distance and opacity
      const distance = this.getLayerDistance(blockData.position, activeLayers);
      const opacity = this.getOpacityForDistance(distance);

      // Don't render if 3+ layers away
      if (opacity === 0.0) return;

      // Get block color
      const block = blockRegistry.getBlock(blockData.blockType);
      if (!block) return;

      // Draw block
      const px = offsetX + gridX * cellSize;
      const py = offsetY + gridY * cellSize;

      this.ctx.fillStyle = block.color;
      this.ctx.globalAlpha = opacity;
      this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      this.ctx.globalAlpha = 1.0;
    });

    // Draw meta block
    const metaBlock = project.metaBlock;
    if (metaBlock) {
      const distance = this.getLayerDistance(metaBlock.position, activeLayers);
      const opacity = this.getOpacityForDistance(distance);

      // Don't render if 3+ layers away
      if (opacity > 0.0) {
        const { gridX, gridY } = this.projectToGrid(metaBlock.position, activeLayers);

        if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
          const px = offsetX + gridX * cellSize;
          const py = offsetY + gridY * cellSize;
          const centerX = px + cellSize / 2;
          const centerY = py + cellSize / 2;

          // Determine rendering style based on confirmation status
          const isConfirmed = metaBlock.isConfirmed;
          const strokeColor = isConfirmed ? '#000000' : '#4CAF50'; // Black = confirmed, Green = unconfirmed
          const strokeWidth = isConfirmed ? 2 : 3;
          const fillOpacity = isConfirmed ? opacity : opacity * 0.7;

          // Draw white background
          this.ctx.fillStyle = '#ffffff';
          this.ctx.globalAlpha = fillOpacity;
          this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

          // Draw border
          this.ctx.strokeStyle = strokeColor;
          this.ctx.lineWidth = strokeWidth;
          this.ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

          // Draw directional arrow
          this.ctx.strokeStyle = strokeColor;
          this.ctx.fillStyle = strokeColor;
          this.drawMetaBlockArrow(centerX, centerY, cellSize, metaBlock.direction);
          this.ctx.globalAlpha = 1.0;
        }
      }
    }

    // Draw coordinate axes legend
    this.drawCoordinateAxes();

    // Draw active layer indicators
    this.drawActiveLayerIndicators();

    // Draw outline preview if dragging
    this.drawOutlinePreview();
  }

  /**
   * Draw coordinate axes legend in bottom-left corner
   *
   * Color scheme (consistent across all views):
   * - Red = X coordinate (width)
   * - Green = Z coordinate (height)
   * - Blue = Y coordinate (depth)
   */
  private drawCoordinateAxes(): void {
    const { height } = this.canvas;
    const padding = 20;
    const arrowLength = 40;
    const arrowHeadSize = 8;

    // Get axes for current view
    const axes = this.getAxesForView();

    // Starting position (bottom-left corner)
    const originX = padding;
    const originY = height - padding;

    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.font = 'bold 14px sans-serif';

    // Draw horizontal axis (right)
    const hColor = this.getColorForAxis(axes.horizontal);
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

    // Draw vertical axis (up)
    const vColor = this.getColorForAxis(axes.vertical);
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

    // Draw depth indicator (circle with label)
    const depthX = originX + arrowLength + 60;
    const depthY = originY;
    const dColor = this.getColorForAxis(axes.depth);
    this.ctx.strokeStyle = dColor;
    this.ctx.fillStyle = dColor;
    this.ctx.beginPath();
    this.ctx.arc(depthX, depthY, 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillText(axes.depth, depthX + 12, depthY + 5);
    this.ctx.fillStyle = '#666';
    this.ctx.font = '12px sans-serif';
    this.ctx.fillText('(depth)', depthX + 12, depthY + 18);

    this.ctx.restore();
  }

  /**
   * Draw active layer indicators showing where other slices intersect this view
   * Shows colored lines on the edges and labels
   */
  private drawActiveLayerIndicators(): void {
    const project = projectManager.getProject();
    if (!project) return;
    const { gridWidth, gridHeight } = this.getGridDimensions(project.dimensions);
    const activeLayers = editorStateManager.getActiveLayers();
    const BASE_CELL_SIZE = 20;
    const cellSize = BASE_CELL_SIZE * this.zoom;
    const offsetX = this.pan.x;
    const offsetY = this.pan.y;

    this.ctx.save();

    // Get which axes are visible in this view
    const axes = this.getAxesForView();

    // Draw horizontal layer indicator (if not the depth axis)
    if (axes.vertical !== axes.depth) {
      const axisName = axes.vertical;
      const layerValue = this.getLayerForAxis(axisName, activeLayers);
      const color = this.getColorForAxis(axisName);

      // Calculate grid position for this layer
      const gridPos = this.getGridPositionForLayer(axisName, layerValue, project.dimensions);
      if (gridPos !== null && gridPos >= 0 && gridPos < gridHeight) {
        const py = offsetY + gridPos * cellSize;
        const gridLeft = offsetX;
        const gridRight = offsetX + gridWidth * cellSize;

        // Draw full-width line across the grid
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(gridLeft, py);
        this.ctx.lineTo(gridRight, py);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;

        // Draw thicker markers on both left and right edges
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(gridLeft - 2, py);
        this.ctx.lineTo(gridLeft, py);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(gridRight, py);
        this.ctx.lineTo(gridRight + 2, py);
        this.ctx.stroke();

        // Draw labels on both sides
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${axisName}: ${layerValue}`, gridLeft - 8, py - 6);
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${axisName}: ${layerValue}`, gridRight + 8, py - 6);
      }
    }

    // Draw vertical layer indicator (if not the depth axis)
    if (axes.horizontal !== axes.depth) {
      const axisName = axes.horizontal;
      const layerValue = this.getLayerForAxis(axisName, activeLayers);
      const color = this.getColorForAxis(axisName);

      // Calculate grid position for this layer
      const gridPos = this.getGridPositionForLayer(axisName, layerValue, project.dimensions);
      if (gridPos !== null && gridPos >= 0 && gridPos < gridWidth) {
        const px = offsetX + gridPos * cellSize;
        const gridTop = offsetY;
        const gridBottom = offsetY + gridHeight * cellSize;

        // Draw full-height line across the grid
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(px, gridTop);
        this.ctx.lineTo(px, gridBottom);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;

        // Draw thicker markers on both top and bottom edges
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(px, gridTop - 2);
        this.ctx.lineTo(px, gridTop);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(px, gridBottom);
        this.ctx.lineTo(px, gridBottom + 2);
        this.ctx.stroke();

        // Draw labels on both top and bottom
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
   * Get the layer value for a specific axis name
   */
  private getLayerForAxis(axis: string, activeLayers: { x: number; y: number; z: number }): number {
    switch (axis) {
      case 'X':
        return activeLayers.x;
      case 'Y':
        return activeLayers.y;
      case 'Z':
        return activeLayers.z;
      default:
        return 0;
    }
  }

  /**
   * Draw preview visualization while dragging
   * Shows semi-transparent blocks for outline/point mode before placement
   */
  private drawOutlinePreview(): void {
    const selectedBlock = editorStateManager.getSelectedBlock();
    if (!selectedBlock) return;

    const block = blockRegistry.getBlock(selectedBlock);
    if (!block) return;

    const project = projectManager.getProject();
    if (!project) return;

    const { gridWidth, gridHeight } = this.getGridDimensions(project.dimensions);
    const BASE_CELL_SIZE = 20;
    const cellSize = BASE_CELL_SIZE * this.zoom;
    const offsetX = this.pan.x;
    const offsetY = this.pan.y;

    this.ctx.save();
    this.ctx.globalAlpha = 0.5; // Semi-transparent preview

    // Outline mode preview
    if (this.outlinePreviewStart && this.outlinePreviewEnd) {
      const minX = Math.min(this.outlinePreviewStart.gridX, this.outlinePreviewEnd.gridX);
      const maxX = Math.max(this.outlinePreviewStart.gridX, this.outlinePreviewEnd.gridX);
      const minY = Math.min(this.outlinePreviewStart.gridY, this.outlinePreviewEnd.gridY);
      const maxY = Math.max(this.outlinePreviewStart.gridY, this.outlinePreviewEnd.gridY);

      // Draw outline rectangle preview
      this.ctx.fillStyle = block.color;

      // Top edge
      for (let x = minX; x <= maxX; x++) {
        if (x >= 0 && x < gridWidth && minY >= 0 && minY < gridHeight) {
          const px = offsetX + x * cellSize;
          const py = offsetY + minY * cellSize;
          this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        }
      }

      // Bottom edge
      for (let x = minX; x <= maxX; x++) {
        if (x >= 0 && x < gridWidth && maxY >= 0 && maxY < gridHeight) {
          const px = offsetX + x * cellSize;
          const py = offsetY + maxY * cellSize;
          this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        }
      }

      // Left edge (excluding corners to avoid double-draw)
      for (let y = minY + 1; y < maxY; y++) {
        if (minX >= 0 && minX < gridWidth && y >= 0 && y < gridHeight) {
          const px = offsetX + minX * cellSize;
          const py = offsetY + y * cellSize;
          this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        }
      }

      // Right edge (excluding corners)
      for (let y = minY + 1; y < maxY; y++) {
        if (maxX >= 0 && maxX < gridWidth && y >= 0 && y < gridHeight) {
          const px = offsetX + maxX * cellSize;
          const py = offsetY + y * cellSize;
          this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        }
      }

      // Draw dashed rectangle guide
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeStyle = block.color;
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.7;
      const rectX = offsetX + minX * cellSize;
      const rectY = offsetY + minY * cellSize;
      const rectWidth = (maxX - minX + 1) * cellSize;
      const rectHeight = (maxY - minY + 1) * cellSize;
      this.ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
      this.ctx.setLineDash([]);
    }

    // Point mode preview (hover cell during drag)
    if (this.paintPreviewCell && this.isPainting) {
      const { gridX, gridY } = this.paintPreviewCell;
      if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
        const px = offsetX + gridX * cellSize;
        const py = offsetY + gridY * cellSize;

        this.ctx.fillStyle = block.color;
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

        // Draw highlight border
        this.ctx.strokeStyle = block.color;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.8;
        this.ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
      }
    }

    this.ctx.restore();
  }

  /**
   * Get the grid position for a layer on a specific axis
   * Returns the grid coordinate in the current view's coordinate system
   */
  private getGridPositionForLayer(
    axis: string,
    layerValue: number,
    dimensions: Dimensions
  ): number | null {
    switch (this.viewType) {
      case 'front':
      case 'back':
        // Grid: X horizontal, Z vertical (inverted)
        if (axis === 'X') return layerValue;
        if (axis === 'Z') return dimensions.depth - 1 - layerValue;
        return null;
      case 'left':
      case 'right':
        // Grid: Y horizontal, Z vertical (inverted)
        if (axis === 'Y') return layerValue;
        if (axis === 'Z') return dimensions.depth - 1 - layerValue;
        return null;
      case 'top':
      case 'bottom':
        // Grid: X horizontal, Y vertical (inverted)
        if (axis === 'X') return layerValue;
        if (axis === 'Y') return dimensions.height - 1 - layerValue;
        return null;
      default:
        return null;
    }
  }

  /**
   * Get color for a coordinate axis
   * Red = X, Green = Z, Blue = Y
   */
  private getColorForAxis(axis: string): string {
    switch (axis) {
      case 'X':
        return '#e74c3c'; // Red - width
      case 'Y':
        return '#3498db'; // Blue - depth
      case 'Z':
        return '#27ae60'; // Green - height
      default:
        return '#000000';
    }
  }

  /**
   * Get axis labels for current view
   */
  private getAxesForView(): { horizontal: string; vertical: string; depth: string } {
    switch (this.viewType) {
      case 'front':
      case 'back':
        return { horizontal: 'X', vertical: 'Z', depth: 'Y' };
      case 'left':
      case 'right':
        return { horizontal: 'Y', vertical: 'Z', depth: 'X' };
      case 'top':
      case 'bottom':
        return { horizontal: 'X', vertical: 'Y', depth: 'Z' };
      default:
        return { horizontal: 'X', vertical: 'Y', depth: 'Z' };
    }
  }

  private drawMetaBlockArrow(
    centerX: number,
    centerY: number,
    cellSize: number,
    direction: Direction
  ): void {
    const arrowSize = Math.min(cellSize * 0.6, 20);
    this.ctx.strokeStyle = '#000000';
    this.ctx.fillStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Determine what to draw based on view type and meta block direction
    const isFacingCamera = this.isMetaBlockFacingCamera(direction);
    const isFacingAway = this.isMetaBlockFacingAway(direction);

    if (isFacingCamera) {
      // Front view: Draw turnaround arrow (circular arrow)
      this.drawTurnaroundArrow(centerX, centerY, arrowSize);
    } else if (isFacingAway) {
      // Back view: Draw arrows pointing inward
      this.drawInwardArrows(centerX, centerY, arrowSize);
    } else {
      // Side/top/bottom views: Draw arrow pointing toward front
      this.drawDirectionalArrow(centerX, centerY, arrowSize, direction);
    }
  }

  private isMetaBlockFacingCamera(direction: Direction): boolean {
    // Z-up coordinate system: X=East/West, Y=North/South, Z=Up/Down
    // When the meta block faces toward the camera, we see its front (turnaround arrow)
    switch (this.viewType) {
      case 'front':
        // Looking North (+Y): meta block faces us if it faces South (-Y)
        return direction === 'south';
      case 'back':
        // Looking South (-Y): meta block faces us if it faces North (+Y)
        return direction === 'north';
      case 'left':
        // Looking East (+X): meta block faces us if it faces West (-X)
        return direction === 'west';
      case 'right':
        // Looking West (-X): meta block faces us if it faces East (+X)
        return direction === 'east';
      default:
        return false;
    }
  }

  private isMetaBlockFacingAway(direction: Direction): boolean {
    // When the meta block faces away from the camera, we see its back (inward arrows)
    switch (this.viewType) {
      case 'front':
        // Looking North (+Y): meta block faces away if it faces North (+Y)
        return direction === 'north';
      case 'back':
        // Looking South (-Y): meta block faces away if it faces South (-Y)
        return direction === 'south';
      case 'left':
        // Looking East (+X): meta block faces away if it faces East (+X)
        return direction === 'east';
      case 'right':
        // Looking West (-X): meta block faces away if it faces West (-X)
        return direction === 'west';
      default:
        return false;
    }
  }

  private drawTurnaroundArrow(centerX: number, centerY: number, size: number): void {
    const radius = size * 0.35;

    // Draw circular arc (270 degrees)
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, -Math.PI * 0.75, Math.PI * 0.75, false);
    this.ctx.stroke();

    // Draw arrowhead at the end
    const endAngle = Math.PI * 0.75;
    const arrowX = centerX + Math.cos(endAngle) * radius;
    const arrowY = centerY + Math.sin(endAngle) * radius;
    const arrowLen = size * 0.2;

    this.ctx.beginPath();
    this.ctx.moveTo(arrowX, arrowY);
    this.ctx.lineTo(
      arrowX - arrowLen * Math.cos(endAngle - Math.PI * 0.3),
      arrowY - arrowLen * Math.sin(endAngle - Math.PI * 0.3)
    );
    this.ctx.moveTo(arrowX, arrowY);
    this.ctx.lineTo(
      arrowX - arrowLen * Math.cos(endAngle + Math.PI * 0.3),
      arrowY - arrowLen * Math.sin(endAngle + Math.PI * 0.3)
    );
    this.ctx.stroke();
  }

  private drawInwardArrows(centerX: number, centerY: number, size: number): void {
    const arrowLen = size * 0.4;
    const arrowHeadLen = size * 0.15;
    const offset = size * 0.15;

    // Draw four arrows pointing inward from edges
    const arrows = [
      { x: centerX, y: centerY - offset, dx: 0, dy: arrowLen }, // Top
      { x: centerX, y: centerY + offset, dx: 0, dy: -arrowLen }, // Bottom
      { x: centerX - offset, y: centerY, dx: arrowLen, dy: 0 }, // Left
      { x: centerX + offset, y: centerY, dx: -arrowLen, dy: 0 }, // Right
    ];

    arrows.forEach((arrow) => {
      const endX = arrow.x + arrow.dx;
      const endY = arrow.y + arrow.dy;

      // Draw arrow line
      this.ctx.beginPath();
      this.ctx.moveTo(arrow.x, arrow.y);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();

      // Draw arrowhead
      const angle = Math.atan2(arrow.dy, arrow.dx);
      this.ctx.beginPath();
      this.ctx.moveTo(endX, endY);
      this.ctx.lineTo(
        endX - arrowHeadLen * Math.cos(angle - Math.PI / 6),
        endY - arrowHeadLen * Math.sin(angle - Math.PI / 6)
      );
      this.ctx.moveTo(endX, endY);
      this.ctx.lineTo(
        endX - arrowHeadLen * Math.cos(angle + Math.PI / 6),
        endY - arrowHeadLen * Math.sin(angle + Math.PI / 6)
      );
      this.ctx.stroke();
    });
  }

  private drawDirectionalArrow(
    centerX: number,
    centerY: number,
    size: number,
    direction: Direction
  ): void {
    // Calculate arrow direction based on meta block facing and current view
    const { dx, dy } = this.getArrowDirection(direction);

    const arrowLen = size * 0.5;
    const arrowHeadLen = size * 0.2;

    const startX = centerX - (dx * arrowLen) / 2;
    const startY = centerY - (dy * arrowLen) / 2;
    const endX = centerX + (dx * arrowLen) / 2;
    const endY = centerY + (dy * arrowLen) / 2;

    // Draw arrow line
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(dy, dx);
    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - arrowHeadLen * Math.cos(angle - Math.PI / 6),
      endY - arrowHeadLen * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - arrowHeadLen * Math.cos(angle + Math.PI / 6),
      endY - arrowHeadLen * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  private getArrowDirection(direction: Direction): { dx: number; dy: number } {
    // Z-up coordinate system: X=East/West, Y=North/South, Z=Up/Down
    // Screen coordinates: +dx is right, +dy is down

    switch (this.viewType) {
      case 'front':
        // Looking North (+Y), camera at -Y
        // Horizontal = X (East/West), Vertical = Z (Up/Down)
        if (direction === 'north') return { dx: 0, dy: 0 };  // Into screen
        if (direction === 'south') return { dx: 0, dy: 0 };  // Out of screen
        if (direction === 'east') return { dx: 1, dy: 0 };   // Right (+X)
        if (direction === 'west') return { dx: -1, dy: 0 };  // Left (-X)
        break;
      case 'back':
        // Looking South (-Y), camera at +Y
        // Horizontal = X (East/West, mirrored), Vertical = Z (Up/Down)
        if (direction === 'north') return { dx: 0, dy: 0 };  // Out of screen
        if (direction === 'south') return { dx: 0, dy: 0 };  // Into screen
        if (direction === 'east') return { dx: -1, dy: 0 };  // Left (mirrored)
        if (direction === 'west') return { dx: 1, dy: 0 };   // Right (mirrored)
        break;
      case 'left':
        // Looking East (+X), camera at -X
        // Horizontal = Y (North/South), Vertical = Z (Up/Down)
        if (direction === 'north') return { dx: 1, dy: 0 };  // Right (+Y)
        if (direction === 'south') return { dx: -1, dy: 0 }; // Left (-Y)
        if (direction === 'east') return { dx: 0, dy: 0 };   // Into screen
        if (direction === 'west') return { dx: 0, dy: 0 };   // Out of screen
        break;
      case 'right':
        // Looking West (-X), camera at +X
        // Horizontal = Y (North/South, mirrored), Vertical = Z (Up/Down)
        if (direction === 'north') return { dx: -1, dy: 0 }; // Left (mirrored)
        if (direction === 'south') return { dx: 1, dy: 0 };  // Right (mirrored)
        if (direction === 'east') return { dx: 0, dy: 0 };   // Out of screen
        if (direction === 'west') return { dx: 0, dy: 0 };   // Into screen
        break;
      case 'top':
        // Looking Down (-Z), camera at +Z
        // Horizontal = X (East/West), Vertical = Y (North/South)
        if (direction === 'north') return { dx: 0, dy: -1 }; // Up (-Y on screen)
        if (direction === 'south') return { dx: 0, dy: 1 };  // Down (+Y on screen)
        if (direction === 'east') return { dx: 1, dy: 0 };   // Right (+X)
        if (direction === 'west') return { dx: -1, dy: 0 };  // Left (-X)
        break;
      case 'bottom':
        // Looking Up (+Z), camera at -Z
        // Horizontal = X (East/West), Vertical = Y (North/South, mirrored)
        if (direction === 'north') return { dx: 0, dy: 1 };  // Down (mirrored)
        if (direction === 'south') return { dx: 0, dy: -1 }; // Up (mirrored)
        if (direction === 'east') return { dx: 1, dy: 0 };   // Right (+X)
        if (direction === 'west') return { dx: -1, dy: 0 };  // Left (-X)
        break;
    }
    return { dx: 0, dy: 0 };
  }

  private projectToGrid(
    position: Vector3D,
    _activeLayers: { x: number; y: number; z: number }
  ): { gridX: number; gridY: number } {
    const project = projectManager.getProject();
    if (!project) return { gridX: 0, gridY: 0 };

    // Z-up coordinate system: X=East/West, Y=North/South, Z=Up/Down
    // Canvas: Y=0 is top, increases downward
    // We want: visual bottom = coordinate 0
    switch (this.viewType) {
      case 'front':
      case 'back':
        // Looking North/South: see X and Z (vertical)
        // Invert Z: Z=0 (down) should appear at bottom of screen
        return { gridX: position.x, gridY: project.dimensions.depth - 1 - position.z };
      case 'left':
      case 'right':
        // Looking East/West: see Y (horizontal) and Z (vertical)
        // Invert Z: Z=0 (down) should appear at bottom of screen
        return { gridX: position.y, gridY: project.dimensions.depth - 1 - position.z };
      case 'top':
      case 'bottom':
        // Looking Down/Up: see X and Y
        // Invert Y: Y=0 (south) should appear at bottom of screen
        return { gridX: position.x, gridY: project.dimensions.height - 1 - position.y };
      default:
        return { gridX: 0, gridY: 0 };
    }
  }

  private getLayerDistance(
    position: Vector3D,
    activeLayers: { x: number; y: number; z: number }
  ): number {
    // Z-up coordinate system: X=East/West, Y=North/South, Z=Up/Down
    // Return absolute distance from active layer
    switch (this.viewType) {
      case 'front':
      case 'back':
        // Looking North/South: hidden axis is Y
        return Math.abs(position.y - activeLayers.y);
      case 'left':
      case 'right':
        // Looking East/West: hidden axis is X
        return Math.abs(position.x - activeLayers.x);
      case 'top':
      case 'bottom':
        // Looking Down/Up: hidden axis is Z
        return Math.abs(position.z - activeLayers.z);
      default:
        return 0;
    }
  }

  private getOpacityForDistance(distance: number): number {
    // Graduated dimming based on layer distance
    if (distance === 0) return 1.0;  // On active layer
    if (distance === 1) return 0.3;  // 1 layer away
    if (distance === 2) return 0.1;  // 2 layers away
    return 0.0;                       // 3+ layers away (don't render)
  }

  private pixelToGrid(pixelX: number, pixelY: number): { gridX: number; gridY: number } | null {
    const project = projectManager.getProject();
    if (!project) return null;

    const { gridWidth, gridHeight } = this.getGridDimensions(project.dimensions);
    const BASE_CELL_SIZE = 20;
    const cellSize = BASE_CELL_SIZE * this.zoom;

    const gridX = Math.floor((pixelX - this.pan.x) / cellSize);
    const gridY = Math.floor((pixelY - this.pan.y) / cellSize);

    if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
      return null;
    }

    return { gridX, gridY };
  }

  private gridToPosition(gridX: number, gridY: number): Vector3D {
    const activeLayers = editorStateManager.getActiveLayers();
    const project = projectManager.getProject();
    if (!project) return { x: 0, y: 0, z: 0 };

    // Z-up coordinate system: X=East/West, Y=North/South, Z=Up/Down
    switch (this.viewType) {
      case 'front':
      case 'back':
        // Looking North/South: gridX=X, gridY=Z (inverted)
        return { x: gridX, y: activeLayers.y, z: project.dimensions.depth - 1 - gridY };
      case 'left':
      case 'right':
        // Looking East/West: gridX=Y, gridY=Z (inverted)
        return { x: activeLayers.x, y: gridX, z: project.dimensions.depth - 1 - gridY };
      case 'top':
      case 'bottom':
        // Looking Down/Up: gridX=X, gridY=Y (inverted)
        return { x: gridX, y: project.dimensions.height - 1 - gridY, z: activeLayers.z };
      default:
        return { x: 0, y: 0, z: 0 };
    }
  }

  private placeMetaBlockAtPixel(pixelX: number, pixelY: number): void {
    const project = projectManager.getProject();
    if (!project) return;

    const gridCoords = this.pixelToGrid(pixelX, pixelY);
    if (!gridCoords) return;

    const { gridX, gridY } = gridCoords;
    const position = this.gridToPosition(gridX, gridY);

    // Validate position
    if (
      position.x < 0 || position.x >= project.dimensions.width ||
      position.y < 0 || position.y >= project.dimensions.height ||
      position.z < 0 || position.z >= project.dimensions.depth
    ) {
      return;
    }

    // Update meta block position (not confirmed yet, can still be moved)
    projectManager.setMetaBlock(position);
  }

  private paintAtPixel(pixelX: number, pixelY: number): void {
    const gridCoords = this.pixelToGrid(pixelX, pixelY);
    if (!gridCoords) return;

    const { gridX, gridY } = gridCoords;
    const cellKey = `${gridX},${gridY}`;

    // Avoid duplicate placements during drag
    if (this.lastPaintedCell === cellKey) return;
    this.lastPaintedCell = cellKey;

    // Delegate to canvas painter
    const selectedBlock = editorStateManager.getSelectedBlock();
    const activeLayers = editorStateManager.getActiveLayers();
    this.canvasPainter.paint(gridX, gridY, this.viewType, activeLayers, selectedBlock);
  }

  private eraseAtPixel(pixelX: number, pixelY: number): void {
    const gridCoords = this.pixelToGrid(pixelX, pixelY);
    if (!gridCoords) return;

    const { gridX, gridY } = gridCoords;
    const cellKey = `${gridX},${gridY}`;

    // Avoid duplicate deletions during drag
    if (this.lastPaintedCell === cellKey) return;
    this.lastPaintedCell = cellKey;

    // Delegate to canvas painter with null blockId (erase mode)
    const activeLayers = editorStateManager.getActiveLayers();
    this.canvasPainter.paint(gridX, gridY, this.viewType, activeLayers, null);
  }

  private mouseToCanvasSpace(mouseX: number, mouseY: number): { x: number; y: number } {
    return {
      x: (mouseX - this.pan.x) / this.zoom,
      y: (mouseY - this.pan.y) / this.zoom,
    };
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    const now = Date.now();
    const timeSinceLastZoom = now - this.lastZoomTime;

    // Throttle: 30ms
    if (timeSinceLastZoom < 30) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Get mouse position in canvas space BEFORE zoom
    const beforeZoom = this.mouseToCanvasSpace(mouseX, mouseY);

    // Normalize wheel delta
    let delta = event.deltaY;
    if (event.deltaMode === 1) {
      delta *= 15;
    } else if (event.deltaMode === 2) {
      delta *= 100;
    }

    // Calculate zoom change with rate limiting
    const MAX_ZOOM_RATE_PER_SECOND = 1.0;
    const maxChangeThisFrame = MAX_ZOOM_RATE_PER_SECOND * (timeSinceLastZoom / 1000);
    const desiredChange = delta > 0 ? -0.15 : 0.15;
    const zoomChange = Math.sign(desiredChange) * Math.min(Math.abs(desiredChange), maxChangeThisFrame);

    const oldZoom = this.zoom;
    const newZoom = Math.max(0.25, Math.min(4.0, oldZoom + zoomChange));

    if (Math.abs(newZoom - oldZoom) < 0.001) return;

    this.lastZoomTime = now;
    this.zoom = newZoom;

    // Get mouse position in canvas space AFTER zoom
    const afterZoom = this.mouseToCanvasSpace(mouseX, mouseY);

    // Adjust pan to keep mouse position stable
    this.pan.x = this.pan.x + (afterZoom.x - beforeZoom.x) * newZoom;
    this.pan.y = this.pan.y + (afterZoom.y - beforeZoom.y) * newZoom;

    this.render();
  }

  private handleMouseDown(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;

    // Meta block placement mode: left click to place meta block
    if (this.isPlacementMode && event.button === 0 && !event.shiftKey) {
      this.placeMetaBlockAtPixel(pixelX, pixelY);
      return;
    }

    // Pan mode: spacebar + left or middle mouse
    if (
      (event.button === 0 && this.spacebarHeld) ||
      event.button === 1
    ) {
      this.isDraggingPan = true;
      this.lastMousePos = { x: pixelX, y: pixelY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // Delete mode: shift + left click
    if (event.button === 0 && event.shiftKey) {
      this.isErasing = true;
      this.lastPaintedCell = null;
      this.eraseAtPixel(pixelX, pixelY);
      return;
    }

    // Paint mode: left click
    if (event.button === 0) {
      const paintMode = editorStateManager.getPaintMode();

      // Outline mode: start drag for rectangle
      if (paintMode === 'outline') {
        const gridCoords = this.pixelToGrid(pixelX, pixelY);
        if (gridCoords) {
          const { gridX, gridY } = gridCoords;
          const position = this.gridToPosition(gridX, gridY);

          // Store preview start
          this.outlinePreviewStart = { gridX, gridY };
          this.outlinePreviewEnd = { gridX, gridY };

          // Initialize preview for 3D view
          this.updatePreviewBlocks();

          // Notify outline strategy that drag started
          const strategy = this.canvasPainter['strategy'];
          if (strategy && 'startDrag' in strategy) {
            (strategy as any).startDrag(position);
          }
        }
      }

      this.isPainting = true;
      this.lastPaintedCell = null;

      // Only paint immediately for non-outline modes
      if (paintMode !== 'outline') {
        this.paintAtPixel(pixelX, pixelY);
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;

    // Update last mouse grid position (for preview)
    const gridCoords = this.pixelToGrid(pixelX, pixelY);
    if (gridCoords) {
      this.lastMouseGridPos = { gridX: gridCoords.gridX, gridY: gridCoords.gridY };

      // Show hover preview for point mode (when not actively painting/panning/erasing)
      if (!this.isPainting && !this.isDraggingPan && !this.isErasing && !this.previewKeyHeld) {
        const paintMode = editorStateManager.getPaintMode();
        if (paintMode === 'point') {
          this.paintPreviewCell = { gridX: gridCoords.gridX, gridY: gridCoords.gridY };
          this.render(); // Re-render to show preview
        }
      }
    }

    // Handle panning
    if (this.isDraggingPan) {
      const deltaX = pixelX - this.lastMousePos.x;
      const deltaY = pixelY - this.lastMousePos.y;

      this.pan.x += deltaX;
      this.pan.y += deltaY;

      this.lastMousePos = { x: pixelX, y: pixelY };
      this.render();
      return;
    }

    // Handle erasing
    if (this.isErasing) {
      this.eraseAtPixel(pixelX, pixelY);
      return;
    }

    // Handle painting
    if (this.isPainting) {
      const paintMode = editorStateManager.getPaintMode();

      // For outline mode, update preview during drag
      if (paintMode === 'outline') {
        if (gridCoords) {
          this.outlinePreviewEnd = { gridX: gridCoords.gridX, gridY: gridCoords.gridY };
          this.updatePreviewBlocks(); // Update 3D preview
          this.render(); // Re-render to show 2D preview
        }
        return;
      }

      // For point/fill mode, show preview of current cell while dragging
      if (gridCoords) {
        this.paintPreviewCell = { gridX: gridCoords.gridX, gridY: gridCoords.gridY };
      }

      this.paintAtPixel(pixelX, pixelY);
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    // If we were painting in outline mode, finalize the rectangle
    if (this.isPainting) {
      const paintMode = editorStateManager.getPaintMode();
      if (paintMode === 'outline') {
        const rect = this.canvas.getBoundingClientRect();
        const pixelX = event.clientX - rect.left;
        const pixelY = event.clientY - rect.top;

        // Clear preview
        this.outlinePreviewStart = null;
        this.outlinePreviewEnd = null;

        // Paint the final rectangle outline
        this.paintAtPixel(pixelX, pixelY);

        // End drag in strategy
        const strategy = this.canvasPainter['strategy'];
        if (strategy && 'endDrag' in strategy) {
          (strategy as any).endDrag();
        }

        this.render(); // Re-render to clear preview
      }
    }

    // Clear all preview state
    this.paintPreviewCell = null;
    this.outlinePreviewStart = null;
    this.outlinePreviewEnd = null;
    editorStateManager.clearPreview();

    this.isPainting = false;
    this.isErasing = false;
    this.isDraggingPan = false;
    this.lastPaintedCell = null;
    this.updateCursor();
  }

  private handleMouseLeave(): void {
    // Clear all preview state
    this.paintPreviewCell = null;
    this.outlinePreviewStart = null;
    this.outlinePreviewEnd = null;
    editorStateManager.clearPreview();

    this.isPainting = false;
    this.isErasing = false;
    this.isDraggingPan = false;
    this.lastPaintedCell = null;
    this.updateCursor();
    this.render(); // Re-render to clear preview
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space' && !event.repeat) {
      event.preventDefault();
      this.spacebarHeld = true;
      this.updateCursor();
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.shiftHeld = true;
      this.updateCursor();
    }
    if ((event.code === 'AltLeft' || event.code === 'AltRight') && !event.repeat) {
      event.preventDefault();
      this.previewKeyHeld = true;
      this.showPreviewAtCursor();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault();
      this.spacebarHeld = false;
      this.isDraggingPan = false;
      this.updateCursor();
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.shiftHeld = false;
      this.isErasing = false;
      this.updateCursor();
    }
    if (event.code === 'AltLeft' || event.code === 'AltRight') {
      event.preventDefault();
      this.previewKeyHeld = false;
      editorStateManager.clearPreview(); // Clear preview when key released
    }
  }

  private updateCursor(): void {
    if (this.isDraggingPan) {
      this.canvas.style.cursor = 'grabbing';
    } else if (this.spacebarHeld) {
      this.canvas.style.cursor = 'grab';
    } else if (this.shiftHeld) {
      this.canvas.style.cursor = 'not-allowed'; // Eraser cursor
    } else if (this.isPlacementMode) {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'crosshair';
    }
  }

  /**
   * Show preview at current cursor position (for Alt key preview)
   * Calculates what would happen if the user clicked at the current position
   */
  private showPreviewAtCursor(): void {
    if (!this.lastMouseGridPos) {
      editorStateManager.clearPreview();
      return;
    }

    const selectedBlock = editorStateManager.getSelectedBlock();
    if (!selectedBlock) {
      editorStateManager.clearPreview();
      return;
    }

    const project = projectManager.getProject();
    if (!project) {
      editorStateManager.clearPreview();
      return;
    }

    // Convert grid position to 3D world position
    const position = this.gridToPosition(this.lastMouseGridPos.gridX, this.lastMouseGridPos.gridY);

    // Calculate what would be painted using the current strategy
    const constrainAxis = this.getConstrainedAxis();
    const operations = this.canvasPainter['strategy'].calculateOperations(
      position,
      selectedBlock,
      project.dimensions,
      constrainAxis
    );

    // Filter through behavior (same as actual painting)
    const getBlock = (pos: Vector3D) => {
      const blockData = projectManager.getBlock(pos);
      return blockData ? blockData.blockType : null;
    };
    const filteredOperations = this.canvasPainter['behavior'].filter(operations, getBlock);

    // Convert to preview blocks
    const previewBlocks = filteredOperations.map(op => ({
      position: op.position,
      blockType: op.blockType,
    }));

    editorStateManager.setPreviewBlocks(previewBlocks);
  }

  /**
   * Get constrained axis for current view (helper method)
   */
  private getConstrainedAxis(): { axis: 'x' | 'y' | 'z'; value: number } {
    const activeLayers = editorStateManager.getActiveLayers();
    switch (this.viewType) {
      case 'front':
      case 'back':
        return { axis: 'y', value: activeLayers.y };
      case 'left':
      case 'right':
        return { axis: 'x', value: activeLayers.x };
      case 'top':
      case 'bottom':
        return { axis: 'z', value: activeLayers.z };
    }
  }

  /**
   * Update preview blocks for 3D ghost rendering
   * Called during outline mode drag to show what will be placed
   */
  private updatePreviewBlocks(): void {
    const selectedBlock = editorStateManager.getSelectedBlock();
    if (!selectedBlock || !this.outlinePreviewStart || !this.outlinePreviewEnd) {
      editorStateManager.clearPreview();
      return;
    }

    const project = projectManager.getProject();
    if (!project) {
      editorStateManager.clearPreview();
      return;
    }

    // Convert grid coordinates to 3D positions
    const startPos = this.gridToPosition(this.outlinePreviewStart.gridX, this.outlinePreviewStart.gridY);
    const endPos = this.gridToPosition(this.outlinePreviewEnd.gridX, this.outlinePreviewEnd.gridY);

    // Calculate outline rectangle positions
    const previewPositions = this.calculateOutlinePositions(startPos, endPos, project.dimensions);

    // Create preview blocks
    const previewBlocks = previewPositions.map(pos => ({
      position: pos,
      blockType: selectedBlock,
    }));

    editorStateManager.setPreviewBlocks(previewBlocks);
  }

  /**
   * Calculate outline rectangle positions (similar to OutlinePaintStrategy)
   */
  private calculateOutlinePositions(
    start: Vector3D,
    end: Vector3D,
    dimensions: Dimensions
  ): Vector3D[] {
    const positions: Vector3D[] = [];

    // Calculate rectangle bounds
    const minX = Math.max(0, Math.min(start.x, end.x));
    const maxX = Math.min(dimensions.width - 1, Math.max(start.x, end.x));
    const minY = Math.max(0, Math.min(start.y, end.y));
    const maxY = Math.min(dimensions.height - 1, Math.max(start.y, end.y));
    const minZ = Math.max(0, Math.min(start.z, end.z));
    const maxZ = Math.min(dimensions.depth - 1, Math.max(start.z, end.z));

    // Determine which plane we're drawing on
    const isXConstant = start.x === end.x;
    const isYConstant = start.y === end.y;
    const isZConstant = start.z === end.z;

    if (isXConstant) {
      // YZ plane (front/back view)
      const x = start.x;
      for (let y = minY; y <= maxY; y++) {
        positions.push({ x, y, z: minZ });
        positions.push({ x, y, z: maxZ });
      }
      for (let z = minZ + 1; z < maxZ; z++) {
        positions.push({ x, y: minY, z });
        positions.push({ x, y: maxY, z });
      }
    } else if (isYConstant) {
      // XZ plane (left/right view)
      const y = start.y;
      for (let x = minX; x <= maxX; x++) {
        positions.push({ x, y, z: minZ });
        positions.push({ x, y, z: maxZ });
      }
      for (let z = minZ + 1; z < maxZ; z++) {
        positions.push({ x: minX, y, z });
        positions.push({ x: maxX, y, z });
      }
    } else if (isZConstant) {
      // XY plane (top/bottom view)
      const z = start.z;
      for (let x = minX; x <= maxX; x++) {
        positions.push({ x, y: minY, z });
        positions.push({ x, y: maxY, z });
      }
      for (let y = minY + 1; y < maxY; y++) {
        positions.push({ x: minX, y, z });
        positions.push({ x: maxX, y, z });
      }
    }

    return positions;
  }

  /**
   * Handle paint mode change event
   */
  private handlePaintModeChanged(mode: PaintMode): void {
    const strategy = this.createStrategyForMode(mode);
    this.canvasPainter.setStrategy(strategy);
  }

  /**
   * Handle paint behavior change event
   */
  private handlePaintBehaviorChanged(behavior: PaintBehavior): void {
    const behaviorImpl = this.createBehaviorForType(behavior);
    this.canvasPainter.setBehavior(behaviorImpl);
  }

  /**
   * Create paint strategy based on mode
   */
  private createStrategyForMode(mode: PaintMode) {
    switch (mode) {
      case 'point':
        return new PointPaintStrategy();
      case 'fill':
        return new FillPaintStrategy();
      case 'outline':
        return new OutlinePaintStrategy();
      default:
        return new PointPaintStrategy();
    }
  }

  /**
   * Create paint behavior based on type
   */
  private createBehaviorForType(behavior: PaintBehavior) {
    switch (behavior) {
      case 'normal':
        return new NormalBehavior();
      case 'only-replace':
        return new OnlyReplaceBehavior();
      case 'selective-replace':
        return new SelectiveReplaceBehavior();
      default:
        return new NormalBehavior();
    }
  }
}
