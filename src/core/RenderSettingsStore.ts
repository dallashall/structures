/**
 * RenderSettingsStore - IndexedDB store for per-project render settings
 *
 * Stores one RenderSettings blob per project. Follows
 * the QuickSelectStore singleton + IndexedDB pattern.
 */

import { DEFAULT_RENDER_SETTINGS } from '../types';

import type { RenderSettings } from '../types';

import { saveTracker } from './SaveTracker';

const DB_NAME = 'mc-blueprint-render-settings';
const DB_VERSION = 1;
const STORE_NAME = 'settings';

interface RenderSettingsEntry {
  projectId: string;
  settings: RenderSettings;
}

class RenderSettingsStore {
  private static instance: RenderSettingsStore;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void>;

  private constructor() {
    this.initPromise = this.initDatabase();
  }

  static getInstance(): RenderSettingsStore {
    if (!RenderSettingsStore.instance) {
      RenderSettingsStore.instance = new RenderSettingsStore();
    }
    return RenderSettingsStore.instance;
  }

  private async initDatabase(): Promise<void> {
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
          db.createObjectStore(STORE_NAME, { keyPath: 'projectId' });
        }
      };
    });
  }

  private async ensureReady(): Promise<void> {
    await this.initPromise;
  }

  /**
   * Get render settings for a project (returns defaults if none stored)
   */
  async getSettings(projectId: string): Promise<RenderSettings> {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(projectId);

      request.onsuccess = () => {
        const entry = request.result as RenderSettingsEntry | undefined;
        resolve(entry ? { ...DEFAULT_RENDER_SETTINGS, ...entry.settings } : { ...DEFAULT_RENDER_SETTINGS });
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save render settings for a project
   */
  saveSettings(projectId: string, settings: RenderSettings): Promise<void> {
    return saveTracker.track(this.putSettings({ projectId, settings }));
  }

  private async putSettings(entry: RenderSettingsEntry): Promise<void> {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(entry);
      const handleComplete = (): void => resolve();
      const handleError = (): void => reject(tx.error);
      tx.oncomplete = handleComplete;
      tx.onerror = handleError;
    });
  }


  /**
   * Delete render settings for a project
   */
  async deleteProject(projectId: string): Promise<void> {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(projectId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const renderSettingsStore = RenderSettingsStore.getInstance();
