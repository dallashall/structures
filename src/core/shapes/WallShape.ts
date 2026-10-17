/**
 * WallShape - An optional center post with a thick arm toward each joined neighbor (see ConnectionResolver)
 */

import type { BlockShape, ClipPath, FaceUVData } from './BlockShape';
import type { ModelBox } from './BoxModel';
import type { Scene, Mesh } from '@babylonjs/core';
import type { BlockStateProperties, ViewType, Vector3D, HorizontalDirection } from '../../types';
import type { BlockIndexReader } from '../BlockIndex';
import { project2D } from './BoxModel';
import { createBoxModelMesh } from '../rendering/GeometryFactory';
import { calculateWallState, isWallBlock, HORIZONTAL_DIRECTIONS } from '../ConnectionResolver';

// Minecraft's wall model: an 8-wide post and 6-wide arms, 14 high when low and 16 when tall
const POST: ModelBox = { from: [4, 4, 0], to: [12, 12, 16] };
const ARM_TOP = { low: 14, tall: 16 };

const ARM_FOOTPRINTS: Record<HorizontalDirection, { x: [number, number]; y: [number, number] }> = {
  'x+': { x: [8, 16], y: [5, 11] },
  'x-': { x: [0, 8], y: [5, 11] },
  'y+': { x: [5, 11], y: [8, 16] },
  'y-': { x: [5, 11], y: [0, 8] },
};

const hasPost = (blockState: BlockStateProperties): boolean => blockState.connections?.['z+'] !== false;

function wallBoxes(blockState: BlockStateProperties): ModelBox[] {
  const boxes = hasPost(blockState) ? [POST] : [];
  for (const direction of HORIZONTAL_DIRECTIONS) {
    const side = blockState.wallSides?.[direction] ?? 'none';
    if (side === 'none') continue;
    const { x, y } = ARM_FOOTPRINTS[direction];
    boxes.push({ from: [x[0], y[0], 0], to: [x[1], y[1], ARM_TOP[side]] });
  }
  return boxes;
}

const toSideCode = (blockState: BlockStateProperties) => (direction: HorizontalDirection): string =>
  (blockState.wallSides?.[direction] ?? 'none')[0];

class WallShapeImpl implements BlockShape {
  readonly shapeId = 'wall';

  getGeometryKey(blockState?: BlockStateProperties): string {
    const state = blockState ?? {};
    return `wall_${hasPost(state) ? 'p' : ''}${HORIZONTAL_DIRECTIONS.map(toSideCode(state)).join('')}`;
  }

  createMesh(scene: Scene, blockState: BlockStateProperties, faceUVData?: FaceUVData): Mesh | null {
    return createBoxModelMesh(scene, 'wall', wallBoxes(blockState), faceUVData);
  }

  getRotation(_blockState?: BlockStateProperties): number {
    return 0;
  }

  get2DClip(
    blockState: BlockStateProperties,
    viewType: ViewType,
    px: number,
    py: number,
    cellSize: number,
  ): ClipPath | null {
    return project2D(wallBoxes(blockState), viewType, px, py, cellSize);
  }

  deriveState(position: Vector3D, baseState: BlockStateProperties, blockIndex: BlockIndexReader): BlockStateProperties {
    const { sides, post } = calculateWallState(position, blockIndex);
    return { ...baseState, wallSides: sides, connections: { 'z+': post } };
  }

  getExportBlockId(blockId: string, _blockState: BlockStateProperties): string {
    return blockId;
  }

  matchesBlock(blockId: string): boolean {
    return isWallBlock(blockId);
  }
}

export const wallShape: BlockShape = new WallShapeImpl();
