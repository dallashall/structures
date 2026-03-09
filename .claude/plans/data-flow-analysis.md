# Data Flow Analysis: DCB + Single Event Store

## Purpose

Map out major user actions to understand:
- What events are generated
- What consistency boundaries exist
- Whether a single event log or multiple streams makes sense
- Where queries/projections are needed

## Architectural Question

**Single Event Log (DCB approach):**
- One append-only log for all events
- Consumers query/filter to create projections
- Flexibility: new projections can be added without changing event structure
- Complexity: all events in one stream, need good filtering/indexing

**Multiple Event Streams (Purposeful Boundaries):**
- Separate logs by domain concern (BlockStream, ProjectMetadataStream, etc.)
- Events naturally grouped
- Simpler: each stream has clear purpose
- Trade-off: harder to add cross-cutting projections later

## Major User Actions

### 1. Create New Project

**User Action:** File → New Project → Enter name & dimensions → Create

**Flow:**
```
UI: NewProjectDialog
  ↓
Command: CreateProjectCommand
  ├─ Validate: name not empty, dimensions > 0
  ├─ Generate: projectId
  └─ Append Event(s):
      └─ project:created { projectId, name, dimensions }
  ↓
Event Log: [project:created]
  ↓
Projections Rebuild:
  ├─ MetadataProjection
  │   └─ materializes: { id, name, dimensions, created, modified }
  └─ BlockProjection
      └─ materializes: empty BlockIndex
  ↓
ProjectView combines → Project { metadata, blocks }
  ↓
UI: Renders empty canvas with dimensions
```

**Events Generated:**
- `project:created`

**Projections Queried:**
- None (creation doesn't need validation against existing state)

**Consistency Boundary:**
- Project lifecycle (project must be created before blocks can be placed)

---

### 2. Place Block (Single Click)

**User Action:** Click canvas → Places block at position

**Flow:**
```
UI: Canvas2D mousedown
  ↓
Tool: PaintTool.onInteractionStart()
  ├─ DraftingService.start() → clears preview
  └─ (no event yet)
  ↓
UI: Canvas2D mousemove (drag)
  ↓
Tool: PaintTool.onInteractionMove(position)
  ├─ Strategy.calculate(position) → [{ position, blockType }]
  └─ DraftingService.set(blocks) → updates preview
  ↓
Projections: (none yet - preview is ephemeral)
  ↓
UI: Renders model + preview (preview at 70% opacity)
  ↓
UI: Canvas2D mouseup
  ↓
Tool: PaintTool.onInteractionEnd()
  ↓
DraftingService.finalize()
  ↓
Command: PlaceBlocksCommand (batch)
  ├─ Query: MetadataProjection.getDimensions()
  ├─ Validate: each position within dimensions
  ├─ Append Event(s):
  │   └─ compound { events: [
  │       block:placed { position, blockType, previousBlockType },
  │       block:placed { position, blockType, previousBlockType },
  │       ...
  │     ]}
  └─ Emit: 'event:appended'
  ↓
Event Log: [project:created, compound[block:placed, block:placed, ...]]
  ↓
Projections Rebuild:
  ├─ MetadataProjection (no changes - ignores block events)
  └─ BlockProjection
      ├─ processes block:placed events
      └─ materializes: BlockIndex with new blocks
  ↓
ProjectView combines → Project { metadata, blocks }
  ↓
UI: Renders model with finalized blocks (preview cleared)
```

**Events Generated:**
- `compound` containing multiple `block:placed` events

**Projections Queried:**
- MetadataProjection (for dimension validation)

**Consistency Boundary:**
- Blocks must be within project dimensions
- Meta block must be placed & confirmed before other blocks (future requirement?)

---

### 3. Remove Block (Erase Tool)

**User Action:** Enable delete modifier → Click block → Block removed

**Flow:**
```
UI: Toggle delete modifier
  ↓
EditorState.setDeleteMode(true)
  ↓ (no event - UI state only)
UI: Canvas2D interaction (same as Place Block)
  ↓
Tool: PaintTool (delete modifier applied)
  ├─ DraftingService.start()
  ├─ DraftingService.set(blocksToRemove) → preview shows red tint
  └─ DraftingService.finalize()
  ↓
Command: RemoveBlocksCommand (batch)
  ├─ Query: BlockProjection.getBlock(position) for each
  ├─ Validate: blocks exist (can't remove air)
  ├─ Append Event(s):
  │   └─ compound { events: [
  │       block:removed { position, previousBlockType },
  │       block:removed { position, previousBlockType },
  │       ...
  │     ]}
  └─ Emit: 'event:appended'
  ↓
Event Log: [..., compound[block:removed, block:removed, ...]]
  ↓
Projections Rebuild:
  ├─ MetadataProjection (no changes)
  └─ BlockProjection
      ├─ processes block:removed events
      └─ materializes: BlockIndex with blocks deleted
  ↓
UI: Renders model without removed blocks
```

**Events Generated:**
- `compound` containing multiple `block:removed` events

**Projections Queried:**
- BlockProjection (to verify blocks exist before removal)

**Consistency Boundary:**
- Can only remove existing blocks

---

### 4. Undo

**User Action:** Ctrl+Z or Undo button → Reverts last operation

**Flow:**
```
UI: Undo button click
  ↓
Command: UndoCommand
  ├─ Query: EventLog.getCurrentVersion()
  ├─ Validate: version > 0 (can't undo before first event)
  ├─ Action: EventLog.setTargetVersion(version - 1)
  └─ Emit: 'version:changed'
  ↓
Event Log: version pointer moves back
  ↓
Projections Rebuild (to target version):
  ├─ MetadataProjection
  │   └─ replays events up to target version
  └─ BlockProjection
      └─ replays events up to target version
  ↓
ProjectView combines → Project at previous version
  ↓
UI: Renders previous state
```

**Events Generated:**
- None (undo is version pointer movement, not new event)

**Projections Queried:**
- EventLog (for current version)

**Consistency Boundary:**
- All projections must rebuild to same version
- Undo/redo is a cross-cutting concern (affects all projections)

---

### 5. Redo

**User Action:** Ctrl+Shift+Z or Redo button → Re-applies undone operation

**Flow:**
```
UI: Redo button click
  ↓
Command: RedoCommand
  ├─ Query: EventLog.getCurrentVersion(), EventLog.getMaxVersion()
  ├─ Validate: currentVersion < maxVersion (can't redo beyond max)
  ├─ Action: EventLog.setTargetVersion(version + 1)
  └─ Emit: 'version:changed'
  ↓
Event Log: version pointer moves forward
  ↓
Projections Rebuild (to target version)
  ↓
UI: Renders next state
```

**Events Generated:**
- None (redo is version pointer movement)

**Projections Queried:**
- EventLog (for current and max version)

**Consistency Boundary:**
- Same as undo

---

### 6. Expand Dimensions

**User Action:** Click "Expand East" button → Dimensions grow

**Flow:**
```
UI: DimensionControls expand button
  ↓
Command: ExpandDimensionsCommand(direction: 'x+')
  ├─ Query: MetadataProjection.getDimensions()
  ├─ Validate: can expand (max dimension limits?)
  ├─ Calculate: newDimensions, shift (blocks may need to move)
  ├─ Append Event(s):
  │   └─ dimension:expanded { direction, newDimensions, shift }
  └─ Emit: 'event:appended'
  ↓
Event Log: [..., dimension:expanded]
  ↓
Projections Rebuild:
  ├─ MetadataProjection
  │   ├─ processes dimension:expanded
  │   └─ materializes: updated dimensions
  └─ BlockProjection
      ├─ processes dimension:expanded
      ├─ if shift != {0,0,0}: shifts all block positions
      └─ materializes: BlockIndex with shifted blocks
  ↓
UI: Renders with new dimensions and shifted blocks
```

**Events Generated:**
- `dimension:expanded`

**Projections Queried:**
- MetadataProjection (current dimensions)

**Consistency Boundary:**
- **CROSS-BOUNDARY!** Dimension change affects both metadata AND blocks
- BlockProjection must process dimension:expanded to shift blocks
- This suggests dimensional changes might be a shared concern

**Question:** Should dimension events be in a separate stream or main log?

---

### 7. Shrink Dimensions

**User Action:** Click "Shrink West" button → Dimensions shrink (if safe)

**Flow:**
```
UI: DimensionControls shrink button
  ↓
Command: ShrinkDimensionsCommand(direction: 'x-')
  ├─ Query: MetadataProjection.getDimensions()
  ├─ Query: BlockProjection.getBlocks() ← CRITICAL!
  ├─ Calculate: newDimensions
  ├─ Validate: check for orphaned blocks
  │   └─ if any blocks outside newDimensions → REJECT
  ├─ Append Event(s):
  │   └─ dimension:shrunk { direction, newDimensions, shift }
  └─ Emit: 'event:appended'
  ↓
Event Log: [..., dimension:shrunk]
  ↓
Projections Rebuild:
  ├─ MetadataProjection
  │   └─ materializes: updated dimensions
  └─ BlockProjection
      ├─ processes dimension:shrunk
      ├─ if shift != {0,0,0}: shifts blocks
      └─ materializes: BlockIndex (no blocks should be orphaned)
  ↓
UI: Renders with new dimensions
```

**Events Generated:**
- `dimension:shrunk`

**Projections Queried:**
- MetadataProjection (current dimensions)
- **BlockProjection (to prevent orphaning)** ← Cross-boundary query!

**Consistency Boundary:**
- **CROSS-BOUNDARY!** Shrink command must query both projections
- Business rule enforcement requires reading from both domains
- This is a strong argument for DCB (single log, query anything)

---

### 8. Place Meta Block

**User Action:** Click canvas to place structure anchor point

**Flow:**
```
UI: Canvas click (before any blocks placed)
  ↓
Command: PlaceMetaBlockCommand(position, direction)
  ├─ Query: MetadataProjection.getDimensions()
  ├─ Validate: position within dimensions
  ├─ Append Event(s):
  │   └─ metablock:placed { position, direction }
  └─ Emit: 'event:appended'
  ↓
Event Log: [..., metablock:placed]
  ↓
Projections Rebuild:
  ├─ MetadataProjection
  │   ├─ processes metablock:placed
  │   └─ materializes: metaBlock { position, direction, isConfirmed: false }
  └─ BlockProjection (no changes - ignores metablock events)
  ↓
UI: Renders meta block indicator
```

**Events Generated:**
- `metablock:placed`

**Projections Queried:**
- MetadataProjection (dimensions)

**Consistency Boundary:**
- Meta block is purely metadata (doesn't affect block model)
- Separate concern from block placement

---

### 9. Save Project

**User Action:** File → Save → Persists to localStorage

**Flow:**
```
UI: Save button
  ↓
Command: SaveProjectCommand
  ├─ Query: EventLog.getEvents()
  ├─ Query: ProjectView.getProject() (for metadata snapshot)
  ├─ Serialize: events + metadata snapshot
  ├─ Write: localStorage.setItem(projectId, serialized)
  └─ (no event appended - save is persistence, not mutation)
  ↓
(no event log change)
  ↓
(no projection rebuild)
  ↓
UI: Shows "Saved" indicator
```

**Events Generated:**
- None (save is persistence, not a domain event)

**Projections Queried:**
- EventLog (for events)
- ProjectView (for snapshot)

**Consistency Boundary:**
- Persistence is separate from domain logic
- Save reads from projections but doesn't mutate

---

### 10. Load Project

**User Action:** File → Open → Select project → Loads

**Flow:**
```
UI: Open dialog → select project
  ↓
Command: LoadProjectCommand(projectId)
  ├─ Read: localStorage.getItem(projectId)
  ├─ Deserialize: events + metadata
  ├─ Action: EventLog.loadEvents(events)
  ├─ Action: EventLog.setCurrentProjectId(projectId)
  └─ Emit: 'project:loaded'
  ↓
Event Log: [events from loaded project]
  ↓
Projections Rebuild:
  ├─ MetadataProjection (replays all events)
  └─ BlockProjection (replays all events)
  ↓
ProjectView combines → loaded Project
  ↓
UI: Renders loaded project
```

**Events Generated:**
- None (load replays existing events, doesn't create new ones)

**Projections Queried:**
- None (loads from storage, not projections)

**Consistency Boundary:**
- Loading is separate from domain logic
- All projections must rebuild from loaded events

---

## Analysis

### Cross-Boundary Interactions

**1. Dimension Changes Affect Blocks**
- `dimension:expanded` must be processed by BlockProjection (to shift blocks)
- `dimension:shrunk` must be processed by BlockProjection (to shift blocks)
- ShrinkDimensionsCommand must query BlockProjection (to prevent orphaning)

**2. Undo/Redo Affects All Projections**
- Version pointer moves affect ALL projections equally
- All projections must rebuild to same version

**3. Project Lifecycle Affects All**
- `project:created` initializes MetadataProjection
- After project created, BlockProjection can add blocks
- Load/Save affect all projections

### Event Types by Concern

**Project Lifecycle:**
- `project:created`
- `project:renamed`

**Block Model:**
- `block:placed`
- `block:removed`

**Dimensions (CROSS-CUTTING):**
- `dimension:expanded` (affects metadata + blocks)
- `dimension:shrunk` (affects metadata + blocks)

**Meta Block:**
- `metablock:placed`
- `metablock:confirmed`

**Undo/Redo (CROSS-CUTTING):**
- Version pointer (affects all projections)

### DCB vs. Purposeful Boundaries

**Arguments for DCB (Single Event Log):**
1. ✅ Cross-cutting concerns (dimensions, undo/redo) are easier
2. ✅ Commands can query any projection without cross-stream complexity
3. ✅ New projections can be added without restructuring
4. ✅ Simpler: one append, one replay mechanism

**Arguments for Purposeful Boundaries (Multiple Streams):**
1. ✅ Clear separation: BlockStream vs. MetadataStream
2. ✅ BlockProjection only processes block events (cleaner)
3. ✅ Can optimize each stream independently
4. ❌ Dimension events would need to be in both streams OR a third stream
5. ❌ Cross-stream queries are complex (ShrinkDimensions needs both)
6. ❌ Undo/redo needs to coordinate across streams

## Recommendation

**Use DCB (Single Event Log)** because:

1. **Cross-cutting concerns dominate:** Dimensions affect both metadata and blocks. Undo/redo affects everything. These are core to the app.

2. **Simpler command validation:** Commands can query any projection without cross-stream coordination.

3. **Future flexibility:** New projections (e.g., "validation warnings", "statistics") can be added easily.

4. **Projection filtering is trivial:** Each projection ignores events it doesn't care about via switch statement.

5. **Single source of truth:** One log to persist, load, and replay.

**Implementation:**
- `EventLog` - Single append-only log for all events
- `BlockProjection` - Filters for block events only
- `MetadataProjection` - Filters for project/dimension/metablock events
- Commands query whichever projections needed for validation

**Event Log Structure:**
```typescript
EventLog = [
  { type: 'project:created', ... },
  { type: 'metablock:placed', ... },
  { type: 'compound', events: [
    { type: 'block:placed', ... },
    { type: 'block:placed', ... }
  ]},
  { type: 'dimension:expanded', ... },
  { type: 'compound', events: [
    { type: 'block:removed', ... }
  ]},
  ...
]
```

Each projection filters what it needs:
- BlockProjection: processes `block:placed`, `block:removed`, `dimension:expanded`, `dimension:shrunk`
- MetadataProjection: processes `project:created`, `dimension:*`, `metablock:*`, `project:renamed`

## Next Steps

1. Rename `ModelHistory` → `EventLog` (reflects true purpose)
2. Create projections that filter events
3. Create commands that validate against projections
4. Wire up UI to use commands and subscribe to projections
