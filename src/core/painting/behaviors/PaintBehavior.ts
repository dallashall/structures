import type { PaintOperation } from '../strategies/PaintStrategy';
import type { Vector3D } from '../../../types';

/**
 * PaintBehavior - Interface for filtering paint operations
 *
 * Behaviors define WHEN to allow painting based on existing block state.
 * Examples: normal (always allow), only-replace (only over blocks), selective-replace (specific types)
 *
 * Behaviors filter the operations calculated by PaintStrategy, deciding which
 * operations should actually be executed based on project state.
 */
export interface PaintBehavior {
  /**
   * Filter paint operations based on behavior rules
   *
   * @param operations - Proposed operations from strategy
   * @param getBlock - Function to query existing block at position
   * @returns Filtered operations that should be executed
   */
  filter(
    operations: PaintOperation[],
    getBlock: (position: Vector3D) => string | null
  ): PaintOperation[];
}
