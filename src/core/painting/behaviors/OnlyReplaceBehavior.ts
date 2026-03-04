import type { PaintBehavior } from './PaintBehavior';
import type { PaintOperation } from '../strategies/PaintStrategy';
import type { Vector3D } from '../../../types';

/**
 * OnlyReplaceBehavior - Only paint over existing blocks
 *
 * Filters out operations on empty cells.
 * Only allows painting where a block already exists.
 *
 * Use case: Replace existing blocks without filling empty space.
 */
export class OnlyReplaceBehavior implements PaintBehavior {
  filter(
    operations: PaintOperation[],
    getBlock: (position: Vector3D) => string | null
  ): PaintOperation[] {
    return operations.filter((op) => {
      const existingBlock = getBlock(op.position);
      // Only allow if there's an existing block (not null/empty)
      return existingBlock !== null;
    });
  }
}
