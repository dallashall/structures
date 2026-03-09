import { EventEmitter } from '../core/EventEmitter';
import { eventLog } from '../core/EventLog';
import type { Dimensions, MetaBlock } from '../types';

/**
 * Project metadata (derived from EventLog)
 */
export interface ProjectMetadata {
  id: string;
  name: string;
  dimensions: Dimensions;
  metaBlock: MetaBlock;
  created: Date;
  modified: Date;
}

/**
 * MetadataProjection - Materializes project metadata from EventLog
 *
 * Consumes events from EventLog:
 * - project:created → initializes metadata
 * - project:renamed → updates name
 * - dimension:expanded/shrunk → updates dimensions
 * - metablock:placed/confirmed → updates metaBlock
 *
 * Ignores:
 * - Block events (those live in ModelHistory/BlockProjection)
 *
 * This is a READ MODEL (projection) - it materializes state from events.
 * It does not handle commands or append events.
 */
class MetadataProjection extends EventEmitter {
  private static instance: MetadataProjection;
  private metadata: ProjectMetadata | null = null;

  private constructor() {
    super();

    // Rebuild when EventLog changes
    eventLog.on('event:appended', () => this.rebuild());
    eventLog.on('events:loaded', () => this.rebuild());

    // Initial rebuild
    this.rebuild();
  }

  static getInstance(): MetadataProjection {
    if (!MetadataProjection.instance) {
      MetadataProjection.instance = new MetadataProjection();
    }
    return MetadataProjection.instance;
  }

  /**
   * Rebuild metadata from EventLog events
   */
  private rebuild(): void {
    const events = eventLog.getEvents();
    let metadata: ProjectMetadata | null = null;

    for (const event of events) {
      switch (event.type) {
        case 'project:created':
          metadata = {
            id: event.projectId,
            name: event.payload.name,
            dimensions: event.payload.dimensions,
            metaBlock: {
              position: { x: 0, y: 0, z: 0 },
              direction: 'north',
              isConfirmed: false,
            },
            created: new Date(event.timestamp),
            modified: new Date(event.timestamp),
          };
          break;

        case 'project:renamed':
          if (metadata) {
            metadata.name = event.payload.newName;
            metadata.modified = new Date(event.timestamp);
          }
          break;

        case 'dimension:expanded':
          if (metadata) {
            metadata.dimensions = event.payload.newDimensions;
            metadata.modified = new Date(event.timestamp);
          }
          break;

        case 'dimension:shrunk':
          if (metadata) {
            metadata.dimensions = event.payload.newDimensions;
            metadata.modified = new Date(event.timestamp);
          }
          break;

        case 'metablock:placed':
          if (metadata) {
            metadata.metaBlock.position = event.payload.position;
            metadata.modified = new Date(event.timestamp);
          }
          break;

        case 'metablock:confirmed':
          if (metadata) {
            metadata.metaBlock.isConfirmed = true;
            metadata.modified = new Date(event.timestamp);
          }
          break;

        default: {
          // Exhaustiveness check
          const _exhaustive: never = event;
          console.warn('Unknown event type in MetadataProjection:', _exhaustive);
        }
      }
    }

    this.metadata = metadata;
    this.emit('metadata:updated', metadata);
  }

  /**
   * Get current project metadata
   */
  getMetadata(): ProjectMetadata | null {
    return this.metadata;
  }

  /**
   * Get current dimensions (convenience method)
   */
  getDimensions(): Dimensions | null {
    return this.metadata?.dimensions || null;
  }

  /**
   * Get metaBlock state (convenience method)
   */
  getMetaBlock(): MetaBlock | null {
    return this.metadata?.metaBlock || null;
  }
}

export const metadataProjection = MetadataProjection.getInstance();
