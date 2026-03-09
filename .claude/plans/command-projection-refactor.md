# Refactoring to Command/Projection Architecture

## Current State

**ProjectManager** is a "manager" anti-pattern doing too much:
- Manages project metadata (id, name, dimensions, metaBlock)
- Manages model state (blocks)
- Dual-writes to in-memory state + ModelHistory
- Caches computed state from ModelHistory
- Provides commands (setBlock, removeBlock, expandDimensions, etc.)
- Provides queries (getProject, getBlock, getBlocksAtLayer)

**ModelHistory** currently replays all events to produce full Project state.

## Target Architecture

### Shared Event Log

One log, all events:
```
EventLog:
  - project:created
  - block:placed
  - block:removed
  - dimension:expanded
  - dimension:shrunk
  - metablock:placed
  - metablock:confirmed
  - project:renamed
```

### Projections (Read Side)

**BlockProjection** - Materializes block model
- Consumes: `block:placed`, `block:removed`
- Provides: `getBlocks(): BlockIndex`
- Rebuilds from events on initialization and updates

**MetadataProjection** - Materializes project metadata
- Consumes: `project:created`, `project:renamed`, `dimension:*`, `metablock:*`
- Provides: `getMetadata(): ProjectMetadata`
- Returns: `{ id, name, dimensions, metaBlock, created, modified }`

**ProjectView** - Combines projections
- Uses: BlockProjection + MetadataProjection
- Provides: `getProject(): Project`
- Returns: `{ ...metadata, blocks: blockIndex }`

### Commands (Write Side)

**PlaceBlockCommand**
- Validates position within dimensions
- Appends `block:placed` event
- Emits notification

**RemoveBlockCommand**
- Appends `block:removed` event
- Emits notification

**ExpandDimensionsCommand**
- Validates direction
- Appends `dimension:expanded` event
- Emits notification

**ShrinkDimensionsCommand**
- Queries BlockProjection to check for orphaned blocks
- If blocks would be orphaned → reject
- Else → append `dimension:shrunk` event
- Emits notification

**PlaceMetaBlockCommand**
- Validates position
- Appends `metablock:placed` event

**RenameProjectCommand**
- Validates name
- Appends `project:renamed` event

## Implementation Plan

### Phase 1: Create EventLog (rename ModelHistory)

**File:** `src/core/EventLog.ts` (rename from ModelHistory.ts)

```typescript
class EventLog extends EventEmitter {
  private journal: Event[] = [];
  private currentProjectId: string | null = null;
  private currentVersion: number = 0;

  /**
   * Append event to log
   */
  append(event: Event): void {
    event.version = this.currentVersion++;
    this.journal.push(event);
    this.persist();
    this.emit('event:appended', event);
  }

  /**
   * Get all events for current project
   */
  getEvents(projectId?: string): Event[] {
    const id = projectId || this.currentProjectId;
    return this.journal.filter(e => e.projectId === id);
  }

  /**
   * Set current project ID
   */
  setCurrentProjectId(id: string): void {
    this.currentProjectId = id;
  }

  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }
}

export const eventLog = new EventLog();
```

### Phase 2: Create Projections

**File:** `src/projections/BlockProjection.ts`

```typescript
import { eventLog } from '../core/EventLog';
import { BlockIndex } from '../core/BlockIndex';

class BlockProjection extends EventEmitter {
  private static instance: BlockProjection;
  private blocks: BlockIndex = new BlockIndex();

  private constructor() {
    super();
    this.rebuild();
    eventLog.on('event:appended', () => this.rebuild());
  }

  static getInstance(): BlockProjection {
    if (!BlockProjection.instance) {
      BlockProjection.instance = new BlockProjection();
    }
    return BlockProjection.instance;
  }

  private rebuild(): void {
    const events = eventLog.getEvents();
    this.blocks = new BlockIndex();

    for (const event of events) {
      switch (event.type) {
        case 'block:placed':
          this.blocks.set(event.payload.position, {
            position: event.payload.position,
            blockType: event.payload.blockType
          });
          break;
        case 'block:removed':
          this.blocks.delete(event.payload.position);
          break;
        // Compound events
        case 'compound':
          for (const childEvent of event.events) {
            // Process child events recursively
          }
          break;
      }
    }

    this.emit('blocks:updated');
  }

  getBlocks(): BlockIndex {
    return this.blocks;
  }

  getBlock(position: Vector3D): BlockData | null {
    return this.blocks.get(position);
  }

  getBlocksAtLayer(axis: 'x' | 'y' | 'z', layer: number): BlockData[] {
    return this.blocks.getBlocksAtLayer(axis, layer);
  }
}

export const blockProjection = BlockProjection.getInstance();
```

**File:** `src/projections/MetadataProjection.ts`

```typescript
import { eventLog } from '../core/EventLog';

interface ProjectMetadata {
  id: string;
  name: string;
  dimensions: Dimensions;
  metaBlock: MetaBlock;
  created: Date;
  modified: Date;
}

class MetadataProjection extends EventEmitter {
  private static instance: MetadataProjection;
  private metadata: ProjectMetadata | null = null;

  private constructor() {
    super();
    this.rebuild();
    eventLog.on('event:appended', () => this.rebuild());
  }

  static getInstance(): MetadataProjection {
    if (!MetadataProjection.instance) {
      MetadataProjection.instance = new MetadataProjection();
    }
    return MetadataProjection.instance;
  }

  private rebuild(): void {
    const events = eventLog.getEvents();

    for (const event of events) {
      switch (event.type) {
        case 'project:created':
          this.metadata = {
            id: event.projectId,
            name: event.payload.name,
            dimensions: event.payload.dimensions,
            metaBlock: {
              position: { x: 0, y: 0, z: 0 },
              direction: 'north',
              isConfirmed: false
            },
            created: new Date(event.timestamp),
            modified: new Date(event.timestamp)
          };
          break;

        case 'project:renamed':
          if (this.metadata) {
            this.metadata.name = event.payload.newName;
            this.metadata.modified = new Date(event.timestamp);
          }
          break;

        case 'dimension:expanded':
          if (this.metadata) {
            this.metadata.dimensions = event.payload.newDimensions;
            this.metadata.modified = new Date(event.timestamp);
          }
          break;

        case 'dimension:shrunk':
          if (this.metadata) {
            this.metadata.dimensions = event.payload.newDimensions;
            this.metadata.modified = new Date(event.timestamp);
          }
          break;

        case 'metablock:placed':
          if (this.metadata) {
            this.metadata.metaBlock.position = event.payload.position;
            this.metadata.modified = new Date(event.timestamp);
          }
          break;

        case 'metablock:confirmed':
          if (this.metadata) {
            this.metadata.metaBlock.isConfirmed = true;
            this.metadata.modified = new Date(event.timestamp);
          }
          break;
      }
    }

    this.emit('metadata:updated');
  }

  getMetadata(): ProjectMetadata | null {
    return this.metadata;
  }

  getDimensions(): Dimensions | null {
    return this.metadata?.dimensions || null;
  }
}

export const metadataProjection = MetadataProjection.getInstance();
```

**File:** `src/projections/ProjectView.ts`

```typescript
import { blockProjection } from './BlockProjection';
import { metadataProjection } from './MetadataProjection';
import type { Project } from '../types';

class ProjectView extends EventEmitter {
  private static instance: ProjectView;

  private constructor() {
    super();

    // Re-emit when either projection updates
    blockProjection.on('blocks:updated', () => this.emit('project:updated'));
    metadataProjection.on('metadata:updated', () => this.emit('project:updated'));
  }

  static getInstance(): ProjectView {
    if (!ProjectView.instance) {
      ProjectView.instance = new ProjectView();
    }
    return ProjectView.instance;
  }

  getProject(): Project | null {
    const metadata = metadataProjection.getMetadata();
    if (!metadata) return null;

    return {
      ...metadata,
      blocks: blockProjection.getBlocks()
    };
  }
}

export const projectView = ProjectView.getInstance();
```

### Phase 3: Create Commands

**File:** `src/commands/PlaceBlockCommand.ts`

```typescript
import { eventLog } from '../core/EventLog';
import { metadataProjection } from '../projections/MetadataProjection';
import { generateUUID, getSessionId } from '../utils';

export class PlaceBlockCommand {
  execute(position: Vector3D, blockType: string): Result<void, Error> {
    const metadata = metadataProjection.getMetadata();
    if (!metadata) {
      return Err(new Error('No active project'));
    }

    // Validate position within dimensions
    const { dimensions } = metadata;
    if (
      position.x < 0 || position.x >= dimensions.width ||
      position.y < 0 || position.y >= dimensions.height ||
      position.z < 0 || position.z >= dimensions.depth
    ) {
      return Err(new Error('Position outside dimensions'));
    }

    // Append event
    const event: BlockPlacedEvent = {
      type: 'block:placed',
      eventId: generateUUID(),
      timestamp: Date.now(),
      sessionId: getSessionId(),
      projectId: eventLog.getCurrentProjectId()!,
      version: -1, // Assigned by eventLog
      payload: { position, blockType }
    };

    eventLog.append(event);
    return Ok(void);
  }
}

export const placeBlockCommand = new PlaceBlockCommand();
```

**File:** `src/commands/ShrinkDimensionsCommand.ts`

```typescript
import { eventLog } from '../core/EventLog';
import { blockProjection } from '../projections/BlockProjection';
import { metadataProjection } from '../projections/MetadataProjection';

export class ShrinkDimensionsCommand {
  execute(direction: 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-'): Result<void, Error> {
    const metadata = metadataProjection.getMetadata();
    if (!metadata) {
      return Err(new Error('No active project'));
    }

    // Calculate new dimensions
    const newDimensions = this.calculateNewDimensions(metadata.dimensions, direction);

    // Query block projection to check for orphans
    const blocks = blockProjection.getBlocks();
    const orphanedBlocks: Vector3D[] = [];

    blocks.forEach(block => {
      if (
        block.position.x < 0 || block.position.x >= newDimensions.width ||
        block.position.y < 0 || block.position.y >= newDimensions.height ||
        block.position.z < 0 || block.position.z >= newDimensions.depth
      ) {
        orphanedBlocks.push(block.position);
      }
    });

    if (orphanedBlocks.length > 0) {
      return Err(new Error(
        `Cannot shrink: would orphan ${orphanedBlocks.length} blocks`
      ));
    }

    // Append event
    const event: DimensionShrunkEvent = {
      type: 'dimension:shrunk',
      eventId: generateUUID(),
      timestamp: Date.now(),
      sessionId: getSessionId(),
      projectId: eventLog.getCurrentProjectId()!,
      version: -1,
      payload: {
        newDimensions,
        shift: { x: 0, y: 0, z: 0 } // No shift for shrink
      }
    };

    eventLog.append(event);
    return Ok(void);
  }

  private calculateNewDimensions(current: Dimensions, direction: string): Dimensions {
    // Implementation...
  }
}

export const shrinkDimensionsCommand = new ShrinkDimensionsCommand();
```

### Phase 4: Update Consumers

**DraftingService** - Change from calling ProjectManager methods to commands:

```typescript
// OLD
projectManager.setBlock(position, blockType);

// NEW
placeBlockCommand.execute(position, blockType);
```

**HOCs** - Subscribe to ProjectView instead of ProjectManager:

```typescript
// OLD
projectManager.on('model:updated', handleUpdate);

// NEW
projectView.on('project:updated', handleUpdate);
```

**CanvasPainter** - Query projections instead of ProjectManager:

```typescript
// OLD
const existingBlock = projectManager.getBlock(position);

// NEW
const existingBlock = blockProjection.getBlock(position);
```

### Phase 5: Delete ProjectManager

Once all consumers are updated, delete `src/core/ProjectManager.ts`.

## File Structure

```
src/
├── core/
│   ├── EventLog.ts              (renamed from ModelHistory.ts)
│   ├── DraftingService.ts
│   ├── EditorState.ts
│   └── EventEmitter.ts
│
├── projections/
│   ├── BlockProjection.ts       (materializes blocks from events)
│   ├── MetadataProjection.ts    (materializes project metadata)
│   └── ProjectView.ts           (combines both projections)
│
├── commands/
│   ├── PlaceBlockCommand.ts
│   ├── RemoveBlockCommand.ts
│   ├── ExpandDimensionsCommand.ts
│   ├── ShrinkDimensionsCommand.ts
│   ├── PlaceMetaBlockCommand.ts
│   ├── ConfirmMetaBlockCommand.ts
│   ├── RenameProjectCommand.ts
│   └── CreateProjectCommand.ts
│
└── events/
    └── types.ts
```

## Verification

1. ✅ No "ProjectManager" - eliminated
2. ✅ Projections only read from events
3. ✅ Commands only write events (after validation)
4. ✅ Clear separation of concerns
5. ✅ Single direction data flow
6. ✅ BlockProjection unconcerned with metadata
7. ✅ MetadataProjection unconcerned with individual blocks
8. ✅ Commands query projections for validation
