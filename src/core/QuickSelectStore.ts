/**
 * QuickSelectStore - IndexedDB store for quick-select presets
 *
 * Stores one entry per preset slot (9 slots per project)
 * Plus entries for foreground/background indices and active mode
 */

import { saveTracker } from './SaveTracker';

const DB_NAME = 'mc-blueprint-quickselect';
const DB_VERSION = 1;
const STORE_NAME = 'presets';

interface QuickSelectEntry {
  id: string;        // `${projectId}:${key}` e.g., "proj123:slot:0" or "proj123:foreground"
  projectId: string; // For querying all entries per project
  value: string;     // Block ID, index, or mode
}

interface QuickSelectState {
  blocks: string[];
  foregroundIndex: number;
  backgroundIndex: number;
  activeMode: 'foreground' | 'background';
}

const DEFAULT_BLOCKS = [
  'minecraft:cobblestone',
  'minecraft:oak_planks',
  'minecraft:grass_block',
  'minecraft:birch_planks',
  'minecraft:acacia_planks',
  'minecraft:spruce_planks',
  'minecraft:coarse_dirt',
  'minecraft:oak_leaves',
  'minecraft:birch_leaves',
];

class QuickSelectStore {
  private static instance: QuickSelectStore;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void>;

  private constructor() {
    this.initPromise = this.initDatabase();
  }

  static getInstance(): QuickSelectStore {
    if (!QuickSelectStore.instance) {
      QuickSelectStore.instance = new QuickSelectStore();
    }
    return QuickSelectStore.instance;
  }

  private async initDatabase(): Promise<void> {
    const openDatabase = (resolve: () => void, reject: (error: unknown) => void): void => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      const handleError = (): void => reject(request.error);
      const handleSuccess = (): void => {
        this.db = request.result;
        resolve();
      };
      const handleUpgradeNeeded = (): void => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('projectId', 'projectId', { unique: false });
        }
      };

      request.onerror = handleError;
      request.onsuccess = handleSuccess;
      request.onupgradeneeded = handleUpgradeNeeded;
    };

    return new Promise(openDatabase);
  }

  private async ensureReady(): Promise<void> {
    await this.initPromise;
  }

  private async putEntry(entry: QuickSelectEntry): Promise<void> {
    await this.ensureReady();

    const writeEntry = (resolve: () => void, reject: (error: unknown) => void): void => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(entry);
      const handleComplete = (): void => resolve();
      const handleError = (): void => reject(tx.error);
      tx.oncomplete = handleComplete;
      tx.onerror = handleError;
    };

    return new Promise(writeEntry);
  }

  /**
   * Set block for a specific slot (0-8)
   */
  setSlot(projectId: string, slotIndex: number, blockId: string): Promise<void> {
    const id = `${projectId}:slot:${slotIndex}`;
    const entry: QuickSelectEntry = { id, projectId, value: blockId };
    return saveTracker.track(this.putEntry(entry));
  }

  /**
   * Set foreground index (0-8)
   */
  setForeground(projectId: string, index: number): Promise<void> {
    const id = `${projectId}:foreground`;
    const entry: QuickSelectEntry = { id, projectId, value: String(index) };
    return saveTracker.track(this.putEntry(entry));
  }

  /**
   * Set background index (0-8)
   */
  setBackground(projectId: string, index: number): Promise<void> {
    const id = `${projectId}:background`;
    const entry: QuickSelectEntry = { id, projectId, value: String(index) };
    return saveTracker.track(this.putEntry(entry));
  }

  /**
   * Set active mode
   */
  setMode(projectId: string, mode: 'foreground' | 'background'): Promise<void> {
    const id = `${projectId}:mode`;
    const entry: QuickSelectEntry = { id, projectId, value: mode };
    return saveTracker.track(this.putEntry(entry));
  }

  /**
   * Get all quick-select state for a project
   * Returns defaults if no entries exist
   */
  async getState(projectId: string): Promise<QuickSelectState> {
    await this.ensureReady();

    const tx = this.db!.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('projectId');

    const readState = (resolve: (state: QuickSelectState) => void, reject: (error: unknown) => void): void => {
      const request = index.getAll(projectId);

      const handleSuccess = (): void => {
        const entries = request.result as QuickSelectEntry[];

        // Build state from entries
        const blocks = [...DEFAULT_BLOCKS];
        let foregroundIndex = 0;
        let backgroundIndex = 1;
        let activeMode: 'foreground' | 'background' = 'foreground';

        for (const entry of entries) {
          if (entry.id.includes(':slot:')) {
            const slotIndex = parseInt(entry.id.split(':slot:')[1]);
            blocks[slotIndex] = entry.value;
          } else if (entry.id.endsWith(':foreground')) {
            foregroundIndex = parseInt(entry.value);
          } else if (entry.id.endsWith(':background')) {
            backgroundIndex = parseInt(entry.value);
          } else if (entry.id.endsWith(':mode')) {
            activeMode = entry.value as 'foreground' | 'background';
          }
        }

        resolve({ blocks, foregroundIndex, backgroundIndex, activeMode });
      };
      const handleError = (): void => reject(request.error);

      request.onsuccess = handleSuccess;
      request.onerror = handleError;
    };

    return new Promise(readState);
  }

  /**
   * Delete all quick-select entries for a project
   */
  async deleteProject(projectId: string): Promise<void> {
    await this.ensureReady();

    const tx = this.db!.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('projectId');

    const deleteEntries = (resolve: () => void, reject: (error: unknown) => void): void => {
      const request = index.openCursor(IDBKeyRange.only(projectId));

      const deleteEntry = (): void => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      const handleError = (): void => reject(request.error);

      request.onsuccess = deleteEntry;
      request.onerror = handleError;
    };

    return new Promise(deleteEntries);
  }
}

export const quickSelectStore = QuickSelectStore.getInstance();
