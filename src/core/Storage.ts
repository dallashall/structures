/**
 * Storage - Project browser queries and preferences
 *
 * The project list is derived from the EventLog on every read.
 * It has no record of its own, so it cannot disagree with the events.
 * A project exists exactly when the log holds its metadata:created event.
 *
 * The last opened project ID lives in a separate IndexedDB database.
 * All persistence is IndexedDB: the app writes nothing to localStorage.
 */

import { EventEmitter } from './EventEmitter';
import { eventLog, type Event } from './EventLog';
import { applyModelEvent, createEmptyModel, type Model } from '../reducers/modelReducer';
import type { StorageMetadata } from '../types';

export type SaveState = 'idle' | 'saving' | 'saved' | 'pending' | 'error';

const DB_NAME = 'mc-blueprint-preferences';
const DB_VERSION = 1;
const STORE_NAME = 'preferences';
const LAST_OPENED_KEY = 'lastOpenedProjectId';

interface PreferenceEntry {
  key: string;
  value: string | null;
}

interface ProjectReplay {
  id: string;
  name: string;
  created: number;
  modified: number;
  model: Model;
}

const replayProjectEvent = (replay: ProjectReplay, event: Event): void => {
  replay.modified = Math.max(replay.modified, event.timestamp);

  if (event.type === 'metadata:renamed') {
    replay.name = (event.data as { newName: string }).newName;
    return;
  }

  applyModelEvent(replay.model, event);
};

const toStorageMetadata = (replay: ProjectReplay): StorageMetadata => ({
  id: replay.id,
  name: replay.name,
  created: new Date(replay.created),
  modified: new Date(replay.modified),
  dimensions: replay.model.dimensions,
  blockCount: replay.model.blocks.size,
  thumbnail: '',
});

const byCreated = (a: StorageMetadata, b: StorageMetadata): number =>
  a.created.getTime() - b.created.getTime();

/**
 * Storage singleton
 */
class Storage extends EventEmitter {
  private static instance: Storage;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void>;

  private constructor() {
    super();
    this.initPromise = this.initDatabase();
  }

  static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage();
    }
    return Storage.instance;
  }

  private initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * List all projects, replayed from the EventLog in creation order
   */
  async listProjects(): Promise<StorageMetadata[]> {
    // Events arrive in ID order, so metadata:created precedes a project's other events
    const events = await eventLog.getEvents();
    const replays = new Map<string, ProjectReplay>();

    for (const event of events) {
      if (!event.projectId) continue;

      if (event.type === 'metadata:created') {
        const data = event.data as { id: string; name: string };
        replays.set(event.projectId, {
          id: data.id,
          name: data.name,
          created: event.timestamp,
          modified: event.timestamp,
          model: createEmptyModel(),
        });
        continue;
      }

      const replay = replays.get(event.projectId);
      if (replay) {
        replayProjectEvent(replay, event);
      }
    }

    return [...replays.values()].map(toStorageMetadata).sort(byCreated);
  }

  /**
   * Get single project metadata
   */
  async getProject(projectId: string): Promise<StorageMetadata | null> {
    const projects = await this.listProjects();
    const hasId = (project: StorageMetadata) => project.id === projectId;
    return projects.find(hasId) ?? null;
  }

  /**
   * Delete all events for a project, which removes it from the list
   */
  async deleteProject(projectId: string): Promise<void> {
    if ((await this.getLastOpenedProjectId()) === projectId) {
      await this.setLastOpenedProjectId(null);
    }

    await eventLog.deleteProjectEvents(projectId);

    this.emit('project:deleted');
  }

  /**
   * Get save state (for UI feedback)
   * TODO: Implement actual save state tracking
   */
  getSaveState(): SaveState {
    return 'saved';
  }

  async getLastOpenedProjectId(): Promise<string | null> {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(LAST_OPENED_KEY);
      request.onsuccess = () => {
        const entry = request.result as PreferenceEntry | undefined;
        resolve(entry?.value ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setLastOpenedProjectId(projectId: string | null): Promise<void> {
    await this.initPromise;

    const entry: PreferenceEntry = { key: LAST_OPENED_KEY, value: projectId };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const request = tx.objectStore(STORE_NAME).put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const storage = Storage.getInstance();
