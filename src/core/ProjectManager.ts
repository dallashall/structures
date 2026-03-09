import { EventEmitter } from './EventEmitter';
import type { Project, Dimensions, Vector3D, BlockData, MetaBlock } from '../types';
import { BlockIndex } from './BlockIndex';
import { modelHistory } from './ModelHistory';
import { generateUUID } from '../utils/uuid';
import { getSessionId } from '../utils/sessionId';
import type {
  ProjectCreatedEvent,
  BlockPlacedEvent,
  BlockRemovedEvent,
  MetaBlockPlacedEvent,
  MetaBlockConfirmedEvent,
  DimensionExpandedEvent,
  DimensionShrunkEvent,
  ProjectRenamedEvent,
} from '../events/types';

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
 * - project:renamed - When project is renamed
 * - model:updated - When model state changes (from ModelHistory)
 * - block:placed - When a block is placed
 * - block:removed - When a block is removed
 * - metablock:placed - When meta block is placed
 * - metablock:confirmed - When meta block is confirmed
 * - dimensions:expanded - When dimensions are expanded
 * - dimensions:shrunk - When dimensions are shrunk
 */
class ProjectManager extends EventEmitter {
  private static instance: ProjectManager;
  private currentProject: Project | null = null;

  // PERFORMANCE: Cache computed state to avoid replaying events on every getProject() call
  // Only recompute when ModelHistory actually changes (on 'model:updated' event)
  private cachedComputedState: Project | null = null;

  private constructor() {
    super();

    // Listen for model updates from ModelHistory
    modelHistory.on('model:updated', this.handleModelUpdated.bind(this));
  }

  /**
   * Handle model updated - recompute state and emit changes
   *
   * PERFORMANCE: This is the ONLY place we replay events.
   * The result is cached for subsequent getProject() calls.
   */
  private handleModelUpdated(): void {
    if (!this.currentProject) return;

    // Recompute state from ModelHistory and cache it
    this.cachedComputedState = modelHistory.replayEvents(this.currentProject.id);

    // Emit model:updated with cached state
    this.emit('model:updated', this.cachedComputedState);
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
    const projectId = this.generateId();

    this.currentProject = {
      id: projectId,
      name,
      dimensions,
      metaBlock: {
        position: { x: 0, y: 0, z: 0 },
        direction: 'north', // Fixed direction as per UX decisions
        isConfirmed: false, // User must place and confirm
      },
      blocks: new BlockIndex(),
      created: now,
      modified: now,
    };

    // DUAL-WRITE: Append ProjectCreated event
    const event: ProjectCreatedEvent = {
      type: 'project:created',
      eventId: generateUUID(),
      timestamp: now.getTime(),
      sessionId: getSessionId(),
      projectId: projectId,
      version: -1, // Will be assigned by ModelHistory
      payload: {
        name,
        dimensions,
      },
    };
    modelHistory.appendEvent(event);

    // Note: Meta block position is initialized but not confirmed yet
    // The user will place and confirm it as their first action

    // Initialize cache with newly created project
    this.cachedComputedState = this.currentProject;

    this.emit('project:created', this.currentProject);
  }

  /**
   * Load an existing project
   */
  loadProject(project: Project): void {
    this.currentProject = project;

    // Initialize cache by replaying events
    this.cachedComputedState = modelHistory.replayEvents(project.id);

    this.emit('project:loaded', this.cachedComputedState);
  }

  /**
   * Get the current project
   *
   * PERFORMANCE: Returns cached computed state.
   * State is recomputed only when ModelHistory changes (on 'model:updated' event).
   * This prevents replaying 50+ events on every mousemove/render.
   */
  getProject(): Project | null {
    // Return cached state (updated on model:updated event)
    return this.cachedComputedState;
  }

  /**
   * Update project properties
   */
  updateProject(updates: Partial<Omit<Project, 'id' | 'created'>>): void {
    if (!this.currentProject) {
      return;
    }

    const previousName = this.currentProject.name;
    const nameChanged = updates.name !== undefined && updates.name !== previousName;

    this.currentProject = {
      ...this.currentProject,
      ...updates,
      modified: new Date(),
    };

    // DUAL-WRITE: Append ProjectRenamed event if name changed
    if (nameChanged && updates.name) {
      const event: ProjectRenamedEvent = {
        type: 'project:renamed',
        eventId: generateUUID(),
        timestamp: Date.now(),
        sessionId: getSessionId(),
        projectId: this.currentProject.id,
        version: -1,
        payload: {
          previousName,
          newName: updates.name,
        },
      };
      modelHistory.appendEvent(event);

      this.emit('project:renamed', { previousName, newName: updates.name });
    }
  }

  /**
   * Set/place a block at the given position
   */
  setBlock(position: Vector3D, blockType: string): void {
    if (!this.currentProject) {
      return;
    }

    console.log(`ProjectManager.setBlock() called at ${position.x},${position.y},${position.z}`);

    const previousBlockType = this.getBlock(position)?.blockType;

    const blockData: BlockData = {
      position,
      blockType,
    };

    // BlockIndex handles both Map storage and layer indices atomically
    this.currentProject.blocks.set(position, blockData);
    this.currentProject.modified = new Date();

    // DUAL-WRITE: Append BlockPlaced event
    const event: BlockPlacedEvent = {
      type: 'block:placed',
      eventId: generateUUID(),
      timestamp: Date.now(),
      sessionId: getSessionId(),
      projectId: this.currentProject.id,
      version: -1,
      payload: {
        position,
        blockType,
        previousBlockType,
      },
    };
    modelHistory.appendEvent(event);

    this.emit('block:placed', blockData);
  }

  /**
   * Remove a block at the given position
   */
  removeBlock(position: Vector3D): void {
    if (!this.currentProject) {
      return;
    }

    const existingBlock = this.getBlock(position);
    const existed = this.currentProject.blocks.delete(position);

    if (existed && existingBlock) {
      this.currentProject.modified = new Date();

      // DUAL-WRITE: Append BlockRemoved event
      const event: BlockRemovedEvent = {
        type: 'block:removed',
        eventId: generateUUID(),
        timestamp: Date.now(),
        sessionId: getSessionId(),
        projectId: this.currentProject.id,
        version: -1,
        payload: {
          position,
          blockType: existingBlock.blockType,
        },
      };
      modelHistory.appendEvent(event);

      this.emit('block:removed', position);
    }
  }

  /**
   * Get block at the given position
   * Returns computed state from ModelHistory
   */
  getBlock(position: Vector3D): BlockData | null {
    const project = this.getProject();
    if (!project) {
      return null;
    }

    return project.blocks.get(position);
  }

  /**
   * Get all blocks in the project
   * Returns computed state from ModelHistory
   */
  getAllBlocks(): BlockData[] {
    const project = this.getProject();
    if (!project) {
      return [];
    }

    return project.blocks.toArray();
  }

  /**
   * Set/update the meta block position
   * Can be called multiple times before confirmation
   */
  setMetaBlock(position: Vector3D): void {
    if (!this.currentProject) {
      return;
    }

    const previousPosition = this.currentProject.metaBlock.position;

    this.currentProject.metaBlock = {
      position,
      direction: 'north', // Always north
      isConfirmed: this.currentProject.metaBlock.isConfirmed, // Preserve confirmation status
    };
    this.currentProject.modified = new Date();

    // DUAL-WRITE: Append MetaBlockPlaced event
    const event: MetaBlockPlacedEvent = {
      type: 'metablock:placed',
      eventId: generateUUID(),
      timestamp: Date.now(),
      sessionId: getSessionId(),
      projectId: this.currentProject.id,
      version: -1,
      payload: {
        position,
        previousPosition,
      },
    };
    modelHistory.appendEvent(event);

    // Don't emit event here - metablock placement is ephemeral until confirmed
  }

  /**
   * Confirm the meta block placement - locks it in place
   */
  confirmMetaBlock(): void {
    if (!this.currentProject?.metaBlock) {
      return;
    }

    this.currentProject.metaBlock.isConfirmed = true;
    this.currentProject.modified = new Date();

    // DUAL-WRITE: Append MetaBlockConfirmed event
    const event: MetaBlockConfirmedEvent = {
      type: 'metablock:confirmed',
      eventId: generateUUID(),
      timestamp: Date.now(),
      sessionId: getSessionId(),
      projectId: this.currentProject.id,
      version: -1,
      payload: {
        position: this.currentProject.metaBlock.position,
      },
    };
    modelHistory.appendEvent(event);

    this.emit('metablock:confirmed', this.currentProject.metaBlock);
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
   * Check if meta block has been confirmed (finalized)
   */
  isMetaBlockConfirmed(): boolean {
    return this.currentProject?.metaBlock?.isConfirmed ?? false;
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
    const previousDimensions = { ...dimensions };
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
      const newBlocks = new BlockIndex();

      this.currentProject.blocks.forEach((block) => {
        const newPos: Vector3D = {
          x: block.position.x + shift.x,
          y: block.position.y + shift.y,
          z: block.position.z + shift.z,
        };
        newBlocks.set(newPos, {
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

    // DUAL-WRITE: Append DimensionExpanded event
    const event: DimensionExpandedEvent = {
      type: 'dimension:expanded',
      eventId: generateUUID(),
      timestamp: Date.now(),
      sessionId: getSessionId(),
      projectId: this.currentProject.id,
      version: -1,
      payload: {
        direction,
        previousDimensions,
        newDimensions,
        shift,
      },
    };
    modelHistory.appendEvent(event);

    this.emit('dimensions:expanded', { direction, previousDimensions, newDimensions });
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
    const previousDimensions = { ...dimensions };
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
    const newBlocks = new BlockIndex();
    const removedBlocks: BlockData[] = [];

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
        newBlocks.set(newPos, {
          ...block,
          position: newPos,
        });
      } else {
        // Track removed blocks for undo
        removedBlocks.push(block);
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

    // DUAL-WRITE: Append DimensionShrunk event
    const event: DimensionShrunkEvent = {
      type: 'dimension:shrunk',
      eventId: generateUUID(),
      timestamp: Date.now(),
      sessionId: getSessionId(),
      projectId: this.currentProject.id,
      version: -1,
      payload: {
        direction,
        previousDimensions,
        newDimensions,
        shift,
        removedBlocks,
      },
    };
    modelHistory.appendEvent(event);

    this.emit('dimensions:shrunk', { direction, previousDimensions, newDimensions, removedBlocks });
  }

  /**
   * Get all blocks at a specific layer
   * Delegates to BlockIndex for efficient layer-based querying
   */
  getBlocksAtLayer(axis: 'x' | 'y' | 'z', layer: number): BlockData[] {
    const project = this.getProject();
    if (!project) return [];

    return project.blocks.getBlocksAtLayer(axis, layer);
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
