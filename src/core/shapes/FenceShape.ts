/**
 * FenceShape - A center post with two rails toward each joined neighbor (see ConnectionResolver)
 */

import type { BlockShape, ClipPath, FaceUVData } from './BlockShape';
import type { ModelBox } from './BoxModel';
import type { Scene, Mesh } from '@babylonjs/core';
import type { BlockStateProperties, ViewType, Vector3D, HorizontalDirection } from '../../types';
import type { BlockIndexReader } from '../BlockIndex';
import { project2D } from './BoxModel';
import { createBoxModelMesh } from '../rendering/GeometryFactory';
import { calculateFenceConnections, isFenceBlock, HORIZONTAL_DIRECTIONS } from '../ConnectionResolver';

// Minecraft's fence model: a 4-wide post and 2-wide rails at heights 6-9 and 12-15
const POST: ModelBox = { from: [6, 6, 0], to: [10, 10, 16] };
const RAIL_HEIGHTS: Array<[number, number]> = [[6, 9], [12, 15]];

// The rail footprint toward each side, from the post's edge to the cell's edge
const RAIL_FOOTPRINTS: Record<HorizontalDirection, { x: [number, number]; y: [number, number] }> = {
  'x+': { x: [10, 16], y: [7, 9] },
  'x-': { x: [0, 6], y: [7, 9] },
  'y+': { x: [7, 9], y: [10, 16] },
  'y-': { x: [7, 9], y: [0, 6] },
};

function fenceBoxes(blockState: BlockStateProperties): ModelBox[] {
  const boxes = [POST];
  for (const direction of HORIZONTAL_DIRECTIONS) {
    if (!blockState.connections?.[direction]) continue;
    const { x, y } = RAIL_FOOTPRINTS[direction];
    for (const [bottom, top] of RAIL_HEIGHTS) {
      boxes.push({ from: [x[0], y[0], bottom], to: [x[1], y[1], top] });
    }
  }
  return boxes;
}

const isJoined = (blockState: BlockStateProperties) => (direction: HorizontalDirection): boolean =>
  blockState.connections?.[direction] === true;

class FenceShapeImpl implements BlockShape {
  readonly shapeId = 'fence';

  getGeometryKey(blockState?: BlockStateProperties): string {
    return `fence_${HORIZONTAL_DIRECTIONS.filter(isJoined(blockState ?? {})).join('')}`;
  }

  createMesh(scene: Scene, blockState: BlockStateProperties, faceUVData?: FaceUVData): Mesh | null {
    return createBoxModelMesh(scene, 'fence', fenceBoxes(blockState), faceUVData);
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
    return project2D(fenceBoxes(blockState), viewType, px, py, cellSize);
  }

  deriveState(position: Vector3D, baseState: BlockStateProperties, blockIndex: BlockIndexReader): BlockStateProperties {
    const block = blockIndex.get(position);
    const connections = calculateFenceConnections(position, block?.blockType ?? '', blockIndex);
    return { ...baseState, connections };
  }

  getExportBlockId(blockId: string, _blockState: BlockStateProperties): string {
    return blockId;
  }

  matchesBlock(blockId: string): boolean {
    return isFenceBlock(blockId);
  }
}

export const fenceShape: BlockShape = new FenceShapeImpl();
