/**
 * BlockShape - All shape-specific logic for one kind of block (cube, slab, stair, fence, wall, torch, door)
 *
 * Renderers and the paint pipeline ask the shape instead of branching on block type.
 */

import type { Scene, Mesh } from '@babylonjs/core';
import type { BlockStateProperties, ViewType, Vector3D } from '../../types';
import type { BlockIndexReader } from '../BlockIndex';

export type ClipPolygon = { x: number; y: number }[];

// One or more polygons. Their union is the visible part of the cell.
export type ClipPath = ClipPolygon[];

export type FaceUVData = Array<{ u0: number; v0: number; u1: number; v1: number }>;

export interface BlockShape {
  readonly shapeId: string;

  /**
   * Blocks with the same key share one instanced base mesh. '' means the default cube.
   */
  getGeometryKey(blockState?: BlockStateProperties): string;

  /**
   * Null means the default cube. textureBlockId is the getTextureBlockId result that faceUVData belongs to.
   */
  createMesh(
    scene: Scene,
    blockState: BlockStateProperties,
    faceUVData?: FaceUVData,
    textureBlockId?: string,
  ): Mesh | null;

  /**
   * Radians about Babylon's Y (up) axis
   */
  getRotation(blockState?: BlockStateProperties): number;

  /**
   * Polygons in canvas pixels that the 2D views clip the cell to. Null for the full cell.
   */
  get2DClip(
    blockState: BlockStateProperties,
    viewType: ViewType,
    px: number,
    py: number,
    cellSize: number,
  ): ClipPath | null;

  /**
   * State that depends on neighbors, such as a stair's auto-join shape. It is computed on every read and never stored.
   */
  deriveState(
    position: Vector3D,
    baseState: BlockStateProperties,
    blockIndex: BlockIndexReader,
  ): BlockStateProperties;

  /**
   * The block ID export writes, from the derived state. Minecraft splits some blocks into two IDs, such as torch and wall_torch.
   */
  getExportBlockId(blockId: string, blockState: BlockStateProperties): string;

  /**
   * The catalog entry whose textures the block shows, from the derived state. A door's upper half shows its own entry.
   */
  getTextureBlockId(blockId: string, blockState: BlockStateProperties): string;

  matchesBlock(blockId: string): boolean;
}
