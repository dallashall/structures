/**
 * ModelHistory - Manages model state through event sourcing
 *
 * Responsibilities:
 * - Persist events to journal
 * - Replay events to reconstruct model state
 * - Create snapshots for performance
 * - Persist to localStorage
 * - "Close the books" to prevent unbounded growth
 *
 * Key distinction: This manages PERSISTED model history.
 * For ephemeral preview state, use DraftingService.
 */

import { EventEmitter } from './EventEmitter';
import type { Project, Vector3D } from '../types';
import type { ProjectDataEvent, Snapshot, CompoundEvent, BlockPlacedEvent, BlockRemovedEvent } from '../events/types';
import { projectReducer } from '../reducers/projectReducer';
import { generateUUID } from '../utils/uuid';
import { getSessionId } from '../utils/sessionId';

// Configuration constants
const CONFIG = {
  SNAPSHOT_INTERVAL: 100,       // Create snapshot every N events
  MAX_SNAPSHOTS: 10,            // Keep last N snapshots
  CLOSE_BOOKS_THRESHOLD: 500,   // Close books after N events
  UNDO_DEPTH: 100,              // Keep last N events after closing books
};

/**
 * ModelHistory singleton class
 */
class ModelHistory extends EventEmitter {
  private static instance: ModelHistory;

  private journal: ProjectDataEvent[] = [];          // In-memory event log
  private snapshots: Map<number, Snapshot> = new Map(); // Version -> Snapshot
  private currentVersion: number = 0;                // Current event count
  private isReplaying: boolean = false;              // Flag to batch rendering during replay
  private currentProjectId: string | null = null;    // Track current project

  // Persistence key format
  private readonly JOURNAL_KEY = 'mc-blueprint-journal-current';
  private readonly SNAPSHOT_KEY = 'mc-blueprint-snapshot-current';

  private constructor() {
    super();
  }

  static getInstance(): ModelHistory {
    if (!ModelHistory.instance) {
      ModelHistory.instance = new ModelHistory();
    }
    return ModelHistory.instance;
  }

  /**
   * Set current project ID (needed for write() method)
   */
  setCurrentProjectId(projectId: string): void {
    this.currentProjectId = projectId;
  }

  /**
   * Write blocks to model history (creates compound event internally)
   * This is the public API for persisting model changes
   */
  write(blocks: Array<{ position: Vector3D; blockType: string | null; previousBlockType?: string }>): void {
    if (!this.currentProjectId) {
      console.error('ModelHistory.write() called without current project ID');
      return;
    }

    if (blocks.length === 0) {
      return;
    }

    // Create individual events for each block operation
    const events: (BlockPlacedEvent | BlockRemovedEvent)[] = [];
    const timestamp = Date.now();

    for (const block of blocks) {
      if (block.blockType === null) {
        // Remove block
        events.push({
          type: 'block:removed',
          eventId: generateUUID(),
          timestamp,
          sessionId: getSessionId(),
          projectId: this.currentProjectId,
          version: -1,  // Assigned by appendEvent
          payload: {
            position: block.position,
            blockType: block.previousBlockType || 'air',
          },
        });
      } else {
        // Place block
        events.push({
          type: 'block:placed',
          eventId: generateUUID(),
          timestamp,
          sessionId: getSessionId(),
          projectId: this.currentProjectId,
          version: -1,  // Assigned by appendEvent
          payload: {
            position: block.position,
            blockType: block.blockType,
            previousBlockType: block.previousBlockType,
          },
        });
      }
    }

    // Create compound event
    const compoundEvent: CompoundEvent = {
      type: 'compound',
      eventId: generateUUID(),
      timestamp,
      sessionId: getSessionId(),
      projectId: this.currentProjectId,
      version: -1,  // Assigned by appendEvent
      events,
      metadata: {
        description: `Paint ${events.length} block${events.length > 1 ? 's' : ''}`,
        category: 'shape',
      },
    };

    // Append to journal
    this.appendEvent(compoundEvent);

    // Emit notification (Event-Driven pattern)
    this.emit('model:updated');
  }

  /**
   * Append event to journal
   * Returns the event version (position in journal)
   *
   * Note: For block operations, prefer using write() which creates CompoundEvents.
   * This method is for other event types (project creation, renaming, dimension changes, etc.)
   */
  appendEvent(event: ProjectDataEvent): number {
    // Assign version
    event.version = this.currentVersion;

    // Append to journal
    this.journal.push(event);
    this.currentVersion++;

    // Check if we need to create a snapshot
    if (this.shouldCreateSnapshot()) {
      this.createSnapshot();
    }

    // Check if we need to close the books
    if (this.shouldCloseBooks()) {
      this.closeTheBooks(event.projectId, CONFIG.UNDO_DEPTH);
    }

    // Persist to storage
    this.persist();

    // Don't emit 'event:appended' - use specific notifications instead
    // External code should listen to 'model:updated' after write()

    return event.version;
  }

  /**
   * Get all events for a project
   */
  getEvents(projectId: string, fromVersion: number = 0): ProjectDataEvent[] {
    return this.journal
      .filter((e) => e.projectId === projectId && e.version >= fromVersion)
      .sort((a, b) => a.version - b.version);
  }

  /**
   * Get total event count for a project
   */
  getEventCount(projectId: string): number {
    return this.journal.filter((e) => e.projectId === projectId).length;
  }

  /**
   * Replay events to reconstruct project state
   * If snapshot exists, start from snapshot
   *
   * NOTE: Draft/preview state is NOT included here.
   * For preview, use DraftingService.getPreview()
   */
  replayEvents(projectId: string, toVersion?: number): Project | null {
    // Set replaying flag to batch rendering
    this.isReplaying = true;

    try {
      // Find most recent snapshot before toVersion
      const snapshot = this.findNearestSnapshot(projectId, toVersion);

      let state: Project | null = snapshot ? snapshot.state : null;
      const startVersion = snapshot ? snapshot.version + 1 : 0;
      const endVersion = toVersion ?? this.currentVersion - 1;

      // Get events to replay
      const events = this.journal.filter(
        (e) =>
          e.projectId === projectId &&
          e.version >= startVersion &&
          e.version <= endVersion
      );

      // Reduce events: state = events.reduce(applyEvent, snapshot)
      for (const event of events) {
        state = projectReducer(state, event);
      }

      return state;
    } finally {
      // Reset replaying flag
      this.isReplaying = false;

      // Emit single event after replay complete
      this.emit('replay:complete', { projectId });
    }
  }

  /**
   * Create snapshot at current version
   */
  private createSnapshot(): void {
    // Get all unique project IDs
    const projectIds = new Set(this.journal.map((e) => e.projectId));

    projectIds.forEach((projectId) => {
      const state = this.replayEvents(projectId);
      if (state) {
        const snapshot: Snapshot = {
          projectId,
          version: this.currentVersion - 1,
          state,
          timestamp: Date.now(),
        };

        this.snapshots.set(this.currentVersion - 1, snapshot);

        // Cleanup old snapshots
        this.cleanupSnapshots();

        this.emit('snapshot:created', snapshot);
      }
    });
  }

  /**
   * Should we create a snapshot?
   */
  private shouldCreateSnapshot(): boolean {
    return (
      this.currentVersion > 0 &&
      this.currentVersion % CONFIG.SNAPSHOT_INTERVAL === 0
    );
  }

  /**
   * Should we close the books?
   */
  private shouldCloseBooks(): boolean {
    return this.currentVersion >= CONFIG.CLOSE_BOOKS_THRESHOLD;
  }

  /**
   * Find nearest snapshot before version
   */
  private findNearestSnapshot(
    projectId: string,
    version?: number
  ): Snapshot | null {
    const targetVersion = version ?? this.currentVersion - 1;

    const relevantSnapshots = Array.from(this.snapshots.values())
      .filter((s) => s.projectId === projectId && s.version <= targetVersion)
      .sort((a, b) => b.version - a.version); // Descending order

    return relevantSnapshots[0] || null;
  }

  /**
   * Cleanup old snapshots, keep only last N
   */
  private cleanupSnapshots(): void {
    const snapshotArray = Array.from(this.snapshots.entries()).sort(
      (a, b) => b[0] - a[0]
    ); // Descending by version

    if (snapshotArray.length > CONFIG.MAX_SNAPSHOTS) {
      const toRemove = snapshotArray.slice(CONFIG.MAX_SNAPSHOTS);
      toRemove.forEach(([version]) => {
        this.snapshots.delete(version);
      });
    }
  }

  /**
   * Persist journal and snapshots to localStorage
   */
  persist(): void {
    try {
      // Persist journal
      const journalData = {
        version: this.currentVersion,
        events: this.journal,
      };
      localStorage.setItem(this.JOURNAL_KEY, JSON.stringify(journalData));

      // Persist snapshots
      const snapshotsData = Array.from(this.snapshots.entries());
      localStorage.setItem(this.SNAPSHOT_KEY, JSON.stringify(snapshotsData));
    } catch (error) {
      console.error('Failed to persist model history:', error);
      this.emit('persist:error', error);
    }
  }

  /**
   * Load journal and snapshots from localStorage
   */
  load(): void {
    try {
      // Load journal
      const journalJson = localStorage.getItem(this.JOURNAL_KEY);
      if (journalJson) {
        const journalData = JSON.parse(journalJson);
        this.journal = journalData.events;
        this.currentVersion = journalData.version;
      }

      // Load snapshots
      const snapshotsJson = localStorage.getItem(this.SNAPSHOT_KEY);
      if (snapshotsJson) {
        const snapshotsData = JSON.parse(snapshotsJson);
        this.snapshots = new Map(snapshotsData);
      }

      this.emit('load:success');
    } catch (error) {
      console.error('Failed to load model history:', error);
      this.emit('load:error', error);
    }
  }

  /**
   * "Close the books" - Create snapshot and truncate old events
   * This prevents unbounded journal growth while maintaining undo/redo
   */
  closeTheBooks(projectId: string, keepLastN: number = CONFIG.UNDO_DEPTH): void {
    console.log(`Closing books for ${projectId}...`);

    // Create snapshot at current version
    const state = this.replayEvents(projectId);
    if (!state) return;

    const currentVersion = this.currentVersion - 1;
    const snapshot: Snapshot = {
      projectId,
      version: currentVersion,
      state,
      timestamp: Date.now(),
    };

    this.snapshots.set(currentVersion, snapshot);

    // Find all events for this project
    const projectEvents = this.journal.filter((e) => e.projectId === projectId);

    // Keep only last N events
    const eventsToKeep = projectEvents.slice(-keepLastN);
    const minVersionToKeep = eventsToKeep[0]?.version ?? currentVersion;

    // Remove old events from journal
    this.journal = this.journal.filter(
      (e) => e.projectId !== projectId || e.version >= minVersionToKeep
    );

    this.persist();

    console.log(
      `Closed books for ${projectId}: kept ${eventsToKeep.length} events, removed ${
        projectEvents.length - eventsToKeep.length
      } events`
    );

    this.emit('books:closed', {
      projectId,
      keptEvents: eventsToKeep.length,
    });
  }

  /**
   * Check if currently replaying (for batching renders)
   */
  isReplayingEvents(): boolean {
    return this.isReplaying;
  }

  /**
   * Get configuration
   */
  getConfig() {
    return { ...CONFIG };
  }
}

// Export singleton instance
export const modelHistory = ModelHistory.getInstance();
