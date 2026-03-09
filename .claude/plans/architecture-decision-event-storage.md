# Architecture Decision: Event Storage Pattern

## Decision

Use **two separate event storage mechanisms** with different characteristics:

### ModelHistory (Undoable Working State)
- **Purpose:** Block model with undo/redo support
- **Mutability:** Version pointer (events immutable, currentVersion mutable)
- **Events:** `block:placed`, `block:removed`, `compound` (block operations)
- **Operations:** append, undo (currentVersion--), redo (currentVersion++)
- **Projection:** BlockProjection (materializes BlockIndex)
- **Frequency:** High (every paint stroke, drag, etc.)

### EventLog (Immutable Append-Only)
- **Purpose:** Project metadata and lifecycle
- **Mutability:** Truly immutable (append-only)
- **Events:** `project:created`, `project:renamed`, `dimension:expanded`, `dimension:shrunk`, `metablock:placed`, `metablock:confirmed`
- **Operations:** append only (no undo/redo)
- **Projection:** MetadataProjection (materializes project metadata)
- **Frequency:** Low (infrequent metadata changes)

### ProjectView (Combination)
- **Purpose:** Complete project state
- **Source:** Combines BlockProjection + MetadataProjection
- **Provides:** `getProject()` → `{ ...metadata, blocks }`

## Rationale

### Why Separate?

**1. Different Undo Semantics**

Block placement is the core editing operation and needs robust, UX-friendly undo/redo:
- Users expect instant undo of painting mistakes
- High frequency: undo/redo called dozens of times per session
- Version pointer approach is fast and simple

Project metadata changes are infrequent and may not need undo:
- Renaming a project rarely needs undo
- Dimension changes are deliberate (with validation)
- If undo needed later, can use compensating events

**2. Different Mutation Patterns**

ModelHistory:
- High write frequency (every paint stroke)
- Frequent undo/redo operations
- Working state that evolves continuously

EventLog:
- Low write frequency (occasional metadata updates)
- No undo operations
- Historical record of metadata changes

**3. Clear Separation of Concerns**

ModelHistory = "What blocks have been placed/removed?" (the model)
EventLog = "What is this project called? What are its dimensions?" (the metadata)

**4. Known, Intentional Exception**

This architecture acknowledges that undo/redo for the block model is special:
- Block operations are undoable (ModelHistory with version pointer)
- Metadata operations are not undoable (EventLog is append-only)
- This is a conscious trade-off for pragmatism

## Data Flow

### Place Block Flow

```
User: Click canvas
  ↓
Tool: PaintTool
  ├─ DraftingService.start()
  ├─ DraftingService.set(blocks) → preview
  └─ DraftingService.finalize()
  ↓
Command: PlaceBlocksCommand
  ├─ Query: MetadataProjection.getDimensions() ← from EventLog
  ├─ Validate: positions within dimensions
  └─ ModelHistory.write(blocks) ← to ModelHistory
  ↓
ModelHistory:
  ├─ Append: compound[block:placed, block:placed, ...]
  ├─ currentVersion++
  └─ Emit: 'model:updated'
  ↓
BlockProjection:
  ├─ Rebuild from ModelHistory events
  └─ Materializes: BlockIndex
  ↓
ProjectView:
  ├─ Combines: BlockProjection + MetadataProjection
  └─ Returns: complete Project
  ↓
UI: Renders updated project
```

### Undo Flow

```
User: Ctrl+Z
  ↓
Command: UndoCommand
  ├─ ModelHistory.undo()
  │   ├─ currentVersion--
  │   └─ Emit: 'model:updated'
  └─ (EventLog unchanged - metadata not affected)
  ↓
BlockProjection:
  ├─ Rebuild from ModelHistory events up to currentVersion
  └─ Materializes: BlockIndex (previous state)
  ↓
MetadataProjection:
  └─ Unchanged (metadata not affected by undo)
  ↓
ProjectView:
  ├─ Combines: BlockProjection (undone) + MetadataProjection (unchanged)
  └─ Returns: Project with undone blocks
  ↓
UI: Renders previous block state (metadata unchanged)
```

### Expand Dimensions Flow

```
User: Click "Expand East"
  ↓
Command: ExpandDimensionsCommand
  ├─ Query: MetadataProjection.getDimensions()
  ├─ Calculate: newDimensions, shift
  └─ EventLog.append(dimension:expanded)
  ↓
EventLog:
  ├─ Append: dimension:expanded { newDimensions, shift }
  └─ Emit: 'event:appended'
  ↓
MetadataProjection:
  ├─ Rebuild from EventLog events
  └─ Materializes: updated dimensions
  ↓
BlockProjection:
  ├─ Listen: EventLog 'event:appended' ← CROSS-CONCERN
  ├─ If dimension:expanded: shift all block positions
  └─ Materializes: BlockIndex with shifted blocks
  ↓
ProjectView:
  └─ Returns: Project with new dimensions and shifted blocks
  ↓
UI: Renders expanded project
```

**Note:** Dimension events live in EventLog but affect BlockProjection. BlockProjection subscribes to EventLog for dimension events to handle shifts.

### Shrink Dimensions Flow

```
User: Click "Shrink West"
  ↓
Command: ShrinkDimensionsCommand
  ├─ Query: MetadataProjection.getDimensions() ← from EventLog
  ├─ Query: BlockProjection.getBlocks() ← from ModelHistory
  ├─ Validate: no blocks orphaned
  ├─ If invalid → reject
  └─ EventLog.append(dimension:shrunk)
  ↓
EventLog:
  ├─ Append: dimension:shrunk { newDimensions, shift }
  └─ Emit: 'event:appended'
  ↓
Projections rebuild (same as Expand)
```

**Note:** Command queries both projections (cross-concern validation).

## Cross-Cutting Concerns

### Dimension Changes
- **Events stored:** EventLog (metadata concern)
- **Affects:** Both MetadataProjection AND BlockProjection
- **Solution:** BlockProjection subscribes to EventLog for dimension events

### Undo/Redo
- **Affects:** Only BlockProjection (metadata unchanged on undo)
- **Solution:** ModelHistory has version pointer, EventLog does not

### Save/Load
- **Must persist:** Both ModelHistory events AND EventLog events
- **Solution:** Save/Load reads from both sources

## File Structure

```
src/
├── core/
│   ├── EventLog.ts              # Immutable append-only (metadata events)
│   ├── ModelHistory.ts          # Undoable working state (block events)
│   ├── DraftingService.ts       # Ephemeral preview
│   └── EventEmitter.ts
│
├── projections/
│   ├── BlockProjection.ts       # From ModelHistory + listens to EventLog (dimensions)
│   ├── MetadataProjection.ts   # From EventLog
│   └── ProjectView.ts           # Combines both
│
├── commands/
│   ├── PlaceBlocksCommand.ts    # → ModelHistory
│   ├── RemoveBlocksCommand.ts   # → ModelHistory
│   ├── ExpandDimensionsCommand.ts   # → EventLog
│   ├── ShrinkDimensionsCommand.ts   # → EventLog (queries both projections)
│   ├── RenameProjectCommand.ts      # → EventLog
│   └── UndoCommand.ts               # → ModelHistory only
│
└── events/
    └── types.ts
```

## Implementation Notes

### ModelHistory
```typescript
class ModelHistory extends EventEmitter {
  private journal: BlockEvent[] = [];
  private currentVersion: number = 0;
  private currentProjectId: string | null = null;

  write(blocks: Array<{ position; blockType; previousBlockType? }>): void {
    const event: CompoundEvent = { /* ... */ };
    this.journal.push(event);
    this.currentVersion++;
    this.emit('model:updated');
  }

  undo(): void {
    if (this.currentVersion > 0) {
      this.currentVersion--;
      this.emit('model:updated');
    }
  }

  redo(): void {
    if (this.currentVersion < this.journal.length) {
      this.currentVersion++;
      this.emit('model:updated');
    }
  }

  getEvents(): BlockEvent[] {
    return this.journal.slice(0, this.currentVersion);
  }
}
```

### EventLog
```typescript
class EventLog extends EventEmitter {
  private journal: MetadataEvent[] = [];
  private currentProjectId: string | null = null;

  append(event: MetadataEvent): void {
    this.journal.push(event);
    this.emit('event:appended', event);
  }

  getEvents(): MetadataEvent[] {
    return this.journal; // All events (no version pointer)
  }
}
```

### BlockProjection
```typescript
class BlockProjection extends EventEmitter {
  private blocks: BlockIndex = new BlockIndex();

  constructor(
    private modelHistory: ModelHistory,
    private eventLog: EventLog
  ) {
    super();

    // Rebuild from ModelHistory
    modelHistory.on('model:updated', () => this.rebuildFromModelHistory());

    // Listen for dimension changes from EventLog
    eventLog.on('event:appended', (event) => {
      if (event.type === 'dimension:expanded' || event.type === 'dimension:shrunk') {
        this.handleDimensionChange(event);
      }
    });

    this.rebuild();
  }

  private rebuildFromModelHistory(): void {
    const events = this.modelHistory.getEvents(); // up to currentVersion
    this.blocks = new BlockIndex();

    for (const event of events) {
      // Process block:placed, block:removed
    }

    this.emit('blocks:updated');
  }

  private handleDimensionChange(event: DimensionEvent): void {
    if (event.payload.shift) {
      // Shift all blocks
      this.shiftBlocks(event.payload.shift);
      this.emit('blocks:updated');
    }
  }
}
```

## Future Considerations

### If Metadata Undo Needed

If we later need undo for metadata (e.g., undo dimension change):

**Option 1: Add version pointer to EventLog**
- EventLog becomes similar to ModelHistory
- Both have version pointers
- Undo affects both

**Option 2: Compensating events**
- Append `dimension:shrunk` to undo `dimension:expanded`
- True event sourcing approach
- Log grows with undo operations

**Option 3: Snapshot metadata**
- Keep snapshots of metadata at certain points
- Undo restores snapshot
- Hybrid approach

## Decision Status

**Approved:** Option A - ModelHistory (undoable) + EventLog (immutable)

**Rationale:** Pragmatic separation with clear semantics. Block model gets special undo treatment because it's the core editing operation.
