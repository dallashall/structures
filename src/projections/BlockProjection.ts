/**
 * BlockProjection - Optimized block index for rendering
 *
 * Maintains snapshot of:
 * - BlockIndex (optimized for spatial queries)
 *
 * Rebuilds incrementally from snapshot when new model:blockPlaced/model:blockRemoved events arrive.
 * Creates new snapshot every 15 events to optimize replay performance.
 *
 * This projection is optimized for rendering queries:
 * - getBlocksAtLayer(axis, layer) - fast spatial queries
 * - getBlock(position) - fast position lookups
 */

import { EventEmitter } from '../core/EventEmitter';
import { eventLog, type Event } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import { BlockIndex } from '../core/BlockIndex';
import type { Vector3D, BlockData, BlockStateProperties } from '../types';

const SNAPSHOT_THRESHOLD = 15; // Create new snapshot after N events

interface BlockSnapshot {
  latestEventId: number;
  blocks: BlockIndex;
}

/**
 * BlockProjection singleton
 */
class BlockProjection extends EventEmitter {
  private static instance: BlockProjection;

  private snapshot: BlockSnapshot = {
    latestEventId: 0,
    blocks: new BlockIndex(),
  };

  private eventsSinceSnapshot = 0;

  private constructor() {
    super();

    // Listen to event log
    eventLog.on('event:appended', this.handleEvent.bind(this));

    // Initial rebuild from event log
    this.rebuild();
  }

  static getInstance(): BlockProjection {
    if (!BlockProjection.instance) {
      BlockProjection.instance = new BlockProjection();
    }
    return BlockProjection.instance;
  }

  /**
   * Handle new event from log
   */
  private handleEvent(event: Event): void {
    // Only process block events (both single and bulk)
    const blockEventTypes = [
      'model:blockPlaced',
      'model:blockRemoved',
      'model:blocksPlaced',
      'model:blocksRemoved',
    ];

    if (!blockEventTypes.includes(event.type)) {
      return;
    }

    // Only process events for current project
    const currentProjectId = editorState.getCurrentProjectId();
    if (event.projectId !== currentProjectId) {
      return;
    }

    // Apply event to snapshot
    this.applyEvent(event);
    this.eventsSinceSnapshot++;

    // Create new snapshot if threshold reached
    if (this.eventsSinceSnapshot >= SNAPSHOT_THRESHOLD) {
      this.createSnapshot();
      this.eventsSinceSnapshot = 0;
    }

    // Notify listeners
    this.emit('blocks:rebuilt');
  }

  /**
   * Apply single event to snapshot
   */
  private applyEvent(event: Event): void {
    switch (event.type) {
      case 'model:blockPlaced': {
        const data = event.data as { position: Vector3D; blockType: string; blockState?: BlockStateProperties };
        this.snapshot.blocks.set(data.position, {
          position: data.position,
          blockType: data.blockType,
          blockState: data.blockState,
        });
        this.snapshot.latestEventId = event.id!;
        break;
      }

      case 'model:blockRemoved': {
        const data = event.data as { position: Vector3D };
        this.snapshot.blocks.delete(data.position);
        this.snapshot.latestEventId = event.id!;
        break;
      }

      case 'model:blocksPlaced': {
        const data = event.data as { blocks: Array<{ position: Vector3D; blockType: string; blockState?: BlockStateProperties }> };
        for (const block of data.blocks) {
          this.snapshot.blocks.set(block.position, {
            position: block.position,
            blockType: block.blockType,
            blockState: block.blockState,
          });
        }
        this.snapshot.latestEventId = event.id!;
        break;
      }

      case 'model:blocksRemoved': {
        const data = event.data as { positions: Vector3D[] };
        for (const position of data.positions) {
          this.snapshot.blocks.delete(position);
        }
        this.snapshot.latestEventId = event.id!;
        break;
      }
    }
  }

  /**
   * Rebuild from event log (from snapshot forward)
   */
  private async rebuild(): Promise<void> {
    const projectId = editorState.getCurrentProjectId();
    if (!projectId) return;

    const events = await eventLog.getEvents({
      fromId: this.snapshot.latestEventId + 1,
      types: ['model:blockPlaced', 'model:blockRemoved', 'model:blocksPlaced', 'model:blocksRemoved'],
      projectId,
    });

    for (const event of events) {
      this.applyEvent(event);
    }

    this.emit('blocks:rebuilt');
  }

  /**
   * Create snapshot (persist to localStorage for fast startup)
   */
  private createSnapshot(): void {
    try {
      const serialized = JSON.stringify({
        latestEventId: this.snapshot.latestEventId,
        blocks: this.snapshot.blocks.toArray(),
      });
      localStorage.setItem('block-snapshot', serialized);
    } catch (error) {
      console.error('Failed to create block snapshot:', error);
    }
  }

  /**
   * Ensure projection is fresh by applying any new events
   * This guarantees reads always return latest state
   *
   * OPTIMIZED: Returns instantly (O(1)) if no new events since last check
   */
  async ensureFresh(): Promise<void> {
    const latestEventId = await eventLog.getLatestEventId();

    // No new events? Return instantly (O(1) version check)
    if (latestEventId === this.snapshot.latestEventId) {
      return;
    }

    // New events exist - fetch and apply
    const projectId = editorState.getCurrentProjectId();
    if (!projectId) return;

    const events = await eventLog.getEvents({
      fromId: this.snapshot.latestEventId + 1,
      types: ['model:blockPlaced', 'model:blockRemoved', 'model:blocksPlaced', 'model:blocksRemoved'],
      projectId,
    });

    for (const event of events) {
      this.applyEvent(event);
    }
  }

  /**
   * Get cached blocks (synchronous, no freshness check)
   * Use this in render loops where ensureFresh() was already called
   */
  getCached(): BlockIndex {
    return this.snapshot.blocks;
  }

  /**
   * Get current block index (always fresh)
   */
  async getBlocks(): Promise<BlockIndex> {
    await this.ensureFresh();
    return this.snapshot.blocks;
  }

  /**
   * Get block at position (always fresh)
   */
  async getBlock(position: Vector3D): Promise<BlockData | null> {
    await this.ensureFresh();
    return this.snapshot.blocks.get(position);
  }

  /**
   * Get blocks at layer (always fresh)
   */
  async getBlocksAtLayer(axis: 'x' | 'y' | 'z', layer: number): Promise<BlockData[]> {
    await this.ensureFresh();
    return this.snapshot.blocks.getBlocksAtLayer(axis, layer);
  }

  /**
   * Reset projection (clear snapshot for new project)
   */
  reset(): void {
    this.snapshot = {
      latestEventId: 0,
      blocks: new BlockIndex(),
    };
    this.eventsSinceSnapshot = 0;
  }
}

export const blockProjection = BlockProjection.getInstance();
