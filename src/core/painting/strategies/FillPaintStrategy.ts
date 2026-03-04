import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';
import { projectManager } from '../../ProjectManager';

/**
 * FillPaintStrategy - Flood fill painting
 *
 * Implements a 2D flood fill algorithm constrained to the current layer/plane.
 * Fills all connected cells of the same block type on a single 2D plane.
 * Bounded by existing blocks and the edges of the plane.
 *
 * Uses stack-based approach (not recursion) to avoid stack overflow on large fills.
 */
export class FillPaintStrategy implements PaintStrategy {
  calculateOperations(
    startPosition: Vector3D,
    selectedBlockId: string | null,
    dimensions: Dimensions,
    constrainAxis?: { axis: 'x' | 'y' | 'z'; value: number }
  ): PaintOperation[] {
    // Validate start position
    if (
      startPosition.x < 0 || startPosition.x >= dimensions.width ||
      startPosition.y < 0 || startPosition.y >= dimensions.height ||
      startPosition.z < 0 || startPosition.z >= dimensions.depth
    ) {
      return [];
    }

    const project = projectManager.getProject();
    if (!project) return [];

    // Get the block type at start position (what we're filling over)
    const startBlock = projectManager.getBlock(startPosition);
    const targetBlockType = startBlock ? startBlock.blockType : null;

    // If trying to fill with the same block type, no-op
    if (targetBlockType === selectedBlockId) {
      return [];
    }

    // Flood fill using stack-based approach
    const operations: PaintOperation[] = [];
    const visited = new Set<string>();
    const stack: Vector3D[] = [startPosition];

    const getKey = (pos: Vector3D) => `${pos.x},${pos.y},${pos.z}`;

    while (stack.length > 0) {
      const current = stack.pop()!;
      const key = getKey(current);

      // Skip if already visited
      if (visited.has(key)) continue;
      visited.add(key);

      // Check if position is valid
      if (
        current.x < 0 || current.x >= dimensions.width ||
        current.y < 0 || current.y >= dimensions.height ||
        current.z < 0 || current.z >= dimensions.depth
      ) {
        continue;
      }

      // Check if current block matches target type
      const currentBlock = projectManager.getBlock(current);
      const currentBlockType = currentBlock ? currentBlock.blockType : null;

      if (currentBlockType !== targetBlockType) {
        continue; // Different block type, don't fill
      }

      // Add operation
      operations.push({
        position: current,
        blockType: selectedBlockId,
      });

      // Add neighbors to stack based on constrained plane
      if (constrainAxis) {
        // 2D fill on a constrained plane (4 neighbors only)
        const neighbors = this.get2DNeighbors(current, constrainAxis);
        stack.push(...neighbors);
      } else {
        // 3D fill - all 6 directions
        stack.push({ ...current, x: current.x + 1 }); // Right
        stack.push({ ...current, x: current.x - 1 }); // Left
        stack.push({ ...current, y: current.y + 1 }); // Forward
        stack.push({ ...current, y: current.y - 1 }); // Backward
        stack.push({ ...current, z: current.z + 1 }); // Up
        stack.push({ ...current, z: current.z - 1 }); // Down
      }
    }

    return operations;
  }

  /**
   * Get 4 neighbors on a 2D plane (constrained to one axis value)
   */
  private get2DNeighbors(
    pos: Vector3D,
    constrainAxis: { axis: 'x' | 'y' | 'z'; value: number }
  ): Vector3D[] {
    const neighbors: Vector3D[] = [];

    switch (constrainAxis.axis) {
      case 'x':
        // X is constant, vary Y and Z (4 neighbors)
        neighbors.push({ x: constrainAxis.value, y: pos.y + 1, z: pos.z }); // Forward
        neighbors.push({ x: constrainAxis.value, y: pos.y - 1, z: pos.z }); // Backward
        neighbors.push({ x: constrainAxis.value, y: pos.y, z: pos.z + 1 }); // Up
        neighbors.push({ x: constrainAxis.value, y: pos.y, z: pos.z - 1 }); // Down
        break;
      case 'y':
        // Y is constant, vary X and Z (4 neighbors)
        neighbors.push({ x: pos.x + 1, y: constrainAxis.value, z: pos.z }); // Right
        neighbors.push({ x: pos.x - 1, y: constrainAxis.value, z: pos.z }); // Left
        neighbors.push({ x: pos.x, y: constrainAxis.value, z: pos.z + 1 }); // Up
        neighbors.push({ x: pos.x, y: constrainAxis.value, z: pos.z - 1 }); // Down
        break;
      case 'z':
        // Z is constant, vary X and Y (4 neighbors)
        neighbors.push({ x: pos.x + 1, y: pos.y, z: constrainAxis.value }); // Right
        neighbors.push({ x: pos.x - 1, y: pos.y, z: constrainAxis.value }); // Left
        neighbors.push({ x: pos.x, y: pos.y + 1, z: constrainAxis.value }); // Forward
        neighbors.push({ x: pos.x, y: pos.y - 1, z: constrainAxis.value }); // Backward
        break;
    }

    return neighbors;
  }
}
