import type { Canvas2DViewport } from './Canvas2DViewport';
import type {
  InteractionEventHandlers,
  ModifierKeys,
  GridPosition,
  PixelPosition,
} from './Canvas2DInteractionEvents';

/**
 * Canvas2DInteractionHandler - Generic input event handler
 *
 * Responsibilities:
 * - Capture raw DOM events (mouse, keyboard, wheel)
 * - Track modifier key state
 * - Track mouse state and interaction modes
 * - Convert pixel coordinates to grid coordinates
 * - Emit semantic interaction events
 *
 * Does NOT know about:
 * - Previews
 * - Painting
 * - Placement mode
 * - Rendering
 * - Any domain-specific logic
 *
 * This is a pure interaction layer that can be reused for any grid-based canvas.
 */
export class Canvas2DInteractionHandler {
  // Modifier key state
  private modifiers: ModifierKeys = {
    space: false,
    shift: false,
    alt: false,
    ctrl: false,
    meta: false,
  };

  // Mouse state
  private isDragging = false;
  private dragButton: number | null = null;
  private lastPixelPos: PixelPosition = { pixelX: 0, pixelY: 0 };
  private lastGridPos: GridPosition | null = null;
  private dragStartGridPos: GridPosition | null = null;
  private isMouseInside = false; // Track if mouse is inside canvas

  // Pan state
  private isPanning = false;

  // Zoom throttling
  private lastZoomTime = 0;

  // Bound event handlers (for cleanup)
  private boundHandlers = {
    wheel: this.handleWheel.bind(this),
    mouseDown: this.handleMouseDown.bind(this),
    mouseMove: this.handleMouseMove.bind(this),
    mouseUp: this.handleMouseUp.bind(this),
    mouseEnter: this.handleMouseEnter.bind(this),
    mouseLeave: this.handleMouseLeave.bind(this),
    keyDown: this.handleKeyDown.bind(this),
    keyUp: this.handleKeyUp.bind(this),
  };

  constructor(
    private canvas: HTMLCanvasElement,
    private viewport: Canvas2DViewport,
    private handlers: InteractionEventHandlers
  ) {
    this.attachEventListeners();
  }

  /**
   * Attach all event listeners
   */
  private attachEventListeners(): void {
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
    this.canvas.addEventListener('mousedown', this.boundHandlers.mouseDown);
    this.canvas.addEventListener('mousemove', this.boundHandlers.mouseMove);
    this.canvas.addEventListener('mouseup', this.boundHandlers.mouseUp);
    this.canvas.addEventListener('mouseenter', this.boundHandlers.mouseEnter);
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
    this.canvas.removeEventListener('mouseenter', this.boundHandlers.mouseEnter);
    this.canvas.removeEventListener('mouseleave', this.boundHandlers.mouseLeave);
    window.removeEventListener('keydown', this.boundHandlers.keyDown);
    window.removeEventListener('keyup', this.boundHandlers.keyUp);
  }

  /**
   * Get current modifier key state
   */
  getModifiers(): ModifierKeys {
    return { ...this.modifiers };
  }

  /**
   * Check if mouse is inside canvas
   */
  isMouseInsideCanvas(): boolean {
    return this.isMouseInside;
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
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;

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

    this.lastZoomTime = now;

    this.handlers.onZoom?.(zoomChange, { pixelX, pixelY });
  }

  /**
   * Handle mouse down
   */
  private handleMouseDown(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;
    const gridPos = this.viewport.pixelToGrid(pixelX, pixelY);

    this.lastPixelPos = { pixelX, pixelY };

    // Pan mode (space + left button OR middle button)
    if ((event.button === 0 && this.modifiers.space) || event.button === 1) {
      this.isPanning = true;
      this.handlers.onPanStart?.({ pixelX, pixelY });
      return;
    }

    // Start drag
    if (gridPos) {
      this.isDragging = true;
      this.dragButton = event.button;
      this.dragStartGridPos = gridPos;
      this.handlers.onDragStart?.(gridPos, event.button, this.modifiers);
    }
  }

  /**
   * Handle mouse move
   */
  private handleMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;
    const gridPos = this.viewport.pixelToGrid(pixelX, pixelY);

    // Handle panning
    if (this.isPanning) {
      const deltaX = pixelX - this.lastPixelPos.pixelX;
      const deltaY = pixelY - this.lastPixelPos.pixelY;
      this.lastPixelPos = { pixelX, pixelY };
      this.handlers.onPanMove?.({ deltaX, deltaY });
      return;
    }

    // Handle dragging
    if (this.isDragging && gridPos) {
      this.handlers.onDragMove?.(gridPos, this.modifiers);
      this.lastGridPos = gridPos;
      return;
    }

    // Handle hover (only if grid position changed)
    if (gridPos) {
      const gridChanged = !this.lastGridPos ||
        this.lastGridPos.gridX !== gridPos.gridX ||
        this.lastGridPos.gridY !== gridPos.gridY;

      if (gridChanged) {
        this.lastGridPos = gridPos;
        this.handlers.onHover?.(gridPos, this.modifiers);
      }
    }
  }

  /**
   * Handle mouse up
   */
  private handleMouseUp(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;
    const gridPos = this.viewport.pixelToGrid(pixelX, pixelY);

    // End pan
    if (this.isPanning) {
      this.isPanning = false;
      this.handlers.onPanEnd?.();
      return;
    }

    // End drag
    if (this.isDragging && gridPos) {
      this.handlers.onDragEnd?.(gridPos, this.modifiers);

      // Check if it was a click (start and end on same cell)
      if (this.dragStartGridPos &&
          this.dragStartGridPos.gridX === gridPos.gridX &&
          this.dragStartGridPos.gridY === gridPos.gridY &&
          this.dragButton !== null) {
        this.handlers.onClick?.(gridPos, this.dragButton, this.modifiers);
      }

      this.isDragging = false;
      this.dragButton = null;
      this.dragStartGridPos = null;
    }
  }

  /**
   * Handle mouse enter - update grid position immediately
   */
  private handleMouseEnter(event: MouseEvent): void {
    this.isMouseInside = true;

    const rect = this.canvas.getBoundingClientRect();
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;
    const gridPos = this.viewport.pixelToGrid(pixelX, pixelY);

    // Update grid position for Alt preview
    if (gridPos) {
      this.lastGridPos = gridPos;
      this.handlers.onHover?.(gridPos, this.modifiers);
    }
  }

  /**
   * Handle mouse leave
   */
  private handleMouseLeave(): void {
    this.isMouseInside = false;

    // End any active interactions
    if (this.isPanning) {
      this.handlers.onPanEnd?.();
    }
    if (this.isDragging && this.lastGridPos) {
      this.handlers.onDragEnd?.(this.lastGridPos, this.modifiers);
    }

    this.isPanning = false;
    this.isDragging = false;
    this.dragButton = null;
    this.dragStartGridPos = null;
    this.lastGridPos = null;

    this.handlers.onMouseLeave?.();
  }

  /**
   * Handle key down
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;

    // ESC key: emit escape event (generic cancellation)
    if (event.code === 'Escape') {
      event.preventDefault();
      this.handlers.onEscape?.();
      return;
    }

    let modifierChanged = false;

    if (event.code === 'Space') {
      event.preventDefault();
      this.modifiers.space = true;
      modifierChanged = true;
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.modifiers.shift = true;
      modifierChanged = true;
    }
    if (event.code === 'AltLeft' || event.code === 'AltRight') {
      event.preventDefault();
      this.modifiers.alt = true;
      modifierChanged = true;
    }
    if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
      this.modifiers.ctrl = true;
      modifierChanged = true;
    }
    if (event.code === 'MetaLeft' || event.code === 'MetaRight') {
      this.modifiers.meta = true;
      modifierChanged = true;
    }

    if (modifierChanged) {
      this.handlers.onModifierChange?.(this.modifiers);
    }
  }

  /**
   * Handle key up
   */
  private handleKeyUp(event: KeyboardEvent): void {
    let modifierChanged = false;

    if (event.code === 'Space') {
      event.preventDefault();
      this.modifiers.space = false;
      this.isPanning = false; // End pan if space released
      modifierChanged = true;
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.modifiers.shift = false;
      modifierChanged = true;
    }
    if (event.code === 'AltLeft' || event.code === 'AltRight') {
      event.preventDefault();
      this.modifiers.alt = false;
      modifierChanged = true;
    }
    if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
      this.modifiers.ctrl = false;
      modifierChanged = true;
    }
    if (event.code === 'MetaLeft' || event.code === 'MetaRight') {
      this.modifiers.meta = false;
      modifierChanged = true;
    }

    if (modifierChanged) {
      this.handlers.onModifierChange?.(this.modifiers);
    }
  }
}
