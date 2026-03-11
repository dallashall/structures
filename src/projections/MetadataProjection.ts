/**
 * MetadataProjection - Materializes project metadata from event log
 *
 * Maintains snapshot of:
 * - id, name
 * - created, modified timestamps
 *
 * Rebuilds incrementally from snapshot when new metadata:* events arrive.
 * Creates new snapshot every 15 events to optimize replay performance.
 */

import { EventEmitter } from '../core/EventEmitter';
import { eventLog, type Event } from '../core/EventLog';
import { editorState } from '../core/EditorState';

const SNAPSHOT_THRESHOLD = 15; // Create new snapshot after N events

export interface Metadata {
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
  private eventsSinceSnapshot = 0;

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
    this.eventsSinceSnapshot++;

    // Create new snapshot if threshold reached
    if (this.eventsSinceSnapshot >= SNAPSHOT_THRESHOLD) {
      this.createSnapshot();
      this.eventsSinceSnapshot = 0;
    }

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
    const fromId = this.snapshot ? this.snapshot.latestEventId + 1 : undefined;
    const projectId = editorState.getCurrentProjectId();

    const events = await eventLog.getEvents({
      fromId,
      types: ['metadata:created', 'metadata:renamed'],
      projectId: projectId || undefined,
    });

    for (const event of events) {
      this.applyEvent(event);
    }

    this.emit('metadata:rebuilt');
  }

  /**
   * Create snapshot (persist to localStorage for fast startup)
   */
  private createSnapshot(): void {
    if (!this.snapshot) return;

    try {
      const serialized = JSON.stringify({
        latestEventId: this.snapshot.latestEventId,
        id: this.snapshot.id,
        name: this.snapshot.name,
        created: this.snapshot.created.toISOString(),
        modified: this.snapshot.modified.toISOString(),
      });
      localStorage.setItem('metadata-snapshot', serialized);
    } catch (error) {
      console.error('Failed to create metadata snapshot:', error);
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
    if (this.snapshot && latestEventId === this.snapshot.latestEventId) {
      return;
    }

    // New events exist (or no snapshot yet) - fetch and apply
    const fromId = this.snapshot ? this.snapshot.latestEventId + 1 : undefined;
    const projectId = editorState.getCurrentProjectId();

    const events = await eventLog.getEvents({
      fromId,
      types: ['metadata:created', 'metadata:renamed'],
      projectId: projectId || undefined,
    });

    for (const event of events) {
      this.applyEvent(event);
    }
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
    this.eventsSinceSnapshot = 0;
  }
}

export const metadataProjection = MetadataProjection.getInstance();
