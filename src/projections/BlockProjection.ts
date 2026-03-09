import { EventEmitter } from '../core/EventEmitter';
import { modelHistory } from '../core/ModelHistory';
import { eventLog } from '../core/EventLog';
import { BlockIndex } from '../core/BlockIndex';
import type { Vector3D, BlockData } from '../types';

/**
 * BlockProjection - Materializes block model from ModelHistory
 *
 * Consumes events from ModelHistory:
 * - block:placed → adds block to index
 * - block:removed → removes block from index
 * - compound → processes child events
 *
 * Also subscribes to EventLog for dimension changes:
 * - dimension:expanded → shifts blocks if needed
 * - dimension:shrunk → shifts blocks if needed
 *
 * This is a READ MODEL (projection) - it materializes state from events.
 * It does not handle commands or append events.
 *
 * Cross-cutting concern: Dimension events live in EventLog (metadata)
 * but affect BlockProjection (must shift blocks when dimensions change).
 */
class BlockProjection extends EventEmitter {
  private static instance: BlockProjection;
  private blocks: BlockIndex = new BlockIndex();

  private constructor() {
    super();

    // Rebuild when ModelHistory changes (block events)
    modelHistory.on('model:updated', () => this.rebuildFromModelHistory());

    // Listen for dimension changes from EventLog (cross-cutting concern)
    eventLog.on('event:appended', (event) => {
      if (event.type === 'dimension:expanded' || event.type === 'dimension:shrunk') {
        this.handleDimensionChange(event);
      }
    });

    // Initial rebuild
    this.rebuildFromModelHistory();
  }

  static getInstance(): BlockProjection {
    if (!BlockProjection.instance) {
      BlockProjection.instance = new BlockProjection();
    }
    return BlockProjection.instance;
  }

  /**
   * Rebuild blocks from ModelHistory events
   */
  private rebuildFromModelHistory(): void {
    const events = modelHistory.replayEvents(modelHistory.getCurrentProjectId() || '');

    // Get blocks from replayed state
    if (events) {
      this.blocks = events.blocks;
    } else {
      this.blocks = new BlockIndex();
    }

    this.emit('blocks:updated');
  }

  /**
   * Handle dimension change from EventLog (cross-cutting concern)
   */
  private handleDimensionChange(
    event: { type: 'dimension:expanded' | 'dimension:shrunk'; payload: { shift: Vector3D } }
  ): void {
    const { shift } = event.payload;

    // If shift is needed, move all blocks
    if (shift.x !== 0 || shift.y !== 0 || shift.z !== 0) {
      const newBlocks = new BlockIndex();

      this.blocks.forEach((block) => {
        const newPos: Vector3D = {
          x: block.position.x + shift.x,
          y: block.position.y + shift.y,
          z: block.position.z + shift.z,
        };

        newBlocks.set(newPos, {
          ...block,
          position: newPos,
        });
      });

      this.blocks = newBlocks;
      this.emit('blocks:updated');
    }
  }

  /**
   * Get current block index
   */
  getBlocks(): BlockIndex {
    return this.blocks;
  }

  /**
   * Get block at position (convenience method)
   */
  getBlock(position: Vector3D): BlockData | null {
    return this.blocks.get(position);
  }

  /**
   * Get blocks at layer (convenience method)
   */
  getBlocksAtLayer(axis: 'x' | 'y' | 'z', layer: number): BlockData[] {
    return this.blocks.getBlocksAtLayer(axis, layer);
  }
}

export const blockProjection = BlockProjection.getInstance();
