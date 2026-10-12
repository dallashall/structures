import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';

export class PointPaintStrategy implements PaintStrategy {
  calculateOperations(
    startPosition: Vector3D,
    selectedBlockId: string | null,
    dimensions: Dimensions,
    _constrainAxis?: { axis: 'x' | 'y' | 'z'; value: number }
  ): PaintOperation[] {
    if (
      startPosition.x < 0 || startPosition.x >= dimensions.width ||
      startPosition.y < 0 || startPosition.y >= dimensions.height ||
      startPosition.z < 0 || startPosition.z >= dimensions.depth
    ) {
      return [];
    }

    return [
      {
        position: startPosition,
        blockType: selectedBlockId,
      },
    ];
  }
}
