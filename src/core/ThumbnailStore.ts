/**
 * ThumbnailStore - IndexedDB store for one thumbnail image per project
 *
 * Thumbnails are derived from the model, not part of it, so they live outside the EventLog.
 * Deleting every thumbnail loses nothing: the 3D view captures a new one the next time it shows the project.
 *
 * Events:
 * - thumbnail:saved (projectId) - a new thumbnail replaced the stored one
 */

import { EventEmitter } from './EventEmitter';

const DB_NAME = 'mc-blueprint-thumbnails';
const DB_VERSION = 1;
const STORE_NAME = 'thumbnails';

interface ThumbnailEntry {
  projectId: string;
  dataUrl: string;
}

class ThumbnailStore extends EventEmitter {
  private static instance: ThumbnailStore;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void>;

  private constructor() {
    super();
    this.initPromise = this.initDatabase();
  }

  static getInstance(): ThumbnailStore {
    if (!ThumbnailStore.instance) {
      ThumbnailStore.instance = new ThumbnailStore();
    }
    return ThumbnailStore.instance;
  }

  private initDatabase(): Promise<void> {
    const open = (resolve: () => void, reject: (error: unknown) => void): void => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      const handleError = (): void => reject(request.error);
      const handleSuccess = (): void => {
        this.db = request.result;
        resolve();
      };
      const handleUpgrade = (): void => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'projectId' });
        }
      };
      request.onerror = handleError;
      request.onsuccess = handleSuccess;
      request.onupgradeneeded = handleUpgrade;
    };
    return new Promise<void>(open);
  }

  /**
   * Every stored thumbnail, as data URLs keyed by project ID
   */
  async getAll(): Promise<Map<string, string>> {
    await this.initPromise;

    const readAll = (resolve: (thumbnails: Map<string, string>) => void, reject: (error: unknown) => void): void => {
      const request = this.db!.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      const toPair = (entry: ThumbnailEntry): [string, string] => [entry.projectId, entry.dataUrl];
      const handleSuccess = (): void => resolve(new Map((request.result as ThumbnailEntry[]).map(toPair)));
      const handleError = (): void => reject(request.error);
      request.onsuccess = handleSuccess;
      request.onerror = handleError;
    };
    return new Promise(readAll);
  }

  async save(projectId: string, dataUrl: string): Promise<void> {
    await this.initPromise;

    const entry: ThumbnailEntry = { projectId, dataUrl };
    const write = (resolve: () => void, reject: (error: unknown) => void): void => {
      const request = this.db!.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(entry);
      const handleSuccess = (): void => resolve();
      const handleError = (): void => reject(request.error);
      request.onsuccess = handleSuccess;
      request.onerror = handleError;
    };
    await new Promise<void>(write);
    this.emit('thumbnail:saved', projectId);
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.initPromise;

    const remove = (resolve: () => void, reject: (error: unknown) => void): void => {
      const request = this.db!.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(projectId);
      const handleSuccess = (): void => resolve();
      const handleError = (): void => reject(request.error);
      request.onsuccess = handleSuccess;
      request.onerror = handleError;
    };
    return new Promise<void>(remove);
  }
}

export const thumbnailStore = ThumbnailStore.getInstance();
