/**
 * ShapeCatalog - Maps block IDs to their BlockShape, caching the result per ID
 */

import type { BlockShape } from './BlockShape';
import type { BlockIndexReader } from '../BlockIndex';
import type { BlockData } from '../../types';
import { cubeShape } from './CubeShape';
import { slabShape } from './SlabShape';
import { stairShape } from './StairShape';
import { fenceShape } from './FenceShape';
import { wallShape } from './WallShape';
import { torchShape } from './TorchShape';

class ShapeCatalogImpl {
  private static instance: ShapeCatalogImpl;

  // First match wins. resolve() falls back to CubeShape when none match.
  private readonly shapes: BlockShape[] = [
    stairShape,
    slabShape,
    fenceShape,
    wallShape,
    torchShape,
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
   * The one place derived block state is computed. Renderers and the 2D views call it rather than deriving state themselves.
   * Null when the position is empty.
   */
  resolveBlockState(position: { x: number; y: number; z: number }, blockIndex: BlockIndexReader): BlockData | null {
    const block = blockIndex.get(position);
    if (!block) return null;

    const shape = this.resolve(block.blockType);
    const derived = shape.deriveState(position, block.blockState ?? {}, blockIndex);
    return { ...block, blockState: derived };
  }

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
