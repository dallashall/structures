import { editorStateManager } from '../EditorStateManager';
import { projectManager } from '../ProjectManager';
import type { Canvas2DViewport } from './Canvas2DViewport';
import type { Canvas2DPreviewManager } from './Canvas2DPreviewManager';
import type { Canvas2DPaintHandler } from './Canvas2DPaintHandler';

/**
 * Canvas2DInteractionHandler - Handles all user input events
 *
 * Responsibilities:
 * - Mouse events (down, move, up, leave, wheel)
 * - Keyboard events (space, shift, alt)
 * - Cursor state management
 * - Coordinate interaction handlers (pan, paint, erase, zoom)
 * - Delegates to appropriate handlers (viewport, paintHandler, previewManager)
 *
 * This class translates raw DOM events into coordinated actions.
 */
export class Canvas2DInteractionHandler {
  // Interaction state
  private isDraggingPan = false;
  private isPainting = false;
  private isErasing = false;
  private lastMousePos = { x: 0, y: 0 };
  private lastZoomTime = 0;

  // Keyboard state
  private spacebarHeld = false;
  private shiftHeld = false;
  private altHeld = false;

  // Placement mode state
  private isPlacementMode = false;

  // Track last preview position to avoid unnecessary updates
  private lastPreviewGridPos: { gridX: number; gridY: number } | null = null;

  // Bound event handlers (for cleanup)
  private boundHandlers = {
    wheel: this.handleWheel.bind(this),
    mouseDown: this.handleMouseDown.bind(this),
    mouseMove: this.handleMouseMove.bind(this),
    mouseUp: this.handleMouseUp.bind(this),
    mouseLeave: this.handleMouseLeave.bind(this),
    keyDown: this.handleKeyDown.bind(this),
    keyUp: this.handleKeyUp.bind(this),
  };

  constructor(
    private canvas: HTMLCanvasElement,
    private viewport: Canvas2DViewport,
    private previewManager: Canvas2DPreviewManager,
    private paintHandler: Canvas2DPaintHandler,
    private onRender: () => void
  ) {
    this.attachEventListeners();
    this.updateCursor();
  }

  /**
   * Attach all event listeners
   */
  private attachEventListeners(): void {
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
    this.canvas.addEventListener('mousedown', this.boundHandlers.mouseDown);
    this.canvas.addEventListener('mousemove', this.boundHandlers.mouseMove);
    this.canvas.addEventListener('mouseup', this.boundHandlers.mouseUp);
    this.canvas.addEventListener('mouseleave', this.boundHandlers.mouseLeave);
    window.addEventListener('keydown', this.boundHandlers.keyDown);
    window.addEventListener('keyup', this.boundHandlers.keyUp);
  }

  /**
   * Detach all event listeners
   */
  destroy(): void {
    this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
    this.canvas.removeEventListener('mousedown', this.boundHandlers.mouseDown);
    this.canvas.removeEventListener('mousemove', this.boundHandlers.mouseMove);
    this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseUp);
    this.canvas.removeEventListener('mouseleave', this.boundHandlers.mouseLeave);
    window.removeEventListener('keydown', this.boundHandlers.keyDown);
    window.removeEventListener('keyup', this.boundHandlers.keyUp);
  }

  /**
   * Set placement mode (for meta block placement)
   */
  setPlacementMode(isPlacementMode: boolean): void {
    this.isPlacementMode = isPlacementMode;
    this.updateCursor();
  }

  /**
   * Handle wheel event (zoom)
   */
  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    const now = Date.now();
    const timeSinceLastZoom = now - this.lastZoomTime;

    // Throttle: 30ms
    if (timeSinceLastZoom < 30) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

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

    const changed = this.viewport.applyZoom(zoomChange, mouseX, mouseY);

    if (changed) {
      this.lastZoomTime = now;
      this.onRender();
    }
  }

  /**
   * Handle mouse down
   */
  private handleMouseDown(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;

    // Meta block placement mode
    if (this.isPlacementMode && event.button === 0 && !event.shiftKey) {
      this.placeMetaBlockAtPixel(pixelX, pixelY);
      return;
    }

    // Pan mode
    if ((event.button === 0 && this.spacebarHeld) || event.button === 1) {
      this.isDraggingPan = true;
      this.lastMousePos = { x: pixelX, y: pixelY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // Erase mode
    if (event.button === 0 && this.shiftHeld) {
      this.isErasing = true;
      this.paintHandler.resetLastPaintedCell();
      this.paintHandler.eraseAtPixel(pixelX, pixelY);
      return;
    }

    // Paint mode
    if (event.button === 0) {
      const paintMode = editorStateManager.getPaintMode();

      // Clear hover preview when starting to paint
      this.previewManager.clearPointPreview();
      this.lastPreviewGridPos = null;

      // Outline mode: start drag
      if (paintMode === 'outline') {
        const gridCoords = this.viewport.pixelToGrid(pixelX, pixelY);
        if (gridCoords) {
          const { gridX, gridY } = gridCoords;
          const position = this.viewport.gridToPosition(gridX, gridY);

          // Start outline preview
          this.previewManager.startOutlineDrag(gridX, gridY);

          // Notify outline strategy that drag started
          const strategy = this.paintHandler['canvasPainter']['strategy'];
          if (strategy && 'startDrag' in strategy) {
            (strategy as any).startDrag(position);
          }
        }
      }

      this.isPainting = true;
      this.paintHandler.resetLastPaintedCell();

      // Only paint immediately for non-outline modes
      if (paintMode !== 'outline') {
        this.paintHandler.paintAtPixel(pixelX, pixelY);
      }
    }
  }

  /**
   * Handle mouse move
   */
  private handleMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;

    // Update last grid position for preview
    const gridCoords = this.viewport.pixelToGrid(pixelX, pixelY);
    if (gridCoords) {
      this.previewManager.updateLastGridPosition(gridCoords.gridX, gridCoords.gridY);

      // Show hover preview for point mode (when not actively interacting)
      if (!this.isPainting && !this.isDraggingPan && !this.isErasing && !this.altHeld) {
        const paintMode = editorStateManager.getPaintMode();
        if (paintMode === 'point') {
          // Only update if grid position changed (avoid flickering)
          const gridChanged = !this.lastPreviewGridPos ||
            this.lastPreviewGridPos.gridX !== gridCoords.gridX ||
            this.lastPreviewGridPos.gridY !== gridCoords.gridY;

          if (gridChanged) {
            this.lastPreviewGridPos = { gridX: gridCoords.gridX, gridY: gridCoords.gridY };
            this.previewManager.updatePointPreview(gridCoords.gridX, gridCoords.gridY);
            this.onRender();
          }
        }
      }
    }

    // Handle panning
    if (this.isDraggingPan) {
      const deltaX = pixelX - this.lastMousePos.x;
      const deltaY = pixelY - this.lastMousePos.y;

      this.viewport.applyPan(deltaX, deltaY);

      this.lastMousePos = { x: pixelX, y: pixelY };
      this.onRender();
      return;
    }

    // Handle erasing
    if (this.isErasing) {
      this.paintHandler.eraseAtPixel(pixelX, pixelY);
      return;
    }

    // Handle painting
    if (this.isPainting) {
      const paintMode = editorStateManager.getPaintMode();

      // Outline mode: update preview
      if (paintMode === 'outline' && gridCoords) {
        this.previewManager.updateOutlineDrag(gridCoords.gridX, gridCoords.gridY);
        this.onRender();
        return;
      }

      // Point/fill mode: paint while dragging
      if (gridCoords) {
        this.previewManager.updatePointPreview(gridCoords.gridX, gridCoords.gridY);
      }

      this.paintHandler.paintAtPixel(pixelX, pixelY);
    }
  }

  /**
   * Handle mouse up
   */
  private handleMouseUp(event: MouseEvent): void {
    // Finalize outline mode
    if (this.isPainting) {
      const paintMode = editorStateManager.getPaintMode();
      if (paintMode === 'outline') {
        const rect = this.canvas.getBoundingClientRect();
        const pixelX = event.clientX - rect.left;
        const pixelY = event.clientY - rect.top;

        // End outline preview
        this.previewManager.endOutlineDrag();

        // Paint the final rectangle
        this.paintHandler.paintAtPixel(pixelX, pixelY);

        // End drag in strategy
        const strategy = this.paintHandler['canvasPainter']['strategy'];
        if (strategy && 'endDrag' in strategy) {
          (strategy as any).endDrag();
        }

        this.onRender();
      }
    }

    // Clear preview state
    this.previewManager.clearPointPreview();

    this.isPainting = false;
    this.isErasing = false;
    this.isDraggingPan = false;
    this.paintHandler.resetLastPaintedCell();
    this.updateCursor();
  }

  /**
   * Handle mouse leave
   */
  private handleMouseLeave(): void {
    this.previewManager.clearAll();
    this.previewManager.clearPointPreview();
    this.lastPreviewGridPos = null;

    this.isPainting = false;
    this.isErasing = false;
    this.isDraggingPan = false;
    this.paintHandler.resetLastPaintedCell();
    this.updateCursor();
    this.onRender();
  }

  /**
   * Handle key down
   */
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
      this.altHeld = true;
      this.previewManager.activatePreviewKey();
    }
  }

  /**
   * Handle key up
   */
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
      this.altHeld = false;
      this.previewManager.deactivatePreviewKey();
    }
  }

  /**
   * Update cursor based on current state
   */
  private updateCursor(): void {
    if (this.isDraggingPan) {
      this.canvas.style.cursor = 'grabbing';
    } else if (this.spacebarHeld) {
      this.canvas.style.cursor = 'grab';
    } else if (this.shiftHeld) {
      this.canvas.style.cursor = 'not-allowed';
    } else if (this.isPlacementMode) {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'crosshair';
    }
  }

  /**
   * Place meta block at pixel coordinates
   */
  private placeMetaBlockAtPixel(pixelX: number, pixelY: number): void {
    const project = projectManager.getProject();
    if (!project) return;

    const gridCoords = this.viewport.pixelToGrid(pixelX, pixelY);
    if (!gridCoords) return;

    const position = this.viewport.gridToPosition(gridCoords.gridX, gridCoords.gridY);

    // Validate position
    if (
      position.x < 0 || position.x >= project.dimensions.width ||
      position.y < 0 || position.y >= project.dimensions.height ||
      position.z < 0 || position.z >= project.dimensions.depth
    ) {
      return;
    }

    // Update meta block position
    projectManager.setMetaBlock(position);
  }
}
