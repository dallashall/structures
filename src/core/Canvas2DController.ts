import { projectManager } from './ProjectManager';
import { blockRegistry } from './BlockRegistry';
import { editorStateManager } from './EditorStateManager';
import type { ViewType, Vector3D, Dimensions } from '../types';

/**
 * Canvas2DController - Pure TypeScript canvas controller
 *
 * Handles all rendering, zoom/pan, and user interactions for 2D canvas.
 * No React - just DOM and singletons.
 */
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
  private lastMousePos = { x: 0, y: 0 };
  private lastPaintedCell: string | null = null;
  private spacebarHeld = false;
  private lastZoomTime = 0;

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
  };

  constructor(canvas: HTMLCanvasElement, viewType: ViewType) {
    this.canvas = canvas;
    this.viewType = viewType;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    // Initialize pan to center grid
    this.initializePan();

    // Subscribe to singleton events
    projectManager.on('project:changed', this.boundHandlers.projectChanged);
    projectManager.on('block:added', this.boundHandlers.projectChanged);
    projectManager.on('block:removed', this.boundHandlers.projectChanged);
    editorStateManager.on('block:selected', this.boundHandlers.editorChanged);

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
    // Unsubscribe from singleton events
    projectManager.off('project:changed', this.boundHandlers.projectChanged);
    projectManager.off('block:added', this.boundHandlers.projectChanged);
    projectManager.off('block:removed', this.boundHandlers.projectChanged);
    editorStateManager.off('block:selected', this.boundHandlers.editorChanged);

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
    switch (this.viewType) {
      case 'front':
      case 'back':
        return { gridWidth: dimensions.width, gridHeight: dimensions.height };
      case 'left':
      case 'right':
        return { gridWidth: dimensions.depth, gridHeight: dimensions.height };
      case 'top':
      case 'bottom':
        return { gridWidth: dimensions.width, gridHeight: dimensions.depth };
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

      // Check if on active layer
      const isOnActiveLayer = this.isBlockOnActiveLayer(blockData.position, activeLayers);

      // Get block color
      const block = blockRegistry.getBlock(blockData.blockType);
      if (!block) return;

      // Draw block
      const px = offsetX + gridX * cellSize;
      const py = offsetY + gridY * cellSize;

      this.ctx.fillStyle = block.color;
      this.ctx.globalAlpha = isOnActiveLayer ? 1.0 : 0.3;
      this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      this.ctx.globalAlpha = 1.0;
    });

    // Draw meta block
    const metaBlock = project.metaBlock;
    if (metaBlock) {
      const { gridX, gridY } = this.projectToGrid(metaBlock.position, activeLayers);

      if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
        const px = offsetX + gridX * cellSize;
        const py = offsetY + gridY * cellSize;

        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        this.ctx.strokeStyle = '#000000';
        this.ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

        // Draw "M" label
        this.ctx.fillStyle = '#000000';
        this.ctx.font = `${Math.min(cellSize * 0.5, 16)}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('M', px + cellSize / 2, py + cellSize / 2);
      }
    }
  }

  private projectToGrid(
    position: Vector3D,
    _activeLayers: { x: number; y: number; z: number }
  ): { gridX: number; gridY: number } {
    switch (this.viewType) {
      case 'front':
      case 'back':
        return { gridX: position.x, gridY: position.y };
      case 'left':
      case 'right':
        return { gridX: position.z, gridY: position.y };
      case 'top':
      case 'bottom':
        return { gridX: position.x, gridY: position.z };
      default:
        return { gridX: 0, gridY: 0 };
    }
  }

  private isBlockOnActiveLayer(
    position: Vector3D,
    activeLayers: { x: number; y: number; z: number }
  ): boolean {
    switch (this.viewType) {
      case 'front':
      case 'back':
        return position.z === activeLayers.z;
      case 'left':
      case 'right':
        return position.x === activeLayers.x;
      case 'top':
      case 'bottom':
        return position.y === activeLayers.y;
      default:
        return false;
    }
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

    switch (this.viewType) {
      case 'front':
      case 'back':
        return { x: gridX, y: gridY, z: activeLayers.z };
      case 'left':
      case 'right':
        return { x: activeLayers.x, y: gridY, z: gridX };
      case 'top':
      case 'bottom':
        return { x: gridX, y: activeLayers.y, z: gridY };
      default:
        return { x: 0, y: 0, z: 0 };
    }
  }

  private paintAtPixel(pixelX: number, pixelY: number): void {
    const project = projectManager.getProject();
    if (!project) return;

    const gridCoords = this.pixelToGrid(pixelX, pixelY);
    if (!gridCoords) return;

    const { gridX, gridY } = gridCoords;
    const cellKey = `${gridX},${gridY}`;

    // Avoid duplicate placements during drag
    if (this.lastPaintedCell === cellKey) return;
    this.lastPaintedCell = cellKey;

    const position = this.gridToPosition(gridX, gridY);

    // Validate position
    if (
      position.x < 0 || position.x >= project.dimensions.width ||
      position.y < 0 || position.y >= project.dimensions.height ||
      position.z < 0 || position.z >= project.dimensions.depth
    ) {
      return;
    }

    // Place or remove block
    const selectedBlock = editorStateManager.getSelectedBlock();
    if (selectedBlock) {
      projectManager.setBlock(position, selectedBlock);
    } else {
      projectManager.removeBlock(position);
    }
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

    // Pan mode: spacebar + left, middle mouse, or shift+left
    if (
      (event.button === 0 && this.spacebarHeld) ||
      event.button === 1 ||
      (event.button === 0 && event.shiftKey)
    ) {
      this.isDraggingPan = true;
      this.lastMousePos = { x: pixelX, y: pixelY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // Paint mode: left click
    if (event.button === 0) {
      this.isPainting = true;
      this.lastPaintedCell = null;
      this.paintAtPixel(pixelX, pixelY);
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;

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

    // Handle painting
    if (this.isPainting) {
      this.paintAtPixel(pixelX, pixelY);
    }
  }

  private handleMouseUp(): void {
    this.isPainting = false;
    this.isDraggingPan = false;
    this.lastPaintedCell = null;
    this.updateCursor();
  }

  private handleMouseLeave(): void {
    this.isPainting = false;
    this.isDraggingPan = false;
    this.lastPaintedCell = null;
    this.updateCursor();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space' && !event.repeat) {
      event.preventDefault();
      this.spacebarHeld = true;
      this.updateCursor();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault();
      this.spacebarHeld = false;
      this.isDraggingPan = false;
      this.updateCursor();
    }
  }

  private updateCursor(): void {
    if (this.isDraggingPan) {
      this.canvas.style.cursor = 'grabbing';
    } else if (this.spacebarHeld) {
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = 'crosshair';
    }
  }
}
