/**
 * TorchShape - A stick on the floor, or tilted out from a wall
 *
 * - The torch stands on the floor when the block below can hold it: a full block, a fence, or a wall.
 * - Otherwise it hangs on a full block beside it and faces away from that block. The stored facing wins
 *   when its wall is there, so the T key picks among several walls.
 * - With nothing to hold it, it stands on the floor.
 * A wall torch exports as Minecraft's separate wall torch block.
 */

import type { BlockShape, ClipPath, FaceUVData } from './BlockShape';
import type { ModelBox } from './BoxModel';
import type { Scene, Mesh } from '@babylonjs/core';
import type { BlockStateProperties, ViewType, Vector3D, HorizontalDirection } from '../../types';
import type { BlockIndexReader } from '../BlockIndex';
import { project2D, turnBoxesAboutZ } from './BoxModel';
import { createBoxModelMesh } from '../rendering/GeometryFactory';
import { directionToOffset, oppositeDirection, addOffset } from '../DirectionMath';
import { HORIZONTAL_DIRECTIONS, isFenceBlock, isWallBlock } from '../ConnectionResolver';
import { shapeCatalog } from './ShapeCatalog';

// Minecraft's torch model. The side texture's stick spans columns 7-9 and rows 6-16.
const FLOOR_BOXES: ModelBox[] = [{ from: [7, 7, 0], to: [9, 9, 10] }];

// Minecraft's wall torch model, facing x+: the stick leans 22.5° away from the wall at x 0.
// The UV shift maps it onto the same texture region as the floor torch.
const WALL_BOXES_X_PLUS: ModelBox[] = [{
  from: [-1, 7, 3.5],
  to: [1, 9, 13.5],
  rotation: { axis: 'y', angle: Math.PI / 8, origin: [0, 8, 3.5] },
  uvShift: [8, 0, -3.5],
}];

// Counterclockwise quarter turns from x+, seen from above
const TURNS: Record<HorizontalDirection, number> = { 'x+': 0, 'y+': 1, 'x-': 2, 'y-': 3 };

function torchBoxes(blockState: BlockStateProperties): ModelBox[] {
  const facing = blockState.facing as HorizontalDirection | undefined;
  if (!facing || !(facing in TURNS)) return FLOOR_BOXES;
  return turnBoxesAboutZ(WALL_BOXES_X_PLUS, TURNS[facing]);
}

const bareId = (blockId: string): string => blockId.replace('minecraft:', '');

// shapeCatalog is read at call time, after every shape module has loaded
const isFullBlock = (blockId: string): boolean => shapeCatalog.resolve(blockId).shapeId === 'cube';
const holdsFloorTorch = (blockId: string): boolean =>
  isFullBlock(blockId) || isFenceBlock(blockId) || isWallBlock(blockId);

/**
 * The facing of the wall torch, or null for a floor torch
 */
function calculateTorchFacing(
  position: Vector3D,
  preferred: HorizontalDirection | undefined,
  blockIndex: BlockIndexReader,
): HorizontalDirection | null {
  const below = blockIndex.get({ ...position, z: position.z - 1 });
  if (below && holdsFloorTorch(below.blockType)) return null;

  const hasWallBehind = (facing: HorizontalDirection): boolean => {
    const behind = blockIndex.get(addOffset(position, directionToOffset(oppositeDirection(facing))));
    return behind !== null && isFullBlock(behind.blockType);
  };
  if (preferred && preferred in TURNS && hasWallBehind(preferred)) return preferred;
  return HORIZONTAL_DIRECTIONS.find(hasWallBehind) ?? null;
}

class TorchShapeImpl implements BlockShape {
  readonly shapeId = 'torch';

  getGeometryKey(blockState?: BlockStateProperties): string {
    return blockState?.facing ? `torch_wall_${blockState.facing}` : 'torch_floor';
  }

  createMesh(scene: Scene, blockState: BlockStateProperties, faceUVData?: FaceUVData): Mesh | null {
    return createBoxModelMesh(scene, 'torch', torchBoxes(blockState), faceUVData);
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
    return project2D(torchBoxes(blockState), viewType, px, py, cellSize);
  }

  deriveState(position: Vector3D, baseState: BlockStateProperties, blockIndex: BlockIndexReader): BlockStateProperties {
    const facing = calculateTorchFacing(position, baseState.facing as HorizontalDirection | undefined, blockIndex);
    const derived = { ...baseState };
    if (facing) derived.facing = facing;
    else delete derived.facing;
    return derived;
  }

  getExportBlockId(blockId: string, blockState: BlockStateProperties): string {
    if (!blockState.facing || bareId(blockId).includes('wall_torch')) return blockId;
    // torch → wall_torch, soul_torch → soul_wall_torch
    return blockId.replace(/torch$/, 'wall_torch');
  }

  matchesBlock(blockId: string): boolean {
    const name = bareId(blockId);
    return name === 'torch' || name.endsWith('_torch');
  }
}

export const torchShape: BlockShape = new TorchShapeImpl();
