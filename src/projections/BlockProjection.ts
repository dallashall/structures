/**
 * BlockProjection - Optimized block index for rendering
 *
 * Exposes the BlockIndex (optimized for spatial queries).
 *
 * Reads the blocks of ModelProjection's model, so both always hold the same state
 * and an undo replays the project once.
 *
 * This projection is optimized for rendering queries:
 * - getBlocksAtLayer(axis, layer) - fast spatial queries
 * - getBlock(position) - fast position lookups
 */

import { EventEmitter } from '../core/EventEmitter';
import { modelProjection } from './ModelProjection';
import type { BlockIndex } from '../core/BlockIndex';
import type { Vector3D, BlockData } from '../types';

/**
 * BlockProjection singleton
 */
class BlockProjection extends EventEmitter {
  private static instance: BlockProjection;

  private constructor() {
    super();
    modelProjection.on('model:blocks-rebuilt', this.handleBlocksRebuilt.bind(this));
  }

  static getInstance(): BlockProjection {
    if (!BlockProjection.instance) {
      BlockProjection.instance = new BlockProjection();
    }
    return BlockProjection.instance;
  }

  private handleBlocksRebuilt(): void {
    this.emit('blocks:rebuilt');
  }

  /**
   * Apply any events appended since the last read
   */
  async ensureFresh(): Promise<void> {
    await modelProjection.ensureFresh();
  }

  /**
   * Get cached blocks (synchronous, no freshness check)
   * Use this in render loops where ensureFresh() was already called
   */
  getCached(): BlockIndex {
    return modelProjection.getCached().blocks;
  }

  /**
   * Get current block index (always fresh)
   */
  async getBlocks(): Promise<BlockIndex> {
    await this.ensureFresh();
    return modelProjection.getCached().blocks;
  }

  /**
   * Get block at position (always fresh)
   */
  async getBlock(position: Vector3D): Promise<BlockData | null> {
    await this.ensureFresh();
    return modelProjection.getCached().blocks.get(position);
  }

  /**
   * Get blocks at layer (always fresh)
   */
  async getBlocksAtLayer(axis: 'x' | 'y' | 'z', layer: number): Promise<BlockData[]> {
    await this.ensureFresh();
    return modelProjection.getCached().blocks.getBlocksAtLayer(axis, layer);
  }

  /**
   * Reset projection (clear snapshot for new project)
   */
  reset(): void {
    modelProjection.reset();
  }
}

export const blockProjection = BlockProjection.getInstance();
