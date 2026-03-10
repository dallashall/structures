import type { PaintBehavior } from './PaintBehavior';
import type { PaintOperation } from '../strategies/PaintStrategy';
import type { Vector3D } from '../../../types';

/**
 * NormalBehavior - Allow all paint operations
 *
 * The default behavior - does not filter any operations.
 * Allows painting anywhere, regardless of existing block state.
 */
export class NormalBehavior implements PaintBehavior {
  async filter(
    operations: PaintOperation[],
    _getBlock: (position: Vector3D) => Promise<string | null>
  ): Promise<PaintOperation[]> {
    // No filtering - all operations are allowed
    return operations;
  }

  filterSync(
    operations: PaintOperation[],
    _getBlock: (position: Vector3D) => string | null
  ): PaintOperation[] {
    // No filtering - all operations are allowed
    return operations;
  }
}
