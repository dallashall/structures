/**
 * BlockProjection - Block reads for renderers. It holds no state of its own: it reads the blocks of
 * ModelProjection's model, so both always agree and an undo replays the project once.
 *
 * Events:
 * - blocks:rebuilt - forwarded from ModelProjection's model:blocks-rebuilt
 */

import { EventEmitter } from '../core/EventEmitter';
import { modelProjection } from './ModelProjection';
import type { BlockIndex } from '../core/BlockIndex';
import type { Vector3D, BlockData } from '../types';

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

  async ensureFresh(): Promise<void> {
    await modelProjection.ensureFresh();
  }

  // No freshness check, for render paths that already awaited ensureFresh()
  getCached(): BlockIndex {
    return modelProjection.getCached().blocks;
  }

  async getBlocks(): Promise<BlockIndex> {
    await this.ensureFresh();
    return modelProjection.getCached().blocks;
  }

  async getBlock(position: Vector3D): Promise<BlockData | null> {
    await this.ensureFresh();
    return modelProjection.getCached().blocks.get(position);
  }

  async getBlocksAtLayer(axis: 'x' | 'y' | 'z', layer: number): Promise<BlockData[]> {
    await this.ensureFresh();
    return modelProjection.getCached().blocks.getBlocksAtLayer(axis, layer);
  }

  reset(): void {
    modelProjection.reset();
  }
}

export const blockProjection = BlockProjection.getInstance();
