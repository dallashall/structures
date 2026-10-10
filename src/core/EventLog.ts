/**
 * EventLog - Single immutable event log using IndexedDB
 *
 * God source of truth for all events.
 * - Events have sequential IDs (auto-increment)
 * - Optimized for lookup by ID and type
 * - Projections rebuild from this log
 */

import { EventEmitter } from './EventEmitter';
import { generateUUID } from '../utils/uuid';

const DB_NAME = 'mc-blueprint-events';
const DB_VERSION = 3;
const STORE_NAME = 'events';
const ACTION_ID_INDEX = 'actionId';
// Keys are [projectId, id], so one project's events read in ID order without touching other projects
const PROJECT_INDEX = 'projectId_id';

export const ACTION_STARTED = 'action:started';
export const ACTION_ENDED = 'action:ended';

export interface Event {
  id?: number;       // Auto-increment (omit when appending)
  type: string;      // e.g., 'model:blockPlaced', 'metadata:renamed'
  data: unknown;     // Event-specific payload
  timestamp: number; // When it happened
  projectId?: string; // Project this event belongs to
  actionId?: string; // Shared by every event one user action wrote. Absent on events outside undo history.
}

export type EditKind =
  | 'paint'
  | 'dimension-expand'
  | 'dimension-shrink'
  | 'metablock-place'
  | 'metablock-confirm';

export type ActionKind = EditKind | 'undo' | 'redo';

/**
 * Payload of an action:started marker
 */
export interface ActionStartedData {
  kind: ActionKind;
  tool?: string;    // Paint tool name, for paint actions
  target?: string;  // Action ID an undo or redo acts on
}

export interface ActionDraft extends ActionStartedData {
  events: Array<{ type: string; data: unknown }>;
}

export interface EventQuery {
  fromId?: number;     // Get events starting from this ID (inclusive)
  toId?: number;       // Get events up to this ID (inclusive)
  types?: string[];    // Filter by event types
  projectId?: string;  // Filter by project ID
}

const toKeyRange = ({ fromId, toId }: EventQuery): IDBKeyRange | null => {
  if (fromId !== undefined && toId !== undefined) return IDBKeyRange.bound(fromId, toId);
  if (fromId !== undefined) return IDBKeyRange.lowerBound(fromId);
  if (toId !== undefined) return IDBKeyRange.upperBound(toId);
  return null;
};

const toProjectKeyRange = (projectId: string, { fromId, toId }: EventQuery): IDBKeyRange =>
  IDBKeyRange.bound([projectId, fromId ?? -Infinity], [projectId, toId ?? Infinity]);

/**
 * EventLog singleton - IndexedDB-backed event store
 */
class EventLog extends EventEmitter {
  private static instance: EventLog;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void>;
  private pendingActions = new Set<Promise<string>>();

  private constructor() {
    super();
    this.initPromise = this.initDatabase();
    // Without a persistence grant, the browser may evict IndexedDB under storage pressure
    void navigator.storage?.persist?.();
  }

  static getInstance(): EventLog {
    if (!EventLog.instance) {
      EventLog.instance = new EventLog();
    }
    return EventLog.instance;
  }

  /**
   * Initialize IndexedDB
   */
  private initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = this.handleVersionChange;
        console.log('EventLog: IndexedDB initialized');
        resolve();
      };

      // The open waits until every other tab closes its connection. Tabs on this build close on versionchange.
      request.onblocked = () => {
        console.warn('EventLog: Database upgrade waits for other tabs of this app to close');
      };

      request.onupgradeneeded = (event) => {
        const openRequest = event.target as IDBOpenDBRequest;
        const db = openRequest.result;
        const store = db.objectStoreNames.contains(STORE_NAME)
          ? openRequest.transaction!.objectStore(STORE_NAME)
          : db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });

        if (!store.indexNames.contains('type')) {
          store.createIndex('type', 'type', { unique: false });
        }
        // Events without an actionId are left out of this index
        if (!store.indexNames.contains(ACTION_ID_INDEX)) {
          store.createIndex(ACTION_ID_INDEX, ACTION_ID_INDEX, { unique: false });
        }
        // Events without a projectId are left out of this index
        if (!store.indexNames.contains(PROJECT_INDEX)) {
          store.createIndex(PROJECT_INDEX, ['projectId', 'id'], { unique: false });
        }

        console.log(`EventLog: Database schema at version ${DB_VERSION}`);
      };
    });
  }

  /**
   * Another tab opened a newer schema. This tab runs an older build, so it closes its connection
   * to unblock the upgrade and reloads to pick up the new build.
   */
  private handleVersionChange = (): void => {
    this.db?.close();
    this.db = null;
    window.location.reload();
  };

  /**
   * Ensure database is ready
   */
  private async ensureReady(): Promise<void> {
    await this.initPromise;
    if (!this.db) {
      throw new Error('EventLog: Database not initialized');
    }
  }

  /**
   * Append event to log
   * Returns the event ID
   */
  async append(type: string, data: unknown, projectId?: string): Promise<number> {
    await this.ensureReady();

    const event: Event = {
      type,
      data,
      timestamp: Date.now(),
      projectId,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(event);

      request.onsuccess = () => {
        const eventId = request.result as number;
        const savedEvent = { ...event, id: eventId };

        // Emit event synchronously (projections listen to this)
        this.emit('event:appended', savedEvent);

        resolve(eventId);
      };

      request.onerror = () => {
        console.error('Failed to append event:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Append one user action: an action:started marker, its events, and an action:ended marker.
   *
   * All of them commit in one transaction, so the log never holds part of an action.
   * IndexedDB serializes readwrite transactions on a store, so the action's IDs are consecutive.
   * event:appended fires for each event only after the commit. Returns the action ID.
   */
  async appendAction(projectId: string, draft: ActionDraft): Promise<string> {
    const write = this.writeAction(projectId, draft);
    this.pendingActions.add(write);
    const forget = (): void => { this.pendingActions.delete(write); };
    write.then(forget, forget);
    return write;
  }

  private async writeAction(projectId: string, { events, ...started }: ActionDraft): Promise<string> {
    await this.ensureReady();

    const actionId = generateUUID();
    const timestamp = Date.now();
    const toEvent = ({ type, data }: { type: string; data: unknown }): Event =>
      ({ type, data, timestamp, projectId, actionId });
    const batch = [
      toEvent({ type: ACTION_STARTED, data: started }),
      ...events.map(toEvent),
      toEvent({ type: ACTION_ENDED, data: {} }),
    ];

    const writeBatch = (resolve: (actionId: string) => void, reject: (error: unknown) => void): void => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const saved: Event[] = [];

      const addEvent = (event: Event): void => {
        const request = store.add(event);
        const recordSaved = (): void => {
          saved.push({ ...event, id: request.result as number });
        };
        request.onsuccess = recordSaved;
      };
      batch.forEach(addEvent);

      const emitAppended = (event: Event): void => { this.emit('event:appended', event); };
      const handleComplete = (): void => {
        saved.forEach(emitAppended);
        resolve(actionId);
      };
      const handleError = (): void => {
        console.error('Failed to append action:', transaction.error);
        reject(transaction.error);
      };
      transaction.oncomplete = handleComplete;
      transaction.onerror = handleError;
    };

    return new Promise(writeBatch);
  }

  /**
   * Resolves when every appendAction call made so far has committed or failed
   */
  async settled(): Promise<void> {
    await Promise.allSettled([...this.pendingActions]);
  }

  /**
   * Get every event one action wrote, markers included, in ID order
   */
  async getActionEvents(actionId: string): Promise<Event[]> {
    await this.ensureReady();

    const readAction = (resolve: (events: Event[]) => void, reject: (error: unknown) => void): void => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const index = transaction.objectStore(STORE_NAME).index(ACTION_ID_INDEX);
      const request = index.getAll(actionId);

      const handleSuccess = (): void => resolve(request.result as Event[]);
      const handleError = (): void => {
        console.error('Failed to get action events:', request.error);
        reject(request.error);
      };
      request.onsuccess = handleSuccess;
      request.onerror = handleError;
    };

    return new Promise(readAction);
  }

  /**
   * Get events matching query
   */
  async getEvents(query: EventQuery = {}): Promise<Event[]> {
    await this.ensureReady();

    // IDBKeyRange.bound throws on an inverted range
    if (query.fromId !== undefined && query.toId !== undefined && query.fromId > query.toId) {
      return [];
    }

    // One getAll request, not a cursor: a cursor costs one main-thread task per row,
    // and each task waits behind any frame in progress
    const readEvents = (resolve: (events: Event[]) => void, reject: (error: unknown) => void): void => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = query.projectId
        ? store.index(PROJECT_INDEX).getAll(toProjectKeyRange(query.projectId, query))
        : store.getAll(toKeyRange(query));

      const matchesType = (event: Event): boolean => !query.types || query.types.includes(event.type);
      const handleSuccess = (): void => {
        const rows = request.result as Event[];
        resolve(rows.filter(matchesType));
      };
      const handleError = (): void => {
        console.error('Failed to get events:', request.error);
        reject(request.error);
      };
      request.onsuccess = handleSuccess;
      request.onerror = handleError;
    };

    return new Promise(readEvents);
  }

  /**
   * Get latest event ID
   */
  async getLatestEventId(): Promise<number> {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor(null, 'prev'); // Open cursor in reverse

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          resolve(cursor.value.id);
        } else {
          // No events yet
          resolve(0);
        }
      };

      request.onerror = () => {
        console.error('Failed to get latest event ID:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all events (for testing/reset)
   */
  async clear(): Promise<void> {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('EventLog: Cleared all events');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear events:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete all events for a specific project
   */
  async deleteProjectEvents(projectId: string): Promise<void> {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          const evt = cursor.value as Event;
          if (evt.projectId === projectId) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          console.log(`EventLog: Deleted events for project ${projectId}`);
          resolve();
        }
      };

      request.onerror = () => {
        console.error('Failed to delete project events:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete entire database (for testing - resets auto-increment)
   */
  async deleteDatabase(): Promise<void> {
    // Close connection first
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);

      request.onsuccess = () => {
        console.log('EventLog: Database deleted');
        // Reinitialize
        this.initPromise = this.initDatabase();
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete database:', request.error);
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn('Database deletion blocked');
      };
    });
  }
}

export const eventLog = EventLog.getInstance();
