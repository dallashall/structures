/**
 * ModelProjection - Materializes model state from event log
 *
 * Maintains snapshot of:
 * - dimensions (width, height, depth)
 * - blocks (BlockIndex)
 * - metaBlock (position, direction, isConfirmed)
 *
 * Rebuilds incrementally from snapshot when new model:* events arrive.
 * Creates new snapshot every 15 events to optimize replay performance.
 */

import { EventEmitter } from '../core/EventEmitter';
import { eventLog, type Event } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import { BlockIndex } from '../core/BlockIndex';
import type { Dimensions, Vector3D, MetaBlock } from '../types';

const SNAPSHOT_THRESHOLD = 15; // Create new snapshot after N events

export interface Model {
  dimensions: Dimensions;
  blocks: BlockIndex;
  metaBlock: MetaBlock;
}

interface ModelSnapshot {
  latestEventId: number;
  dimensions: Dimensions;
  blocks: BlockIndex;
  metaBlock: MetaBlock;
}

/**
 * ModelProjection singleton
 */
class ModelProjection extends EventEmitter {
  private static instance: ModelProjection;

  private snapshot: ModelSnapshot = {
    latestEventId: 0,
    dimensions: { width: 16, height: 16, depth: 16 }, // Default
    blocks: new BlockIndex(),
    metaBlock: {
      position: { x: 0, y: 0, z: 0 },
      direction: 'y-',
      isConfirmed: false,
    },
  };

  private eventsSinceSnapshot = 0;

  private constructor() {
    super();

    // Listen to event log
    eventLog.on('event:appended', this.handleEvent.bind(this));

    // Initial rebuild from event log
    this.rebuild();
  }

  static getInstance(): ModelProjection {
    if (!ModelProjection.instance) {
      ModelProjection.instance = new ModelProjection();
    }
    return ModelProjection.instance;
  }

  /**
   * Handle new event from log
   */
  private handleEvent(event: Event): void {
    // Only process model events
    if (!event.type.startsWith('model:')) {
      return;
    }

    // Only process events for current project
    const currentProjectId = editorState.getCurrentProjectId();
    console.log(`ModelProjection.handleEvent: event.type=${event.type}, event.projectId=${event.projectId}, currentProjectId=${currentProjectId}`);

    if (event.projectId !== currentProjectId) {
      console.log('ModelProjection.handleEvent: Skipping event - projectId mismatch');
      return;
    }

    console.log('ModelProjection.handleEvent: Applying event');
    // Apply event to snapshot
    this.applyEvent(event);
    this.eventsSinceSnapshot++;

    // Create new snapshot if threshold reached
    if (this.eventsSinceSnapshot >= SNAPSHOT_THRESHOLD) {
      this.createSnapshot();
      this.eventsSinceSnapshot = 0;
    }

    // Notify listeners
    this.emit('model:rebuilt');
  }

  /**
   * Apply single event to snapshot
   */
  private applyEvent(event: Event): void {
    switch (event.type) {
      case 'model:initialized': {
        const data = event.data as { dimensions: Dimensions };
        this.snapshot.dimensions = data.dimensions;
        this.snapshot.latestEventId = event.id!;
        break;
      }

      case 'model:blockPlaced': {
        const data = event.data as { position: Vector3D; blockType: string };
        this.snapshot.blocks.set(data.position, {
          position: data.position,
          blockType: data.blockType,
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
        const data = event.data as { blocks: Array<{ position: Vector3D; blockType: string }> };
        for (const block of data.blocks) {
          this.snapshot.blocks.set(block.position, {
            position: block.position,
            blockType: block.blockType,
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

      case 'model:dimensionExpanded': {
        const data = event.data as {
          newDimensions: Dimensions;
          shift: Vector3D;
        };

        this.snapshot.dimensions = data.newDimensions;

        // Shift blocks if needed
        if (data.shift.x !== 0 || data.shift.y !== 0 || data.shift.z !== 0) {
          const newBlocks = new BlockIndex();
          this.snapshot.blocks.forEach((block) => {
            const newPos: Vector3D = {
              x: block.position.x + data.shift.x,
              y: block.position.y + data.shift.y,
              z: block.position.z + data.shift.z,
            };
            newBlocks.set(newPos, { ...block, position: newPos });
          });
          this.snapshot.blocks = newBlocks;

          // Shift metaBlock
          this.snapshot.metaBlock = {
            ...this.snapshot.metaBlock,
            position: {
              x: this.snapshot.metaBlock.position.x + data.shift.x,
              y: this.snapshot.metaBlock.position.y + data.shift.y,
              z: this.snapshot.metaBlock.position.z + data.shift.z,
            },
          };
        }

        this.snapshot.latestEventId = event.id!;
        break;
      }

      case 'model:dimensionShrunk': {
        const data = event.data as {
          newDimensions: Dimensions;
          shift: Vector3D;
        };

        this.snapshot.dimensions = data.newDimensions;

        // Filter and shift blocks
        const newBlocks = new BlockIndex();
        this.snapshot.blocks.forEach((block) => {
          const newPos: Vector3D = {
            x: block.position.x + data.shift.x,
            y: block.position.y + data.shift.y,
            z: block.position.z + data.shift.z,
          };

          // Only keep blocks within new dimensions
          if (
            newPos.x >= 0 &&
            newPos.x < data.newDimensions.width &&
            newPos.y >= 0 &&
            newPos.y < data.newDimensions.height &&
            newPos.z >= 0 &&
            newPos.z < data.newDimensions.depth
          ) {
            newBlocks.set(newPos, { ...block, position: newPos });
          }
        });
        this.snapshot.blocks = newBlocks;

        // Shift metaBlock
        if (data.shift.x !== 0 || data.shift.y !== 0 || data.shift.z !== 0) {
          this.snapshot.metaBlock = {
            ...this.snapshot.metaBlock,
            position: {
              x: this.snapshot.metaBlock.position.x + data.shift.x,
              y: this.snapshot.metaBlock.position.y + data.shift.y,
              z: this.snapshot.metaBlock.position.z + data.shift.z,
            },
          };
        }

        this.snapshot.latestEventId = event.id!;
        break;
      }

      case 'model:metaBlockPlaced': {
        const data = event.data as { position: Vector3D };
        this.snapshot.metaBlock = {
          ...this.snapshot.metaBlock,
          position: data.position,
        };
        this.snapshot.latestEventId = event.id!;
        break;
      }

      case 'model:metaBlockConfirmed': {
        this.snapshot.metaBlock = {
          ...this.snapshot.metaBlock,
          isConfirmed: true,
        };
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
      types: [
        'model:initialized',
        'model:blockPlaced',
        'model:blockRemoved',
        'model:dimensionExpanded',
        'model:dimensionShrunk',
        'model:metaBlockPlaced',
        'model:metaBlockConfirmed',
      ],
      projectId,
    });

    for (const event of events) {
      this.applyEvent(event);
    }

    this.emit('model:rebuilt');
  }

  /**
   * Create snapshot (persist to localStorage for fast startup)
   */
  private createSnapshot(): void {
    try {
      const serialized = JSON.stringify({
        latestEventId: this.snapshot.latestEventId,
        dimensions: this.snapshot.dimensions,
        blocks: this.snapshot.blocks.toArray(),
        metaBlock: this.snapshot.metaBlock,
      });
      localStorage.setItem('model-snapshot', serialized);
    } catch (error) {
      console.error('Failed to create model snapshot:', error);
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
      types: [
        'model:initialized',
        'model:blockPlaced',
        'model:blockRemoved',
        'model:blocksPlaced',
        'model:blocksRemoved',
        'model:dimensionExpanded',
        'model:dimensionShrunk',
        'model:metaBlockPlaced',
        'model:metaBlockConfirmed',
      ],
      projectId,
    });

    for (const event of events) {
      this.applyEvent(event);
    }
  }

  /**
   * Get current model state (always fresh)
   */
  async getModel(): Promise<Model> {
    await this.ensureFresh();

    return {
      dimensions: this.snapshot.dimensions,
      blocks: this.snapshot.blocks,
      metaBlock: this.snapshot.metaBlock,
    };
  }

  /**
   * Get cached model (synchronous, no freshness check)
   * Use in render loops where ensureFresh() was already called
   */
  getCached(): Model {
    return {
      dimensions: this.snapshot.dimensions,
      blocks: this.snapshot.blocks,
      metaBlock: this.snapshot.metaBlock,
    };
  }

  /**
   * Get dimensions (always fresh)
   */
  async getDimensions(): Promise<Dimensions> {
    await this.ensureFresh();
    return this.snapshot.dimensions;
  }

  /**
   * Get blocks (always fresh)
   */
  async getBlocks(): Promise<BlockIndex> {
    await this.ensureFresh();
    return this.snapshot.blocks;
  }

  /**
   * Get meta block (always fresh)
   */
  async getMetaBlock(): Promise<MetaBlock> {
    await this.ensureFresh();
    return this.snapshot.metaBlock;
  }

  /**
   * Reset projection (clear snapshot for new project)
   */
  reset(): void {
    this.snapshot = {
      latestEventId: 0,
      dimensions: { width: 16, height: 16, depth: 16 },
      blocks: new BlockIndex(),
      metaBlock: {
        position: { x: 0, y: 0, z: 0 },
        direction: 'y-',
        isConfirmed: false,
      },
    };
    this.eventsSinceSnapshot = 0;
  }
}

export const modelProjection = ModelProjection.getInstance();
