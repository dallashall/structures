import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';
import { projectView } from '../../../projections/ProjectView';
import { blockProjection } from '../../../projections/BlockProjection';

/**
 * FillPaintStrategy - Flood fill of the connected cells that share the start cell's block type
 *
 * With a constrainAxis the fill stays on that layer (4 neighbors). Without one it spreads in 3D (6 neighbors).
 * An explicit stack replaces recursion, which overflows on large fills.
 */
export class FillPaintStrategy implements PaintStrategy {
  async calculateOperations(
    startPosition: Vector3D,
    selectedBlockId: string | null,
    dimensions: Dimensions,
    constrainAxis?: { axis: 'x' | 'y' | 'z'; value: number }
  ): Promise<PaintOperation[]> {
    if (
      startPosition.x < 0 || startPosition.x >= dimensions.width ||
      startPosition.y < 0 || startPosition.y >= dimensions.height ||
      startPosition.z < 0 || startPosition.z >= dimensions.depth
    ) {
      return [];
    }

    const project = await projectView.getProject();
    if (!project) return [];

    const startBlock = await blockProjection.getBlock(startPosition);
    const targetBlockType = startBlock ? startBlock.blockType : null;

    if (targetBlockType === selectedBlockId) {
      return [];
    }

    const operations: PaintOperation[] = [];
    const visited = new Set<string>();
    const stack: Vector3D[] = [startPosition];

    const getKey = (pos: Vector3D) => `${pos.x},${pos.y},${pos.z}`;

    while (stack.length > 0) {
      const current = stack.pop()!;
      const key = getKey(current);

      if (visited.has(key)) continue;
      visited.add(key);

      if (
        current.x < 0 || current.x >= dimensions.width ||
        current.y < 0 || current.y >= dimensions.height ||
        current.z < 0 || current.z >= dimensions.depth
      ) {
        continue;
      }

      const currentBlock = await blockProjection.getBlock(current);
      const currentBlockType = currentBlock ? currentBlock.blockType : null;

      if (currentBlockType !== targetBlockType) {
        continue;
      }

      operations.push({
        position: current,
        blockType: selectedBlockId,
      });

      if (constrainAxis) {
        const neighbors = this.get2DNeighbors(current, constrainAxis);
        stack.push(...neighbors);
      } else {
        stack.push({ ...current, x: current.x + 1 });
        stack.push({ ...current, x: current.x - 1 });
        stack.push({ ...current, y: current.y + 1 });
        stack.push({ ...current, y: current.y - 1 });
        stack.push({ ...current, z: current.z + 1 });
        stack.push({ ...current, z: current.z - 1 });
      }
    }

    return operations;
  }

  private get2DNeighbors(
    pos: Vector3D,
    constrainAxis: { axis: 'x' | 'y' | 'z'; value: number }
  ): Vector3D[] {
    const neighbors: Vector3D[] = [];

    switch (constrainAxis.axis) {
      case 'x':
        neighbors.push({ x: constrainAxis.value, y: pos.y + 1, z: pos.z });
        neighbors.push({ x: constrainAxis.value, y: pos.y - 1, z: pos.z });
        neighbors.push({ x: constrainAxis.value, y: pos.y, z: pos.z + 1 });
        neighbors.push({ x: constrainAxis.value, y: pos.y, z: pos.z - 1 });
        break;
      case 'y':
        neighbors.push({ x: pos.x + 1, y: constrainAxis.value, z: pos.z });
        neighbors.push({ x: pos.x - 1, y: constrainAxis.value, z: pos.z });
        neighbors.push({ x: pos.x, y: constrainAxis.value, z: pos.z + 1 });
        neighbors.push({ x: pos.x, y: constrainAxis.value, z: pos.z - 1 });
        break;
      case 'z':
        neighbors.push({ x: pos.x + 1, y: pos.y, z: constrainAxis.value });
        neighbors.push({ x: pos.x - 1, y: pos.y, z: constrainAxis.value });
        neighbors.push({ x: pos.x, y: pos.y + 1, z: constrainAxis.value });
        neighbors.push({ x: pos.x, y: pos.y - 1, z: constrainAxis.value });
        break;
    }

    return neighbors;
  }
}
