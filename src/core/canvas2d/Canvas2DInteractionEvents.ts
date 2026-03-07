/**
 * Canvas2DInteractionEvents - Type definitions for interaction events
 *
 * These are the semantic events emitted by Canvas2DInteractionHandler.
 * They represent user interactions without domain knowledge.
 */

/**
 * Modifier keys state
 */
export interface ModifierKeys {
  space: boolean;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
}

/**
 * Grid position (generic coordinate, no domain knowledge)
 */
export interface GridPosition {
  gridX: number;
  gridY: number;
}

/**
 * Pixel position (canvas pixel coordinates)
 */
export interface PixelPosition {
  pixelX: number;
  pixelY: number;
}

/**
 * Interaction event handlers
 */
export interface InteractionEventHandlers {
  /**
   * Mouse is hovering over a grid cell
   */
  onHover?: (position: GridPosition, modifiers: ModifierKeys) => void;

  /**
   * Mouse clicked (mousedown + mouseup on same cell)
   */
  onClick?: (position: GridPosition, button: number, modifiers: ModifierKeys) => void;

  /**
   * Drag started (mousedown)
   */
  onDragStart?: (position: GridPosition, button: number, modifiers: ModifierKeys) => void;

  /**
   * Drag moved (mousemove while dragging)
   */
  onDragMove?: (position: GridPosition, modifiers: ModifierKeys) => void;

  /**
   * Drag ended (mouseup)
   */
  onDragEnd?: (position: GridPosition, modifiers: ModifierKeys) => void;

  /**
   * Mouse left canvas
   */
  onMouseLeave?: () => void;

  /**
   * Zoom requested (wheel event)
   */
  onZoom?: (delta: number, center: PixelPosition) => void;

  /**
   * Pan started (space + drag or middle mouse)
   */
  onPanStart?: (position: PixelPosition) => void;

  /**
   * Pan moved
   */
  onPanMove?: (delta: { deltaX: number; deltaY: number }) => void;

  /**
   * Pan ended
   */
  onPanEnd?: () => void;

  /**
   * Modifier keys changed
   */
  onModifierChange?: (modifiers: ModifierKeys) => void;

  /**
   * Escape key pressed (generic cancellation)
   */
  onEscape?: () => void;

  /**
   * Render requested (when state changes requiring redraw)
   */
  onRenderRequested?: () => void;
}
