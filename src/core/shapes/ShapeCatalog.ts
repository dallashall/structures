/**
 * ShapeCatalog - Maps block IDs to their BlockShape
 *
 * Singleton that resolves which shape handler applies to a given block.
 * Shapes are checked in priority order (most specific first), with
 * CubeShape as the fallback. Results are cached per block ID.
 */

import type { BlockShape } from './BlockShape';
import type { BlockIndexReader } from '../BlockIndex';
import type { BlockData } from '../../types';
import { cubeShape } from './CubeShape';
import { slabShape } from './SlabShape';
import { stairShape } from './StairShape';

class ShapeCatalogImpl {
  private static instance: ShapeCatalogImpl;

  /** Shapes in priority order — first match wins */
  private readonly shapes: BlockShape[] = [
    stairShape,
    slabShape,
    // Future: doorShape, fenceShape, etc.
  ];

  private readonly cache = new Map<string, BlockShape>();

  private constructor() {}

  static getInstance(): ShapeCatalogImpl {
    if (!ShapeCatalogImpl.instance) {
      ShapeCatalogImpl.instance = new ShapeCatalogImpl();
    }
    return ShapeCatalogImpl.instance;
  }

  /**
   * Central derivation point: resolve the complete block state for a position.
   * Looks up the block, finds its shape, and computes derived state reactively.
   * Returns null if no block exists at the position.
   *
   * ALL consumers that need derived state (renderers, preview, canvas)
   * should call this instead of computing state themselves.
   */
  resolveBlockState(position: { x: number; y: number; z: number }, blockIndex: BlockIndexReader): BlockData | null {
    const block = blockIndex.get(position);
    if (!block) return null;

    const shape = this.resolve(block.blockType);
    const derived = shape.deriveState(position, block.blockState ?? {}, blockIndex);
    return { ...block, blockState: derived };
  }

  /**
   * Resolve the shape for a block ID.
   * Checks registered shapes in priority order, falls back to CubeShape.
   */
  resolve(blockId: string): BlockShape {
    const cached = this.cache.get(blockId);
    if (cached) return cached;

    for (const shape of this.shapes) {
      if (shape.matchesBlock(blockId)) {
        this.cache.set(blockId, shape);
        return shape;
      }
    }

    this.cache.set(blockId, cubeShape);
    return cubeShape;
  }
}

export const shapeCatalog = ShapeCatalogImpl.getInstance();
