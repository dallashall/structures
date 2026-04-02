/**
 * BlockShape - Interface for block geometry and state behavior
 *
 * Each block type (cube, slab, stair, etc.) implements this interface
 * to encapsulate all type-specific logic in one place. Consumers
 * (renderers, pipelines, services) query the shape instead of branching
 * on block type.
 */

import type { Scene, Mesh } from '@babylonjs/core';
import type { BlockStateProperties, ViewType, Vector3D } from '../../types';
import type { BlockIndexReader } from '../BlockIndex';

export type ClipPath = { x: number; y: number }[];

export type FaceUVData = Array<{ u0: number; v0: number; u1: number; v1: number }>;

export interface BlockShape {
  readonly shapeId: string;

  /**
   * Geometry variant key for instanced mesh caching.
   * Blocks with the same key share a base mesh.
   * Returns '' for default cube geometry.
   */
  getGeometryKey(blockState?: BlockStateProperties): string;

  /**
   * Create 3D base mesh for this geometry variant.
   * Returns null to signal "use default cube geometry."
   */
  createMesh(
    scene: Scene,
    blockState: BlockStateProperties,
    faceUVData?: FaceUVData,
  ): Mesh | null;

  /**
   * Y-axis rotation in radians for per-instance orientation.
   * Returns 0 for blocks with no facing direction.
   */
  getRotation(blockState?: BlockStateProperties): number;

  /**
   * 2D clip region for orthographic canvas rendering.
   * Returns a polygon path (array of vertices) or null for full cell.
   */
  get2DClip(
    blockState: BlockStateProperties,
    viewType: ViewType,
    px: number,
    py: number,
    cellSize: number,
  ): ClipPath | null;

  /**
   * Derive the complete block state reactively from spatial context.
   * Computes shape, connections, or other derived properties by inspecting
   * the block index at read time. Never persisted — always recomputed.
   *
   * For simple blocks this is a passthrough. For stairs it computes
   * auto-join shape from neighbors.
   */
  deriveState(
    position: Vector3D,
    baseState: BlockStateProperties,
    blockIndex: BlockIndexReader,
  ): BlockStateProperties;

  /**
   * Whether this shape handles the given block ID.
   * Used by ShapeCatalog to assign shapes to blocks.
   */
  matchesBlock(blockId: string): boolean;
}
