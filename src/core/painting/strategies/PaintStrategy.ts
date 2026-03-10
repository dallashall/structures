import type { Vector3D, Dimensions } from '../../../types';

/**
 * PaintOperation - Represents a single paint/erase action
 */
export interface PaintOperation {
  position: Vector3D;
  blockType: string | null; // null = erase
}

/**
 * PaintStrategy - Interface for different painting modes
 *
 * Strategies define WHAT positions to paint based on user interaction.
 * Examples: point (single cell), fill (flood fill), outline (rectangle perimeter)
 *
 * Each strategy calculates which positions should be modified and returns
 * an array of operations. The strategy is agnostic to:
 * - Whether operations are allowed (handled by PaintBehavior)
 * - How operations are executed (handled by CanvasPainter)
 */
export interface PaintStrategy {
  /**
   * Calculate which positions should be painted/erased
   *
   * @param startPosition - The 3D position where user clicked/started interaction
   * @param selectedBlockId - Currently selected block type (null = erase mode)
   * @param dimensions - Project dimensions for bounds checking
   * @param constrainAxis - Optional axis to constrain operations to (for 2D fills on a plane)
   *                        Format: { axis: 'x' | 'y' | 'z', value: number }
   * @returns Array of operations to execute
   */
  calculateOperations(
    startPosition: Vector3D,
    selectedBlockId: string | null,
    dimensions: Dimensions,
    constrainAxis?: { axis: 'x' | 'y' | 'z'; value: number }
  ): PaintOperation[] | Promise<PaintOperation[]>;
}
