import { CanvasPainter } from '../painting/CanvasPainter';
import { editorStateManager } from '../EditorStateManager';
import type { Canvas2DViewport } from './Canvas2DViewport';

/**
 * Canvas2DPaintHandler - Handles paint and erase operations
 *
 * Responsibilities:
 * - Execute paint operations via CanvasPainter
 * - Execute erase operations
 * - Track last painted cell (prevent duplicates during drag)
 * - Delegate to CanvasPainter for strategy/behavior application
 *
 * This class is a thin wrapper around CanvasPainter that adds
 * viewport-specific coordinate conversion and duplicate prevention.
 */
export class Canvas2DPaintHandler {
  private lastPaintedCell: string | null = null;

  constructor(
    private viewport: Canvas2DViewport,
    private canvasPainter: CanvasPainter
  ) {}

  /**
   * Paint at pixel coordinates
   */
  paintAtPixel(pixelX: number, pixelY: number): void {
    const gridCoords = this.viewport.pixelToGrid(pixelX, pixelY);
    if (!gridCoords) return;

    const { gridX, gridY } = gridCoords;
    const cellKey = `${gridX},${gridY}`;

    // Prevent duplicate painting during drag
    if (this.lastPaintedCell === cellKey) return;
    this.lastPaintedCell = cellKey;

    // Get selected block and active layers
    const selectedBlock = editorStateManager.getSelectedBlock();
    const activeLayers = editorStateManager.getActiveLayers();

    // Don't paint if no block is selected (except for erase mode which uses null)
    if (!selectedBlock) {
      console.warn('Canvas2DPaintHandler: No block selected, skipping paint operation');
      return;
    }

    // Delegate to CanvasPainter
    this.canvasPainter.paint(
      gridX,
      gridY,
      this.viewport.getViewType(),
      activeLayers,
      selectedBlock
    );
  }

  /**
   * Erase at pixel coordinates
   */
  eraseAtPixel(pixelX: number, pixelY: number): void {
    const gridCoords = this.viewport.pixelToGrid(pixelX, pixelY);
    if (!gridCoords) return;

    const { gridX, gridY } = gridCoords;
    const cellKey = `${gridX},${gridY}`;

    // Prevent duplicate erasing during drag
    if (this.lastPaintedCell === cellKey) return;
    this.lastPaintedCell = cellKey;

    // Get active layers
    const activeLayers = editorStateManager.getActiveLayers();

    // Delegate to CanvasPainter with null blockId (erase mode)
    this.canvasPainter.paint(
      gridX,
      gridY,
      this.viewport.getViewType(),
      activeLayers,
      null
    );
  }

  /**
   * Reset last painted cell (call on mouse up/leave)
   */
  resetLastPaintedCell(): void {
    this.lastPaintedCell = null;
  }

  /**
   * Update paint strategy
   */
  updateStrategy(strategy: any): void {
    this.canvasPainter.setStrategy(strategy);
  }

  /**
   * Update paint behavior
   */
  updateBehavior(behavior: any): void {
    this.canvasPainter.setBehavior(behavior);
  }

  /**
   * Begin draft mode - collect operations without creating events
   */
  beginDraft(): void {
    this.canvasPainter.beginDraft();
  }

  /**
   * Finalize draft - create single CompoundEvent with all operations
   */
  finalizeDraft(description?: string): void {
    this.canvasPainter.finalizeDraft(description);
  }

  /**
   * Cancel draft - discard all collected operations
   */
  cancelDraft(): void {
    this.canvasPainter.cancelDraft();
  }
}
