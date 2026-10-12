import type { PaintOperation } from '../strategies/PaintStrategy';
import type { Vector3D } from '../../../types';

/**
 * PaintBehavior - Decides which of a strategy's operations run, given the blocks already placed
 *
 * A strategy decides where a stroke lands. A behavior decides whether each cell may change.
 * getBlock returns null for an empty cell.
 */
export interface PaintBehavior {
  filter(
    operations: PaintOperation[],
    getBlock: (position: Vector3D) => Promise<string | null>
  ): Promise<PaintOperation[]>;

  filterSync(
    operations: PaintOperation[],
    getBlock: (position: Vector3D) => string | null
  ): PaintOperation[];
}
