import type { PaintBehavior } from './PaintBehavior';
import type { PaintOperation } from '../strategies/PaintStrategy';
import type { Vector3D } from '../../../types';

/**
 * SelectiveReplaceBehavior - Only replace blocks of a specific type
 *
 * Filters operations to only affect blocks matching a target type.
 * Requires a target block type to be set.
 *
 * Use case: Replace all instances of stone with dirt, without affecting other blocks.
 *
 * Future enhancement: Add UI to set targetBlockType dynamically.
 */
export class SelectiveReplaceBehavior implements PaintBehavior {
  private targetBlockType: string | null = null;

  /**
   * Set the target block type to replace
   */
  setTargetBlockType(blockType: string | null): void {
    this.targetBlockType = blockType;
  }

  async filter(
    operations: PaintOperation[],
    getBlock: (position: Vector3D) => Promise<string | null>
  ): Promise<PaintOperation[]> {
    // If no target set, behave like normal (no filtering)
    if (this.targetBlockType === null) {
      return operations;
    }

    const results: PaintOperation[] = [];
    for (const op of operations) {
      const existingBlock = await getBlock(op.position);
      // Only allow if existing block matches target type
      if (existingBlock === this.targetBlockType) {
        results.push(op);
      }
    }
    return results;
  }

  filterSync(
    operations: PaintOperation[],
    getBlock: (position: Vector3D) => string | null
  ): PaintOperation[] {
    // If no target set, behave like normal (no filtering)
    if (this.targetBlockType === null) {
      return operations;
    }

    const results: PaintOperation[] = [];
    for (const op of operations) {
      const existingBlock = getBlock(op.position);
      // Only allow if existing block matches target type
      if (existingBlock === this.targetBlockType) {
        results.push(op);
      }
    }
    return results;
  }
}
