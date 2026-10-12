import type { PaintBehavior } from './PaintBehavior';
import type { PaintOperation } from '../strategies/PaintStrategy';
import type { Vector3D } from '../../../types';

/**
 * SelectiveReplaceBehavior - Paints only over blocks of the target type
 *
 * Without a target it passes every operation through. No caller sets a target, so it paints like NormalBehavior.
 */
export class SelectiveReplaceBehavior implements PaintBehavior {
  private targetBlockType: string | null = null;

  setTargetBlockType(blockType: string | null): void {
    this.targetBlockType = blockType;
  }

  async filter(
    operations: PaintOperation[],
    getBlock: (position: Vector3D) => Promise<string | null>
  ): Promise<PaintOperation[]> {
    if (this.targetBlockType === null) {
      return operations;
    }

    const results: PaintOperation[] = [];
    for (const op of operations) {
      const existingBlock = await getBlock(op.position);
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
    if (this.targetBlockType === null) {
      return operations;
    }

    const results: PaintOperation[] = [];
    for (const op of operations) {
      const existingBlock = getBlock(op.position);
      if (existingBlock === this.targetBlockType) {
        results.push(op);
      }
    }
    return results;
  }
}
