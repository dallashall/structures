/**
 * SlabShape - Shape behavior for half-height slab blocks
 *
 * Provides 2D clipping (half-cell in side views) and geometry key.
 * Delegates mesh creation to GeometryFactory.createSlabMesh().
 * No auto-join or neighbor updates.
 */

import type { BlockShape, ClipPath, FaceUVData } from './BlockShape';
import type { Scene, Mesh } from '@babylonjs/core';
import type { BlockStateProperties, ViewType, Vector3D } from '../../types';
import type { BlockIndexReader } from '../BlockIndex';
import { createSlabMesh } from '../rendering/GeometryFactory';

/**
 * Views where Z (height) is on the vertical grid axis.
 * In these views, slab top/bottom affects the visible rendering area.
 */
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

  /**
   * In side views (Z vertical): bottom slab clips to lower half,
   * top slab clips to upper half. Double slab = no clip.
   * In top/bottom views: slabs look like full blocks.
   */
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
      // Bottom slab: lower half of cell (higher py since Y increases downward on canvas)
      return [
        { x: px, y: py + half },
        { x: right, y: py + half },
        { x: right, y: bottom },
        { x: px, y: bottom },
      ];
    }
    // Top slab: upper half of cell
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
