/**
 * ModelProjection - Materializes model state from event log
 *
 * Maintains snapshot of:
 * - dimensions (width, height, depth)
 * - blocks (BlockIndex)
 * - metaBlock (position, direction, isConfirmed)
 *
 * Rebuilds incrementally from snapshot when new model:* events arrive.
 */

import { EventEmitter } from '../core/EventEmitter';
import { eventLog, type Event } from '../core/EventLog';
import { editorState } from '../core/EditorState';
import {
  applyModelEvent,
  createEmptyModel,
  MODEL_EVENT_TYPES,
  type Model,
} from '../reducers/modelReducer';
import type { BlockIndex } from '../core/BlockIndex';
import type { Dimensions, MetaBlock } from '../types';

export type { Model };

interface ModelSnapshot extends Model {
  latestEventId: number;
}

/**
 * ModelProjection singleton
 */
class ModelProjection extends EventEmitter {
  private static instance: ModelProjection;

  private snapshot: ModelSnapshot = { latestEventId: 0, ...createEmptyModel() };

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

    if (event.projectId !== currentProjectId) {
      return;
    }
    this.applyEvent(event);

    // Notify listeners
    this.emit('model:rebuilt');
  }

  private applyEvent(event: Event): void {
    if (applyModelEvent(this.snapshot, event)) {
      this.snapshot.latestEventId = event.id!;
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
      types: MODEL_EVENT_TYPES,
      projectId,
    });

    for (const event of events) {
      this.applyEvent(event);
    }

    this.emit('model:rebuilt');
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
      types: MODEL_EVENT_TYPES,
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
    this.snapshot = { latestEventId: 0, ...createEmptyModel() };
  }
}

export const modelProjection = ModelProjection.getInstance();
