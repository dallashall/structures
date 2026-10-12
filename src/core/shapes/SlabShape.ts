/**
 * SlabShape - Half-height slabs. A slab's state never depends on its neighbors.
 */

import type { BlockShape, ClipPath, FaceUVData } from './BlockShape';
import type { Scene, Mesh } from '@babylonjs/core';
import type { BlockStateProperties, ViewType, Vector3D } from '../../types';
import type { BlockIndexReader } from '../BlockIndex';
import { createSlabMesh } from '../rendering/GeometryFactory';

// Views that show model Z vertically, where a slab's half is visible
const Z_VERTICAL_VIEWS = new Set<ViewType>(['front', 'back', 'left', 'right']);

class SlabShapeImpl implements BlockShape {
  readonly shapeId = 'slab';

  getGeometryKey(blockState?: BlockStateProperties): string {
    const slabType = blockState?.type ?? 'bottom';
    return `slab_${slabType}`;
  }

  createMesh(
    scene: Scene,
    blockState: BlockStateProperties,
    faceUVData?: FaceUVData,
  ): Mesh | null {
    const slabType = (blockState?.type ?? 'bottom') as 'top' | 'bottom' | 'double';
    return createSlabMesh(scene, slabType, faceUVData);
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
    if (!blockState?.type) return null;
    if (blockState.type === 'double') return null;
    if (!Z_VERTICAL_VIEWS.has(viewType)) return null;

    const half = cellSize / 2;
    const right = px + cellSize;
    const bottom = py + cellSize;

    if (blockState.type === 'bottom') {
      // Canvas y grows downward, so the lower half starts at py + half
      return [
        { x: px, y: py + half },
        { x: right, y: py + half },
        { x: right, y: bottom },
        { x: px, y: bottom },
      ];
    }
    return [
      { x: px, y: py },
      { x: right, y: py },
      { x: right, y: py + half },
      { x: px, y: py + half },
    ];
  }

  deriveState(
    _position: Vector3D,
    baseState: BlockStateProperties,
    _blockIndex: BlockIndexReader,
  ): BlockStateProperties {
    return baseState;
  }

  matchesBlock(blockId: string): boolean {
    return blockId.replace('minecraft:', '').includes('slab');
  }
}

export const slabShape: BlockShape = new SlabShapeImpl();
