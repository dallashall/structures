/**
 * Canvas2DPreviewManager - Manages preview state for 2D canvas
 *
 * TODO: Refactor to use DraftingService directly
 * This is a temporary adapter layer
 */

import { draftingService } from '../DraftingService';
import type { Canvas2DViewport } from './Canvas2DViewport';
import type { CanvasPainter } from '../painting/CanvasPainter';

export class Canvas2DPreviewManager {
  private lastGridX = -1;
  private lastGridY = -1;
  private outlineDragStart: { x: number; y: number } | null = null;

  constructor(
    _viewport: Canvas2DViewport,
    _painter: CanvasPainter,
  ) {}

  /**
   * Update point preview (single block preview)
   */
  updatePointPreview(gridX: number, gridY: number): void {
    // TODO: Use DraftingService
    this.lastGridX = gridX;
    this.lastGridY = gridY;
  }

  /**
   * Update last grid position
   */
  updateLastGridPosition(gridX: number, gridY: number): void {
    this.lastGridX = gridX;
    this.lastGridY = gridY;
  }

  /**
   * Clear point preview
   */
  clearPointPreview(): void {
    draftingService.cancel();
  }

  /**
   * Start outline drag (for outline/filled modes)
   */
  startOutlineDrag(gridX: number, gridY: number): void {
    this.outlineDragStart = { x: gridX, y: gridY };
    draftingService.start();
  }

  /**
   * Clear all previews
   */
  clearAll(): void {
    draftingService.cancel();
    this.outlineDragStart = null;
  }

  /**
   * Activate preview key (for showing outline while dragging)
   */
  activatePreviewKey(): void {
    // TODO: Implement preview key visualization
  }

  /**
   * Deactivate preview key
   */
  deactivatePreviewKey(): void {
    // TODO: Implement preview key visualization
  }

  /**
   * Get preview blocks for rendering
   */
  getPreviewBlocks(): Array<{ position: { x: number; y: number; z: number }; blockType: string | null }> {
    return draftingService.getPreview();
  }

  /**
   * Get outline preview (for outline/filled mode)
   */
  getOutlinePreview(): { start: { gridX: number; gridY: number }; end: { gridX: number; gridY: number } } | null {
    if (!this.outlineDragStart) return null;
    return {
      start: { gridX: this.outlineDragStart.x, gridY: this.outlineDragStart.y },
      end: { gridX: this.lastGridX, gridY: this.lastGridY },
    };
  }

  /**
   * Get point preview (for point mode)
   */
  getPointPreview(): { gridX: number; gridY: number } | null {
    if (this.lastGridX === -1 || this.lastGridY === -1) return null;
    return { gridX: this.lastGridX, gridY: this.lastGridY };
  }
}
