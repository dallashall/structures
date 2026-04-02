/**
 * StairShapeResolver - Pure functions for calculating stair shape from neighbors
 *
 * Implements Minecraft Java Edition's stair auto-join algorithm:
 * - Check the block in front (in facing direction): outer corners
 * - Check the block behind (opposite facing): inner corners
 * - Otherwise: straight
 *
 * Shape depends only on neighbors' facing and half — never cascades.
 */

import type { Vector3D, HorizontalDirection } from '../types';
import type { BlockIndexReader } from './BlockIndex';
import {
  directionToOffset,
  oppositeDirection,
  rotateLeft,
  rotateRight,
  addOffset,
} from './DirectionMath';

type StairShape = 'straight' | 'inner_left' | 'inner_right' | 'outer_left' | 'outer_right';

/**
 * Check if a block ID is a stair block.
 * Used internally by the shape algorithm — external code should use ShapeCatalog.
 */
function isStairBlock(blockId: string): boolean {
  return blockId.replace('minecraft:', '').includes('stair');
}

/**
 * Calculate the stair shape for a block at the given position,
 * based on neighboring stairs in the block index.
 */
export function calculateStairShape(
  position: Vector3D,
  facing: HorizontalDirection,
  half: 'top' | 'bottom',
  blockIndex: BlockIndexReader,
): StairShape {
  // Check block in front (in the facing direction)
  const frontPos = addOffset(position, directionToOffset(facing));
  const frontBlock = blockIndex.get(frontPos);

  if (frontBlock && isStairBlock(frontBlock.blockType)) {
    const frontState = frontBlock.blockState;
    const frontFacing = frontState?.facing as HorizontalDirection | undefined;
    const frontHalf = frontState?.half as 'top' | 'bottom' | undefined;

    if (frontFacing && frontHalf === half) {
      if (frontFacing === rotateLeft(facing)) return 'outer_left';
      if (frontFacing === rotateRight(facing)) return 'outer_right';
    }
  }

  // Check block behind (opposite the facing direction)
  const behindPos = addOffset(position, directionToOffset(oppositeDirection(facing)));
  const behindBlock = blockIndex.get(behindPos);

  if (behindBlock && isStairBlock(behindBlock.blockType)) {
    const behindState = behindBlock.blockState;
    const behindFacing = behindState?.facing as HorizontalDirection | undefined;
    const behindHalf = behindState?.half as 'top' | 'bottom' | undefined;

    if (behindFacing && behindHalf === half) {
      if (behindFacing === rotateLeft(facing)) return 'inner_left';
      if (behindFacing === rotateRight(facing)) return 'inner_right';
    }
  }

  return 'straight';
}

