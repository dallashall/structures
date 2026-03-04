import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';

/**
 * PointPaintStrategy - Single cell painting
 *
 * The simplest painting strategy - paints only the single cell where the user clicked.
 * This is the default/current behavior.
 */
export class PointPaintStrategy implements PaintStrategy {
  calculateOperations(
    startPosition: Vector3D,
    selectedBlockId: string | null,
    dimensions: Dimensions,
    _constrainAxis?: { axis: 'x' | 'y' | 'z'; value: number }
  ): PaintOperation[] {
    // Validate position is within bounds
    if (
      startPosition.x < 0 || startPosition.x >= dimensions.width ||
      startPosition.y < 0 || startPosition.y >= dimensions.height ||
      startPosition.z < 0 || startPosition.z >= dimensions.depth
    ) {
      return []; // Out of bounds, no operation
    }

    // Return single operation at clicked position
    return [
      {
        position: startPosition,
        blockType: selectedBlockId,
      },
    ];
  }
}
