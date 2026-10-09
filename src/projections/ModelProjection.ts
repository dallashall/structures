/**
 * ModelProjection - Materializes model state from event log
 *
 * Maintains snapshot of:
 * - dimensions (width, height, depth)
 * - blocks (BlockIndex)
 * - metaBlock (position, direction, isConfirmed)
 *
 * Applies new model:* events in place. An undo or redo replays the whole project.
 *
 * Notifications:
 * - model:rebuilt - any model state may differ
 * - model:blocks-rebuilt - blocks may differ. BlockProjection forwards it as blocks:rebuilt.
 */

import { EventEmitter } from '../core/EventEmitter';
import { eventLog, type Event } from '../core/EventLog';
import { ModelReplayer } from './ModelReplayer';
import type { Model } from '../reducers/modelReducer';
import type { BlockIndex } from '../core/BlockIndex';
import type { Dimensions, MetaBlock } from '../types';

// Events that change blocks. Dimension changes shift or drop blocks.
const BLOCK_EVENT_TYPES = [
  'model:blockPlaced',
  'model:blockRemoved',
  'model:blocksPlaced',
  'model:blocksRemoved',
  'model:dimensionExpanded',
  'model:dimensionShrunk',
];

export type { Model };

/**
 * ModelProjection singleton
 */
class ModelProjection extends EventEmitter {
  private static instance: ModelProjection;

  private replayer = new ModelReplayer(this.handleReplayed.bind(this));

  private constructor() {
    super();

    eventLog.on('event:appended', this.handleEvent.bind(this));
    void this.replayer.ensureFresh();
  }

  static getInstance(): ModelProjection {
    if (!ModelProjection.instance) {
      ModelProjection.instance = new ModelProjection();
    }
    return ModelProjection.instance;
  }

  private handleEvent(event: Event): void {
    if (this.replayer.receive(event) !== 'applied') return;

    if (BLOCK_EVENT_TYPES.includes(event.type)) {
      this.emit('model:blocks-rebuilt');
    }
    this.emit('model:rebuilt');
  }

  private handleReplayed(): void {
    this.emit('model:blocks-rebuilt');
    this.emit('model:rebuilt');
  }

  /**
   * Apply any events appended since the last read
   */
  async ensureFresh(): Promise<void> {
    await this.replayer.ensureFresh();
  }

  /**
   * Get current model state (always fresh)
   */
  async getModel(): Promise<Model> {
    await this.ensureFresh();

    return this.toModel();
  }

  /**
   * Get cached model (synchronous, no freshness check)
   * Use in render loops where ensureFresh() was already called
   */
  getCached(): Model {
    return this.toModel();
  }

  /**
   * Get dimensions (always fresh)
   */
  async getDimensions(): Promise<Dimensions> {
    await this.ensureFresh();
    return this.replayer.getModel().dimensions;
  }

  /**
   * Get blocks (always fresh)
   */
  async getBlocks(): Promise<BlockIndex> {
    await this.ensureFresh();
    return this.replayer.getModel().blocks;
  }

  /**
   * Get meta block (always fresh)
   */
  async getMetaBlock(): Promise<MetaBlock> {
    await this.ensureFresh();
    return this.replayer.getModel().metaBlock;
  }

  /**
   * Reset projection (clear snapshot for new project)
   */
  reset(): void {
    this.replayer.reset();
  }

  // A copy of the top-level fields, so a later replay cannot change what a caller holds
  private toModel(): Model {
    const { dimensions, blocks, metaBlock } = this.replayer.getModel();
    return { dimensions, blocks, metaBlock };
  }
}

export const modelProjection = ModelProjection.getInstance();
