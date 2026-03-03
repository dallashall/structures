import { EventEmitter } from './EventEmitter';
import type { Project, ProjectMetadata } from '../types';

export type SaveState = 'saved' | 'pending' | 'saving';

/**
 * StorageManager - Handles persistence to localStorage
 *
 * Singleton class that provides:
 * - Project saving and loading to/from localStorage
 * - Auto-save with 3-second debounce (minimum 1.5s visible saving state)
 * - Export to JSON file
 * - Import from JSON file
 * - Project metadata management
 * - Thumbnail storage
 *
 * Events:
 * - save:start - When save operation starts
 * - save:success - When save completes successfully
 * - save:error - When save fails
 * - save:state-changed - When save state changes (saved, pending, saving)
 * - load:success - When load completes successfully
 * - load:error - When load fails
 */
class StorageManager extends EventEmitter {
  private static instance: StorageManager;
  private autoSaveTimer: number | null = null;
  private readonly AUTO_SAVE_DELAY = 3000; // 3 seconds
  private readonly MIN_SAVE_DURATION = 1500; // 1.5 seconds minimum to show "saving" state
  private readonly STORAGE_PREFIX = 'mc-blueprint-project-';
  private readonly METADATA_KEY = 'mc-blueprint-metadata';
  private saveState: SaveState = 'saved';

  private constructor() {
    super();
    this.setupProjectListeners();
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * Setup listeners for project changes to trigger autosave
   */
  private setupProjectListeners(): void {
    const handleProjectChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ project: Project }>;
      this.autoSave(customEvent.detail.project);
    };

    // Listen to custom window events
    window.addEventListener('project:changed', handleProjectChanged);
    window.addEventListener('block:added', handleProjectChanged);
    window.addEventListener('block:removed', handleProjectChanged);
  }

  /**
   * Get the current save state
   */
  getSaveState(): SaveState {
    return this.saveState;
  }

  /**
   * Set the save state and emit change event
   */
  private setSaveState(state: SaveState): void {
    if (this.saveState !== state) {
      this.saveState = state;
      this.emit('save:state-changed', state);

      // Dispatch window event for cross-module communication
      window.dispatchEvent(new CustomEvent('save:state-changed', {
        detail: { saveState: state }
      }));
    }
  }

  /**
   * Save a project to localStorage with minimum visible duration
   */
  async saveProject(project: Project): Promise<void> {
    this.setSaveState('saving');
    this.emit('save:start');

    const startTime = Date.now();

    try {
      const key = this.getProjectKey(project.id);
      const serialized = this.serializeProject(project);

      localStorage.setItem(key, serialized);

      // Update metadata
      await this.updateMetadata(project);

      // Ensure minimum visible duration
      const elapsed = Date.now() - startTime;
      const remaining = this.MIN_SAVE_DURATION - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      this.setSaveState('saved');
      this.emit('save:success', project.id);
    } catch (error) {
      console.error('Failed to save project:', error);
      this.setSaveState('pending');
      this.emit('save:error', error);
      throw error;
    }
  }

  /**
   * Load a project from localStorage
   */
  async loadProject(projectId: string): Promise<Project | null> {
    try {
      const key = this.getProjectKey(projectId);
      const serialized = localStorage.getItem(key);

      if (!serialized) {
        return null;
      }

      const project = this.deserializeProject(serialized);
      this.emit('load:success', project);
      return project;
    } catch (error) {
      console.error('Failed to load project:', error);
      this.emit('load:error', error);
      return null;
    }
  }

  /**
   * Delete a project from localStorage
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      const key = this.getProjectKey(projectId);
      localStorage.removeItem(key);

      // Remove from metadata
      const metadata = await this.listProjects();
      const filtered = metadata.filter((m) => m.id !== projectId);
      this.saveMetadata(filtered);
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }

  /**
   * List all projects (returns metadata only for fast loading)
   */
  async listProjects(): Promise<ProjectMetadata[]> {
    try {
      const metadataJson = localStorage.getItem(this.METADATA_KEY);
      if (!metadataJson) {
        return [];
      }

      const metadata = JSON.parse(metadataJson) as ProjectMetadata[];

      // Convert date strings back to Date objects
      return metadata.map((m) => ({
        ...m,
        created: new Date(m.created),
        modified: new Date(m.modified),
      }));
    } catch (error) {
      console.error('Failed to list projects:', error);
      return [];
    }
  }

  /**
   * Export a project as JSON string
   */
  exportProject(project: Project): string {
    return this.serializeProject(project);
  }

  /**
   * Import a project from JSON string
   */
  importProject(jsonString: string): Project {
    return this.deserializeProject(jsonString);
  }

  /**
   * Auto-save with debouncing (3 seconds after last change)
   * Sets state to 'pending' immediately when changes are detected
   */
  autoSave(project: Project): void {
    // Mark as pending (changes waiting to be saved)
    this.setSaveState('pending');

    // Clear existing timer
    if (this.autoSaveTimer !== null) {
      window.clearTimeout(this.autoSaveTimer);
    }

    // Set new timer
    this.autoSaveTimer = window.setTimeout(() => {
      this.saveProject(project).catch((error) => {
        console.error('Auto-save failed:', error);
      });
      this.autoSaveTimer = null;
    }, this.AUTO_SAVE_DELAY);
  }

  /**
   * Save a thumbnail for a project
   */
  async saveThumbnail(projectId: string, dataUrl: string): Promise<void> {
    try {
      const metadata = await this.listProjects();
      const index = metadata.findIndex((m) => m.id === projectId);

      if (index !== -1) {
        metadata[index].thumbnail = dataUrl;
        this.saveMetadata(metadata);
      }
    } catch (error) {
      console.error('Failed to save thumbnail:', error);
    }
  }

  /**
   * Serialize project to JSON string
   */
  private serializeProject(project: Project): string {
    // Convert Map to array for serialization
    const blocksArray = Array.from(project.blocks.entries());

    const serializable = {
      ...project,
      blocks: blocksArray,
    };

    return JSON.stringify(serializable, null, 2);
  }

  /**
   * Deserialize project from JSON string
   */
  private deserializeProject(jsonString: string): Project {
    const parsed = JSON.parse(jsonString);

    // Convert blocks array back to Map
    const blocksMap = new Map(parsed.blocks);

    // Convert date strings back to Date objects
    return {
      ...parsed,
      blocks: blocksMap,
      created: new Date(parsed.created),
      modified: new Date(parsed.modified),
    };
  }

  /**
   * Update metadata for a project
   */
  private async updateMetadata(project: Project): Promise<void> {
    const metadata = await this.listProjects();
    const index = metadata.findIndex((m) => m.id === project.id);

    const projectMetadata: ProjectMetadata = {
      id: project.id,
      name: project.name,
      created: project.created,
      modified: project.modified,
      dimensions: project.dimensions,
      blockCount: project.blocks.size,
      thumbnail: '', // Will be set separately
    };

    if (index !== -1) {
      // Update existing
      metadata[index] = {
        ...metadata[index],
        ...projectMetadata,
      };
    } else {
      // Add new
      metadata.push(projectMetadata);
    }

    this.saveMetadata(metadata);
  }

  /**
   * Save metadata to localStorage
   */
  private saveMetadata(metadata: ProjectMetadata[]): void {
    const serialized = JSON.stringify(metadata);
    localStorage.setItem(this.METADATA_KEY, serialized);
  }

  /**
   * Get localStorage key for a project
   */
  private getProjectKey(projectId: string): string {
    return `${this.STORAGE_PREFIX}${projectId}`;
  }
}

// Export singleton instance
export const storageManager = StorageManager.getInstance();
