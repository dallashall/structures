import { EventEmitter } from './EventEmitter';
import type {
  ProjectCreatedEvent,
  ProjectRenamedEvent,
  DimensionExpandedEvent,
  DimensionShrunkEvent,
  MetaBlockPlacedEvent,
  MetaBlockConfirmedEvent,
} from '../events/types';

/**
 * Metadata events stored in EventLog
 */
export type MetadataEvent =
  | ProjectCreatedEvent
  | ProjectRenamedEvent
  | DimensionExpandedEvent
  | DimensionShrunkEvent
  | MetaBlockPlacedEvent
  | MetaBlockConfirmedEvent;

/**
 * EventLog - Immutable append-only log for project metadata events
 *
 * This is a TRUE event log (append-only, no undo/redo).
 * Stores project lifecycle and metadata changes:
 * - project:created, project:renamed
 * - dimension:expanded, dimension:shrunk
 * - metablock:placed, metablock:confirmed
 *
 * Block events (block:placed, block:removed) live in ModelHistory,
 * which has undo/redo via version pointer.
 *
 * Design Decision:
 * ModelHistory is the "known exception" - it needs undo/redo for UX.
 * EventLog is the standard - truly immutable, no version pointer.
 */
class EventLog extends EventEmitter {
  private static instance: EventLog;
  private journal: MetadataEvent[] = [];
  private currentProjectId: string | null = null;

  private constructor() {
    super();
  }

  static getInstance(): EventLog {
    if (!EventLog.instance) {
      EventLog.instance = new EventLog();
    }
    return EventLog.instance;
  }

  /**
   * Append event to log (immutable - no removal or modification)
   */
  append(event: MetadataEvent): void {
    this.journal.push(event);
    this.persist();
    this.emit('event:appended', event);
  }

  /**
   * Get all events for current project
   */
  getEvents(projectId?: string): MetadataEvent[] {
    const id = projectId || this.currentProjectId;
    if (!id) return [];
    return this.journal.filter((e) => e.projectId === id);
  }

  /**
   * Get all events (for save/export)
   */
  getAllEvents(): MetadataEvent[] {
    return this.journal;
  }

  /**
   * Set current project ID context
   */
  setCurrentProjectId(id: string): void {
    this.currentProjectId = id;
  }

  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  /**
   * Load events from storage (for project load)
   */
  loadEvents(events: MetadataEvent[]): void {
    this.journal = events;
    this.emit('events:loaded');
  }

  /**
   * Clear all events (for new project or reset)
   */
  clear(): void {
    this.journal = [];
    this.currentProjectId = null;
  }

  /**
   * Persist to localStorage
   */
  private persist(): void {
    try {
      const serialized = JSON.stringify(this.journal);
      localStorage.setItem('eventLog', serialized);
    } catch (error) {
      console.error('Failed to persist EventLog:', error);
    }
  }

  /**
   * Load from localStorage
   */
  load(): void {
    try {
      const serialized = localStorage.getItem('eventLog');
      if (serialized) {
        this.journal = JSON.parse(serialized);
      }
    } catch (error) {
      console.error('Failed to load EventLog:', error);
    }
  }
}

export const eventLog = EventLog.getInstance();
