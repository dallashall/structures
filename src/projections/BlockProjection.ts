/**
 * BlockProjection - Optimized block index for rendering
 *
 * Maintains snapshot of:
 * - BlockIndex (optimized for spatial queries)
 *
 * Applies new model:* events in place. An undo or redo replays the whole project.
 *
 * This projection is optimized for rendering queries:
 * - getBlocksAtLayer(axis, layer) - fast spatial queries
 * - getBlock(position) - fast position lookups
 */

import { EventEmitter } from '../core/EventEmitter';
import { eventLog, type Event } from '../core/EventLog';
import { ModelReplayer } from './ModelReplayer';
import type { BlockIndex } from '../core/BlockIndex';
import type { Vector3D, BlockData } from '../types';

// Events that change blocks. Dimension changes shift or drop blocks.
const BLOCK_EVENT_TYPES = [
  'model:blockPlaced',
  'model:blockRemoved',
  'model:blocksPlaced',
  'model:blocksRemoved',
  'model:dimensionExpanded',
  'model:dimensionShrunk',
];

/**
 * BlockProjection singleton
 */
class BlockProjection extends EventEmitter {
  private static instance: BlockProjection;

  private replayer = new ModelReplayer(this.handleReplayed.bind(this));

  private constructor() {
    super();

    eventLog.on('event:appended', this.handleEvent.bind(this));
    void this.replayer.ensureFresh();
  }

  static getInstance(): BlockProjection {
    if (!BlockProjection.instance) {
      BlockProjection.instance = new BlockProjection();
    }
    return BlockProjection.instance;
  }

  private handleEvent(event: Event): void {
    if (this.replayer.receive(event) === 'applied' && BLOCK_EVENT_TYPES.includes(event.type)) {
      this.emit('blocks:rebuilt');
    }
  }

  private handleReplayed(): void {
    this.emit('blocks:rebuilt');
  }

  /**
   * Apply any events appended since the last read
   */
  async ensureFresh(): Promise<void> {
    await this.replayer.ensureFresh();
  }

  /**
   * Get cached blocks (synchronous, no freshness check)
   * Use this in render loops where ensureFresh() was already called
   */
  getCached(): BlockIndex {
    return this.replayer.getModel().blocks;
  }

  /**
   * Get current block index (always fresh)
   */
  async getBlocks(): Promise<BlockIndex> {
    await this.ensureFresh();
    return this.replayer.getModel().blocks;
  }

  /**
   * Get block at position (always fresh)
   */
  async getBlock(position: Vector3D): Promise<BlockData | null> {
    await this.ensureFresh();
    return this.replayer.getModel().blocks.get(position);
  }

  /**
   * Get blocks at layer (always fresh)
   */
  async getBlocksAtLayer(axis: 'x' | 'y' | 'z', layer: number): Promise<BlockData[]> {
    await this.ensureFresh();
    return this.replayer.getModel().blocks.getBlocksAtLayer(axis, layer);
  }

  /**
   * Reset projection (clear snapshot for new project)
   */
  reset(): void {
    this.replayer.reset();
  }
}

export const blockProjection = BlockProjection.getInstance();
