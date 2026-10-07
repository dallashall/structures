/**
 * EventLog - Single immutable event log using IndexedDB
 *
 * God source of truth for all events.
 * - Events have sequential IDs (auto-increment)
 * - Optimized for lookup by ID and type
 * - Projections rebuild from this log
 */

import { EventEmitter } from './EventEmitter';

const DB_NAME = 'mc-blueprint-events';
const DB_VERSION = 1;
const STORE_NAME = 'events';

export interface Event {
  id?: number;       // Auto-increment (omit when appending)
  type: string;      // e.g., 'model:blockPlaced', 'metadata:renamed'
  data: unknown;     // Event-specific payload
  timestamp: number; // When it happened
  projectId?: string; // Project this event belongs to
}

export interface EventQuery {
  fromId?: number;     // Get events starting from this ID (inclusive)
  toId?: number;       // Get events up to this ID (inclusive)
  types?: string[];    // Filter by event types
  projectId?: string;  // Filter by project ID
}

/**
 * EventLog singleton - IndexedDB-backed event store
 */
class EventLog extends EventEmitter {
  private static instance: EventLog;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void>;

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
        console.log('EventLog: IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create events store
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });

        // Create index on type for filtered queries
        store.createIndex('type', 'type', { unique: false });

        console.log('EventLog: Database schema created');
      };
    });
  }

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
   * Get events matching query
   */
  async getEvents(query: EventQuery = {}): Promise<Event[]> {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const events: Event[] = [];
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          const evt = cursor.value as Event;

          // Apply filters
          const matchesId =
            (query.fromId === undefined || evt.id! >= query.fromId) &&
            (query.toId === undefined || evt.id! <= query.toId);

          const matchesType =
            !query.types || query.types.includes(evt.type);

          const matchesProject =
            !query.projectId || evt.projectId === query.projectId;

          if (matchesId && matchesType && matchesProject) {
            events.push(evt);
          }

          cursor.continue();
        } else {
          // Done iterating
          resolve(events);
        }
      };

      request.onerror = () => {
        console.error('Failed to get events:', request.error);
        reject(request.error);
      };
    });
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
