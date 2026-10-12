import type { PaintBehavior } from './PaintBehavior';
import type { PaintOperation } from '../strategies/PaintStrategy';
import type { Vector3D } from '../../../types';

export class NormalBehavior implements PaintBehavior {
  async filter(
    operations: PaintOperation[],
    _getBlock: (position: Vector3D) => Promise<string | null>
  ): Promise<PaintOperation[]> {
    return operations;
  }

  filterSync(
    operations: PaintOperation[],
    _getBlock: (position: Vector3D) => string | null
  ): PaintOperation[] {
    return operations;
  }
}
