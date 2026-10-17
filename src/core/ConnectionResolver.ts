/**
 * ConnectionResolver - Which sides of a fence or wall join a neighbor, following Minecraft's rules
 *
 * - A fence joins fences of its own family (wooden or nether brick), fence gates, and full blocks.
 * - A wall joins walls, fence gates, and full blocks.
 * - A fence gate joins only along its own width, so on the sides its facing does not point to.
 * - A wall side is tall under a full block, or under a wall joined on the same side. Otherwise it is low.
 * - A wall shows its post unless it runs straight, or when a torch or lantern sits on it.
 */

import type { Vector3D, HorizontalDirection, BlockData, WallSide } from '../types';
import type { BlockIndexReader } from './BlockIndex';
import { directionToOffset, addOffset } from './DirectionMath';
import { shapeCatalog } from './shapes/ShapeCatalog';

export const HORIZONTAL_DIRECTIONS: HorizontalDirection[] = ['x+', 'x-', 'y+', 'y-'];

const bareId = (blockId: string): string => blockId.replace('minecraft:', '');

export const isFenceBlock = (blockId: string): boolean => bareId(blockId).endsWith('_fence');
export const isWallBlock = (blockId: string): boolean => bareId(blockId).endsWith('_wall');
const isFenceGateBlock = (blockId: string): boolean => bareId(blockId).endsWith('_fence_gate');
const isNetherFence = (blockId: string): boolean => bareId(blockId) === 'nether_brick_fence';
const supportsWallPost = (blockId: string): boolean => /torch|lantern/.test(bareId(blockId));

// shapeCatalog is read at call time, after every shape module has loaded
const isFullBlock = (blockId: string): boolean => shapeCatalog.resolve(blockId).shapeId === 'cube';

const axisOf = (direction: string): string => direction[0];

/**
 * A gate spans the axis across its facing, so it joins neighbors along that axis
 */
function gateJoins(gate: BlockData, direction: HorizontalDirection): boolean {
  const facing = gate.blockState?.facing ?? 'y-';
  return axisOf(facing) !== axisOf(direction);
}

function neighbor(position: Vector3D, direction: HorizontalDirection, blockIndex: BlockIndexReader): BlockData | null {
  return blockIndex.get(addOffset(position, directionToOffset(direction)));
}

export function calculateFenceConnections(
  position: Vector3D,
  blockId: string,
  blockIndex: BlockIndexReader,
): Record<HorizontalDirection, boolean> {
  const joins = (direction: HorizontalDirection): boolean => {
    const other = neighbor(position, direction, blockIndex);
    if (!other) return false;
    if (isFenceBlock(other.blockType)) return isNetherFence(other.blockType) === isNetherFence(blockId);
    if (isFenceGateBlock(other.blockType)) return gateJoins(other, direction);
    return isFullBlock(other.blockType);
  };
  return toDirectionRecord(joins);
}

function calculateWallConnections(position: Vector3D, blockIndex: BlockIndexReader): Record<HorizontalDirection, boolean> {
  const joins = (direction: HorizontalDirection): boolean => {
    const other = neighbor(position, direction, blockIndex);
    if (!other) return false;
    if (isWallBlock(other.blockType)) return true;
    if (isFenceGateBlock(other.blockType)) return gateJoins(other, direction);
    return isFullBlock(other.blockType);
  };
  return toDirectionRecord(joins);
}

export interface WallState {
  sides: Record<HorizontalDirection, WallSide>;
  post: boolean;
}

export function calculateWallState(position: Vector3D, blockIndex: BlockIndexReader): WallState {
  const connections = calculateWallConnections(position, blockIndex);
  const abovePosition = { ...position, z: position.z + 1 };
  const above = blockIndex.get(abovePosition);
  const aboveConnections = above && isWallBlock(above.blockType)
    ? calculateWallConnections(abovePosition, blockIndex)
    : null;

  const sideHeight = (direction: HorizontalDirection): WallSide => {
    if (!connections[direction]) return 'none';
    if (above && isFullBlock(above.blockType)) return 'tall';
    return aboveConnections?.[direction] ? 'tall' : 'low';
  };

  const runsStraight =
    (connections['x+'] && connections['x-'] && !connections['y+'] && !connections['y-']) ||
    (connections['y+'] && connections['y-'] && !connections['x+'] && !connections['x-']);

  return {
    sides: toDirectionRecord(sideHeight),
    post: !runsStraight || (above !== null && supportsWallPost(above.blockType)),
  };
}

function toDirectionRecord<T>(valueFor: (direction: HorizontalDirection) => T): Record<HorizontalDirection, T> {
  return {
    'x+': valueFor('x+'),
    'x-': valueFor('x-'),
    'y+': valueFor('y+'),
    'y-': valueFor('y-'),
  };
}
