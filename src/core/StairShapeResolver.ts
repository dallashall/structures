/**
 * StairShapeResolver - Mirror the actual Minecraft logic
 *
 * A stair has a "front" (short step side, = facing direction) and
 * a "back" (tall side, = opposite of facing).
 *
 * Rules:
 * 1. Check front neighbor: perpendicular stair there → INNER corner
 *    (our back stays tall; the extra quarter is on the neighbor's back side)
 * 2. Check back neighbor: perpendicular stair there → OUTER corner
 *    (only one quarter stays tall, on the neighbor's back side)
 * 3. Only same-half stairs join (bottom with bottom, top with top)
 */

import type { Vector3D, HorizontalDirection } from '../types';
import type { BlockIndexReader } from './BlockIndex';
import { directionToOffset, oppositeDirection, addOffset } from './DirectionMath';

function isStairBlock(blockId: string): boolean {
  return blockId.replace('minecraft:', '').includes('stair');
}

/**
 * Returns shape string encoding the geometry directly:
 *   "straight_{facing}"
 *   "{inner|outer}_{facing}_{cornerEdge}"
 *
 * cornerEdge = the neighbor's back (tall side), which is the axis
 * direction where the extra/remaining quarter block goes.
 *
 * Example: "inner_y+_x-" means:
 *   - Inner corner, we face y+
 *   - The extra front quarter is on the x- side
 *     (because the connecting neighbor's tall side faces x-)
 */
export function calculateStairShape(
  position: Vector3D,
  facing: HorizontalDirection,
  half: 'top' | 'bottom',
  blockIndex: BlockIndexReader,
): string {
  const backDir = oppositeDirection(facing);

  // Check FRONT neighbor (step / half-block side)
  const frontPos = addOffset(position, directionToOffset(facing));
  const frontNeighbor = blockIndex.get(frontPos);

  if (frontNeighbor && isStairBlock(frontNeighbor.blockType)) {
    const nFacing = frontNeighbor.blockState?.facing as HorizontalDirection | undefined;
    const nHalf = frontNeighbor.blockState?.half as 'top' | 'bottom' | undefined;

    if (nFacing && nHalf === half && nFacing !== facing && nFacing !== oppositeDirection(facing)) {
      const cornerEdge = oppositeDirection(nFacing);
      return `inner_${facing}_${cornerEdge}`;
    }
  }

  // Check BACK neighbor (tall / full-block side)
  const backPos = addOffset(position, directionToOffset(backDir));
  const backNeighbor = blockIndex.get(backPos);

  if (backNeighbor && isStairBlock(backNeighbor.blockType)) {
    const nFacing = backNeighbor.blockState?.facing as HorizontalDirection | undefined;
    const nHalf = backNeighbor.blockState?.half as 'top' | 'bottom' | undefined;

    if (nFacing && nHalf === half && nFacing !== facing && nFacing !== oppositeDirection(facing)) {
      const cornerEdge = oppositeDirection(nFacing);
      return `outer_${facing}_${cornerEdge}`;
    }
  }

  return `straight_${facing}`;
}
