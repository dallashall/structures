import { EventEmitter } from './EventEmitter';
import type { Project, Dimensions, Vector3D, BlockData, MetaBlock } from '../types';

/**
 * ProjectManager - Manages current project state, blocks, and meta block
 *
 * Singleton class that handles:
 * - Project creation and loading
 * - Block placement and removal
 * - Meta block management (fixed direction: north)
 * - Dynamic dimension expansion/shrinking
 *
 * Events:
 * - project:created - When a new project is created
 * - project:loaded - When a project is loaded
 * - project:changed - When project data changes
 * - block:added - When a block is placed
 * - block:removed - When a block is removed
 * - metablock:placed - When meta block is placed
 * - dimensions:changed - When dimensions are expanded/shrunk
 */
class ProjectManager extends EventEmitter {
  private static instance: ProjectManager;
  private currentProject: Project | null = null;

  private constructor() {
    super();
  }

  static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  /**
   * Create a new project with given name and dimensions
   */
  createProject(name: string, dimensions: Dimensions): void {
    const now = new Date();
    this.currentProject = {
      id: this.generateId(),
      name,
      dimensions,
      metaBlock: {
        position: { x: 0, y: 0, z: 0 },
        direction: 'north', // Fixed direction as per UX decisions
      },
      blocks: new Map(),
      created: now,
      modified: now,
    };

    // Note: Meta block position is initialized but not "placed" yet
    // The user will place it as their first action
    this.emit('project:created', this.currentProject);
  }

  /**
   * Load an existing project
   */
  loadProject(project: Project): void {
    this.currentProject = project;
    this.emit('project:loaded', this.currentProject);
  }

  /**
   * Get the current project
   */
  getProject(): Project | null {
    return this.currentProject;
  }

  /**
   * Update project properties
   */
  updateProject(updates: Partial<Omit<Project, 'id' | 'created'>>): void {
    if (!this.currentProject) {
      return;
    }

    this.currentProject = {
      ...this.currentProject,
      ...updates,
      modified: new Date(),
    };

    this.emit('project:changed', this.currentProject);
  }

  /**
   * Set/place a block at the given position
   */
  setBlock(position: Vector3D, blockType: string): void {
    if (!this.currentProject) {
      return;
    }

    const key = this.positionToKey(position);
    const blockData: BlockData = {
      position,
      blockType,
    };

    this.currentProject.blocks.set(key, blockData);
    this.currentProject.modified = new Date();

    this.emit('block:added', blockData);
    this.emit('project:changed', this.currentProject);
  }

  /**
   * Remove a block at the given position
   */
  removeBlock(position: Vector3D): void {
    if (!this.currentProject) {
      return;
    }

    const key = this.positionToKey(position);
    const existed = this.currentProject.blocks.delete(key);

    if (existed) {
      this.currentProject.modified = new Date();
      this.emit('block:removed', position);
      this.emit('project:changed', this.currentProject);
    }
  }

  /**
   * Get block at the given position
   */
  getBlock(position: Vector3D): BlockData | null {
    if (!this.currentProject) {
      return null;
    }

    const key = this.positionToKey(position);
    return this.currentProject.blocks.get(key) || null;
  }

  /**
   * Get all blocks in the project
   */
  getAllBlocks(): BlockData[] {
    if (!this.currentProject) {
      return [];
    }

    return Array.from(this.currentProject.blocks.values());
  }

  /**
   * Set/place the meta block at the given position
   * Direction is always 'north' (fixed as per UX decisions)
   */
  setMetaBlock(position: Vector3D): void {
    if (!this.currentProject) {
      return;
    }

    this.currentProject.metaBlock = {
      position,
      direction: 'north', // Always north
    };
    this.currentProject.modified = new Date();

    this.emit('metablock:placed', this.currentProject.metaBlock);
    this.emit('project:changed', this.currentProject);
  }

  /**
   * Get the meta block
   */
  getMetaBlock(): MetaBlock | null {
    return this.currentProject?.metaBlock || null;
  }

  /**
   * Check if meta block has been placed
   * (position is not at default 0,0,0 or user has explicitly placed it)
   */
  isMetaBlockPlaced(): boolean {
    if (!this.currentProject) {
      return false;
    }

    // Consider meta block "placed" if it has been explicitly set
    // For now, we'll track this via a flag or check if any blocks exist
    // If no blocks exist and position is 0,0,0, it's not placed yet
    const meta = this.currentProject.metaBlock;
    const hasBlocks = this.currentProject.blocks.size > 0;

    // If there are blocks or position is not origin, meta block is placed
    return hasBlocks || (meta.position.x !== 0 || meta.position.y !== 0 || meta.position.z !== 0);
  }

  /**
   * Expand dimensions in the given direction
   * Adds a new layer and shifts blocks if necessary
   */
  expandDimensions(direction: 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-'): void {
    if (!this.currentProject) {
      return;
    }

    const { dimensions } = this.currentProject;
    const newDimensions = { ...dimensions };
    const shift: Vector3D = { x: 0, y: 0, z: 0 };

    switch (direction) {
      case 'x+':
        newDimensions.width += 1;
        break;
      case 'x-':
        newDimensions.width += 1;
        shift.x = 1;
        break;
      case 'y+':
        newDimensions.height += 1;
        break;
      case 'y-':
        newDimensions.height += 1;
        shift.y = 1;
        break;
      case 'z+':
        newDimensions.depth += 1;
        break;
      case 'z-':
        newDimensions.depth += 1;
        shift.z = 1;
        break;
    }

    // If shifting needed (x-, y-, z-), update all block positions
    if (shift.x !== 0 || shift.y !== 0 || shift.z !== 0) {
      const newBlocks = new Map<string, BlockData>();

      this.currentProject.blocks.forEach((block) => {
        const newPos: Vector3D = {
          x: block.position.x + shift.x,
          y: block.position.y + shift.y,
          z: block.position.z + shift.z,
        };
        const newKey = this.positionToKey(newPos);
        newBlocks.set(newKey, {
          ...block,
          position: newPos,
        });
      });

      this.currentProject.blocks = newBlocks;

      // Shift meta block too
      this.currentProject.metaBlock.position = {
        x: this.currentProject.metaBlock.position.x + shift.x,
        y: this.currentProject.metaBlock.position.y + shift.y,
        z: this.currentProject.metaBlock.position.z + shift.z,
      };
    }

    this.currentProject.dimensions = newDimensions;
    this.currentProject.modified = new Date();

    this.emit('dimensions:changed', newDimensions);
    this.emit('project:changed', this.currentProject);
  }

  /**
   * Shrink dimensions in the given direction
   * Removes a layer and shifts blocks if necessary
   * Deletes blocks that fall outside the new dimensions
   */
  shrinkDimensions(direction: 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-'): void {
    if (!this.currentProject) {
      return;
    }

    const { dimensions } = this.currentProject;
    const newDimensions = { ...dimensions };
    const shift: Vector3D = { x: 0, y: 0, z: 0 };

    switch (direction) {
      case 'x+':
        if (newDimensions.width <= 1) return;
        newDimensions.width -= 1;
        break;
      case 'x-':
        if (newDimensions.width <= 1) return;
        newDimensions.width -= 1;
        shift.x = -1;
        break;
      case 'y+':
        if (newDimensions.height <= 1) return;
        newDimensions.height -= 1;
        break;
      case 'y-':
        if (newDimensions.height <= 1) return;
        newDimensions.height -= 1;
        shift.y = -1;
        break;
      case 'z+':
        if (newDimensions.depth <= 1) return;
        newDimensions.depth -= 1;
        break;
      case 'z-':
        if (newDimensions.depth <= 1) return;
        newDimensions.depth -= 1;
        shift.z = -1;
        break;
    }

    // Filter and shift blocks
    const newBlocks = new Map<string, BlockData>();

    this.currentProject.blocks.forEach((block) => {
      const newPos: Vector3D = {
        x: block.position.x + shift.x,
        y: block.position.y + shift.y,
        z: block.position.z + shift.z,
      };

      // Only keep blocks within new dimensions
      if (
        newPos.x >= 0 &&
        newPos.x < newDimensions.width &&
        newPos.y >= 0 &&
        newPos.y < newDimensions.height &&
        newPos.z >= 0 &&
        newPos.z < newDimensions.depth
      ) {
        const newKey = this.positionToKey(newPos);
        newBlocks.set(newKey, {
          ...block,
          position: newPos,
        });
      }
    });

    this.currentProject.blocks = newBlocks;

    // Shift meta block if needed
    if (shift.x !== 0 || shift.y !== 0 || shift.z !== 0) {
      this.currentProject.metaBlock.position = {
        x: this.currentProject.metaBlock.position.x + shift.x,
        y: this.currentProject.metaBlock.position.y + shift.y,
        z: this.currentProject.metaBlock.position.z + shift.z,
      };
    }

    this.currentProject.dimensions = newDimensions;
    this.currentProject.modified = new Date();

    this.emit('dimensions:changed', newDimensions);
    this.emit('project:changed', this.currentProject);
  }

  /**
   * Convert 3D position to string key for Map storage
   */
  private positionToKey(position: Vector3D): string {
    return `${position.x},${position.y},${position.z}`;
  }

  /**
   * Generate a unique ID for projects
   */
  private generateId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Export singleton instance
export const projectManager = ProjectManager.getInstance();
