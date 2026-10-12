/**
 * MetadataProjection - The open project's name and timestamps, folded from its metadata:* rows.
 * It applies new rows as they commit, and reads only rows past its snapshot.
 *
 * Events:
 * - metadata:rebuilt - the snapshot took in new rows
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

class MetadataProjection extends EventEmitter {
  private static instance: MetadataProjection;

  private snapshot: MetadataSnapshot | null = null;
  // Every event up to this ID has been read. Model events move it too, so a read never rescans them.
  private readThroughId = 0;
  private constructor() {
    super();
    eventLog.on('event:appended', this.handleEvent.bind(this));
    this.rebuild();
  }

  static getInstance(): MetadataProjection {
    if (!MetadataProjection.instance) {
      MetadataProjection.instance = new MetadataProjection();
    }
    return MetadataProjection.instance;
  }

  private handleEvent(event: Event): void {
    if (!event.type.startsWith('metadata:')) {
      return;
    }

    const currentProjectId = editorState.getCurrentProjectId();
    if (event.projectId !== currentProjectId) {
      return;
    }

    this.applyEvent(event);
    this.emit('metadata:rebuilt');
  }

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
   * Applies any rows committed since the last read. Returns without a query when the log has no new rows.
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

  // No freshness check, for render paths that already awaited ensureFresh()
  getCached(): Metadata | null {
    if (!this.snapshot) return null;

    return {
      id: this.snapshot.id,
      name: this.snapshot.name,
      created: this.snapshot.created,
      modified: this.snapshot.modified,
    };
  }

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

  async getId(): Promise<string | null> {
    await this.ensureFresh();
    return this.snapshot?.id || null;
  }

  async getName(): Promise<string | null> {
    await this.ensureFresh();
    return this.snapshot?.name || null;
  }

  reset(): void {
    this.snapshot = null;
    this.readThroughId = 0;
  }
}

export const metadataProjection = MetadataProjection.getInstance();
