import type { PaintBehavior } from './PaintBehavior';
import type { PaintOperation } from '../strategies/PaintStrategy';
import type { Vector3D } from '../../../types';

export class OnlyReplaceBehavior implements PaintBehavior {
  async filter(
    operations: PaintOperation[],
    getBlock: (position: Vector3D) => Promise<string | null>
  ): Promise<PaintOperation[]> {
    const results: PaintOperation[] = [];
    for (const op of operations) {
      const existingBlock = await getBlock(op.position);
      if (existingBlock !== null) {
        results.push(op);
      }
    }
    return results;
  }

  filterSync(
    operations: PaintOperation[],
    getBlock: (position: Vector3D) => string | null
  ): PaintOperation[] {
    const results: PaintOperation[] = [];
    for (const op of operations) {
      const existingBlock = getBlock(op.position);
      if (existingBlock !== null) {
        results.push(op);
      }
    }
    return results;
  }
}
