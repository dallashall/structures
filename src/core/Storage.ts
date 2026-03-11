/**
 * Storage - Manages project metadata for project browser
 *
 * Persistence layer for:
 * - Project list (StorageMetadata[])
 * - Thumbnails
 * - Last opened project
 *
 * Note: Model data lives in EventLog (IndexedDB)
 * This only stores metadata for quick project browsing
 */

import { EventEmitter } from './EventEmitter';
import { eventLog } from './EventLog';
import type { StorageMetadata } from '../types';

export type SaveState = 'idle' | 'saving' | 'saved' | 'pending' | 'error';

interface StorageData {
  projects: StorageMetadata[];
  lastOpenedProjectId: string | null;
}

/**
 * Storage singleton
 */
class Storage extends EventEmitter {
  private static instance: Storage;
  private readonly STORAGE_KEY = 'mc-projects-metadata';

  private constructor() {
    super();
  }

  static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage();
    }
    return Storage.instance;
  }

  /**
   * Get all project metadata
   */
  getProjects(): StorageMetadata[] {
    const data = this.loadData();
    return data.projects;
  }

  /**
   * Get single project metadata
   */
  getProject(projectId: string): StorageMetadata | null {
    const data = this.loadData();
    return data.projects.find(p => p.id === projectId) || null;
  }

  /**
   * Save project metadata (called after project creation)
   */
  saveProjectMetadata(metadata: StorageMetadata): void {
    const data = this.loadData();

    // Update or add
    const index = data.projects.findIndex(p => p.id === metadata.id);
    if (index >= 0) {
      data.projects[index] = metadata;
    } else {
      data.projects.push(metadata);
    }

    this.saveData(data);
    this.emit('project:saved');
  }

  /**
   * Update project modified timestamp
   */
  touchProject(projectId: string): void {
    const data = this.loadData();
    const project = data.projects.find(p => p.id === projectId);

    if (project) {
      project.modified = new Date();
      this.saveData(data);
      this.emit('project:touched');
    }
  }

  /**
   * Delete project metadata and all associated events
   */
  async deleteProject(projectId: string): Promise<void> {
    // Delete from metadata
    const data = this.loadData();
    data.projects = data.projects.filter(p => p.id !== projectId);

    // Clear last opened if this was it
    if (data.lastOpenedProjectId === projectId) {
      data.lastOpenedProjectId = null;
    }

    this.saveData(data);

    // Delete all events for this project from EventLog
    await eventLog.deleteProjectEvents(projectId);

    this.emit('project:deleted');
  }

  /**
   * List all projects (alias for getProjects)
   */
  listProjects(): StorageMetadata[] {
    return this.getProjects();
  }

  /**
   * Get save state (for UI feedback)
   * TODO: Implement actual save state tracking
   */
  getSaveState(): SaveState {
    return 'saved';
  }

  /**
   * Get/set last opened project
   */
  getLastOpenedProjectId(): string | null {
    const data = this.loadData();
    return data.lastOpenedProjectId;
  }

  setLastOpenedProjectId(projectId: string): void {
    const data = this.loadData();
    data.lastOpenedProjectId = projectId;
    this.saveData(data);
  }

  /**
   * Load data from localStorage
   */
  private loadData(): StorageData {
    const json = localStorage.getItem(this.STORAGE_KEY);
    if (!json) {
      return { projects: [], lastOpenedProjectId: null };
    }

    try {
      const parsed = JSON.parse(json);
      // Convert date strings back to Date objects
      parsed.projects = parsed.projects.map((p: any) => ({
        ...p,
        created: new Date(p.created),
        modified: new Date(p.modified),
      }));
      return parsed;
    } catch (error) {
      console.error('Failed to parse storage data:', error);
      return { projects: [], lastOpenedProjectId: null };
    }
  }

  /**
   * Save data to localStorage
   */
  private saveData(data: StorageData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save storage data:', error);
    }
  }
}

export const storage = Storage.getInstance();
