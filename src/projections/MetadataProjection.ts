/**
 * MetadataProjection - Materializes project metadata from event log
 *
 * Maintains snapshot of:
 * - id, name
 * - created, modified timestamps
 *
 * Rebuilds incrementally from snapshot when new metadata:* events arrive.
 */

import { EventEmitter } from '../core/EventEmitter';
import { eventLog, type Event } from '../core/EventLog';
import { editorState } from '../core/EditorState';

interface Metadata {
  id: string;
  name: string;
  created: Date;
  modified: Date;
}

interface MetadataSnapshot {
  latestEventId: number;
  id: string;
  name: string;
  created: Date;
  modified: Date;
}

/**
 * MetadataProjection singleton
 */
class MetadataProjection extends EventEmitter {
  private static instance: MetadataProjection;

  private snapshot: MetadataSnapshot | null = null;
  // Every event up to this ID has been read. Model events move it too, so a read never rescans them.
  private readThroughId = 0;
  private constructor() {
    super();

    // Listen to event log
    eventLog.on('event:appended', this.handleEvent.bind(this));

    // Initial rebuild from event log
    this.rebuild();
  }

  static getInstance(): MetadataProjection {
    if (!MetadataProjection.instance) {
      MetadataProjection.instance = new MetadataProjection();
    }
    return MetadataProjection.instance;
  }

  /**
   * Handle new event from log
   */
  private handleEvent(event: Event): void {
    // Only process metadata events
    if (!event.type.startsWith('metadata:')) {
      return;
    }

    // Only process events for current project
    const currentProjectId = editorState.getCurrentProjectId();
    if (event.projectId !== currentProjectId) {
      return;
    }

    // Apply event to snapshot
    this.applyEvent(event);

    // Notify listeners
    this.emit('metadata:rebuilt');
  }

  /**
   * Apply single event to snapshot
   */
  private applyEvent(event: Event): void {
    switch (event.type) {
      case 'metadata:created': {
        const data = event.data as { id: string; name: string };
        this.snapshot = {
          latestEventId: event.id!,
          id: data.id,
          name: data.name,
          created: new Date(event.timestamp),
          modified: new Date(event.timestamp),
        };
        break;
      }

      case 'metadata:renamed': {
        if (this.snapshot) {
          const data = event.data as { newName: string };
          this.snapshot.name = data.newName;
          this.snapshot.modified = new Date(event.timestamp);
          this.snapshot.latestEventId = event.id!;
        }
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

    const fromId = this.snapshot ? this.snapshot.latestEventId + 1 : undefined;

    const events = await eventLog.getEvents({
      fromId,
      types: ['metadata:created', 'metadata:renamed'],
      projectId,
    });

    for (const event of events) {
      this.applyEvent(event);
    }

    this.emit('metadata:rebuilt');
  }

  /**
   * Ensure projection is fresh by applying any new events
   * This guarantees reads always return latest state
   *
   * OPTIMIZED: Returns instantly (O(1)) if no new events since last check
   */
  async ensureFresh(): Promise<void> {
    const latestEventId = await eventLog.getLatestEventId();
    if (latestEventId <= this.readThroughId) return;

    const projectId = editorState.getCurrentProjectId();
    if (!projectId) return;

    const events = await eventLog.getEvents({
      fromId: this.readThroughId + 1,
      toId: latestEventId,
      types: ['metadata:created', 'metadata:renamed'],
      projectId,
    });

    for (const event of events) {
      if (!this.snapshot || event.id! > this.snapshot.latestEventId) {
        this.applyEvent(event);
      }
    }
    this.readThroughId = Math.max(this.readThroughId, latestEventId);
  }

  /**
   * Get cached metadata (synchronous, no freshness check)
   * Use this in render loops where ensureFresh() was already called
   */
  getCached(): Metadata | null {
    if (!this.snapshot) return null;

    return {
      id: this.snapshot.id,
      name: this.snapshot.name,
      created: this.snapshot.created,
      modified: this.snapshot.modified,
    };
  }

  /**
   * Get current metadata (always fresh)
   */
  async getMetadata(): Promise<Metadata | null> {
    await this.ensureFresh();

    if (!this.snapshot) return null;

    return {
      id: this.snapshot.id,
      name: this.snapshot.name,
      created: this.snapshot.created,
      modified: this.snapshot.modified,
    };
  }

  /**
   * Get project ID (always fresh)
   */
  async getId(): Promise<string | null> {
    await this.ensureFresh();
    return this.snapshot?.id || null;
  }

  /**
   * Get project name (always fresh)
   */
  async getName(): Promise<string | null> {
    await this.ensureFresh();
    return this.snapshot?.name || null;
  }

  /**
   * Reset projection (clear snapshot for new project)
   */
  reset(): void {
    this.snapshot = null;
    this.readThroughId = 0;
  }
}

export const metadataProjection = MetadataProjection.getInstance();
