# Architecture Patterns

## Core Architecture: Commands and Projections

The app uses Event Sourcing with separate write and read sides (CQRS). Every state change flows one way:

```
User Action → Command → Validation → EventLog row → Projection → Notification → HOC → UI
```

### Write Side (Commands)

1. The user acts in the UI, or a hotkey fires.
2. A command runs. It names the user's intent, such as `shrinkDimensionsCommand.execute('x-')`.
3. The command reads current state from projections and applies business rules.
4. A valid command appends rows to the EventLog. An invalid command throws.
5. The EventLog emits `event:appended` for each row after the transaction commits.

Command singletons live in `src/commands/`. `DraftingService.finalize()` and `EditHistory.undo()`/`redo()` are also writers. They append through the same EventLog API.

### Read Side (Projections)

1. Projections listen to `event:appended` and apply rows for the current project.
2. Each projection then emits a notification (`model:rebuilt`, `metadata:rebuilt`, `blocks:rebuilt`).
3. HOCs and views read from projections. They never read from commands.

### Example: ShrinkDimensionsCommand

```typescript
// src/commands/ShrinkDimensionsCommand.ts (abridged)
export class ShrinkDimensionsCommand {
  async execute(direction: Direction): Promise<void> {
    // 1. Read current state from projections
    const currentDimensions = await modelProjection.getDimensions();
    const shrinkResult = this.calculateShrink(currentDimensions, direction);
    const blocks = await blockProjection.getBlocks();

    // 2. Business rule: no block may fall outside the new bounds
    const orphanedBlocks = findOrphans(blocks, shrinkResult);
    if (orphanedBlocks.length > 0) {
      throw new Error(`Cannot shrink: would orphan ${orphanedBlocks.length} block(s).`);
    }

    // 3. Append one undoable action
    await eventLog.appendAction(projectId, {
      kind: 'dimension-shrink',
      events: [{ type: 'model:dimensionShrunk', data: shrinkResult }],
    });
  }
}
```

The command reads two projections and writes one action. It never mutates a projection.

**Commands** own business rules and writes. **Projections** own derived state and reads. No class does both.

## Core Principles

### 1. No "Manager" or "Controller" Names

These names hide what a class does. Name a class by its behavior or concern:
- `EditorState` holds UI state
- `EditHistory` holds the undo and redo stacks
- `ScreenRouter` decides the visible screen
- `TextureResolver` loads the texture atlas
- `Canvas2D` orchestrates one 2D canvas

When the folder scopes the context (`src/core/rendering/`), the class name does not repeat it (`CameraRig`, not `BabylonCameraRig`).

### 2. Separate Concerns

#### Model State (Persisted)
- **What:** dimensions, blocks (position → block type and block state), and the meta block
- **Where:** derived from EventLog rows by `modelReducer`
- **Storage:** IndexedDB database `mc-blueprint-events`
- **Read through:** `modelProjection`, `blockProjection`, `projectView`

#### Project Metadata (Persisted)
- **What:** project id, name, created and modified timestamps
- **Where:** `metadata:*` rows in the same EventLog
- **Read through:** `metadataProjection`

#### Preview State (Ephemeral)
- **What:** blocks shown during an active stroke
- **Where:** `draftingService` (memory only)
- **Shared:** the 2D and 3D views read the same preview
- **Lifecycle:** `start()` → `set()` → `finalize()` or `cancel()`

#### Editor State (UI)
- **What:** selected block, active layers, paint mode, paint behavior, depth config, layout, dialogs
- **Where:** `editorState`, `screenRouter`, `quickSelectStore`, `renderSettingsStore`
- **Not:** part of the model or its history

#### Input
- **Pointer:** each canvas tool listens on its own canvas (`ToolBase`)
- **Keyboard:** `hotkeyDispatcher` handles global shortcuts. It ignores keys while a text field has focus or a modal is open.

#### Rendering
- **What:** draws model blocks plus preview blocks
- **Where:** `Canvas2D` (`src/core/canvas2d/`) and `Babylon3D` (`src/core/Babylon3D.ts`)
- **Timing:** one shared `renderLoop` tick drives every view

## The Event Log

### One Log for Everything

`eventLog` (`src/core/EventLog.ts`) is the only persisted source of truth. Every project's rows share one IndexedDB object store.

```typescript
interface Event {
  id?: number;        // Auto-increment, assigned on append
  type: string;       // e.g. 'model:blocksPlaced', 'metadata:renamed'
  data: unknown;      // Event-specific payload
  timestamp: number;
  projectId?: string;
  actionId?: string;  // Shared by every row one user action wrote
}
```

Indexes:
- `type`
- `actionId`: reads every row of one action. Action IDs are unique across all projects.
- `projectId_id`: a compound `[projectId, id]` key. One project's rows read in ID order without scanning other projects.

### Row Types

| Type | Written by | Undoable |
|------|-----------|----------|
| `metadata:created` | CreateProjectCommand, LoadProjectFileCommand | No |
| `metadata:renamed` | RenameProjectCommand, LoadProjectFileCommand | No |
| `model:initialized` | CreateProjectCommand | No |
| `model:blocksPlaced`, `model:blocksRemoved` | DraftingService.finalize (kind `paint`) | Yes |
| `model:dimensionExpanded` | ExpandDimensionsCommand (kind `dimension-expand`) | Yes |
| `model:dimensionShrunk` | ShrinkDimensionsCommand (kind `dimension-shrink`) | Yes |
| `model:metaBlockPlaced` | SetMetaBlockCommand (kind `metablock-place`) | Yes |
| `model:metaBlockConfirmed` | Nothing. Older logs hold it, and replay ignores it. | Yes |
| `action:started`, `action:ended` | every undoable action, plus undo and redo | Markers |

`modelReducer` also applies the single-block types `model:blockPlaced` and `model:blockRemoved`. No writer appends them.

### Append APIs

- `append(type, data, projectId)`: one row outside undo history. Used for metadata and `model:initialized`.
- `appendAction(projectId, { kind, tool?, target?, events })`: one undoable action. Writes `action:started`, the events, and `action:ended` in one transaction, all with one new `actionId`. The log never holds part of an action.
- `appendBatch(events)`: complete rows in one transaction. LoadProjectFileCommand uses it to write a whole project from a file.
- `settled()`: resolves when every pending `appendAction` has committed or failed.

`event:appended` fires once per row, only after its transaction commits.

### Multiple Tabs

Tabs share the database. A tab that opens a newer schema version triggers `versionchange` in older tabs. Those tabs close their connection and reload. Before an undo or redo, `EditHistory` compares the latest row ID with the highest ID it has seen. A higher ID came from another tab, so it replays the stacks first.

## Projections

```
EventLog ──event:appended──▶ ModelProjection (owns a ModelReplayer)
                             │   model:rebuilt, model:blocks-rebuilt
                             ▼
                             BlockProjection ── blocks:rebuilt
EventLog ──event:appended──▶ MetadataProjection ── metadata:rebuilt
ModelProjection + MetadataProjection ──▶ ProjectView (no notifications)
```

- **ModelProjection** holds `{ dimensions, blocks, metaBlock }`. It applies each new `model:*` row in place.
- **ModelReplayer** keeps one Model current. An undo or redo marker names no blocks, so it cannot apply in place. The replayer instead replays the whole project with `replayModel()` and skips undone actions. Reads wait for a running replay.
- **BlockProjection** exposes ModelProjection's `BlockIndex` for spatial queries (`getBlocksAtLayer`, `getBlock`). It holds no state of its own, so both projections always agree.
- **MetadataProjection** holds `{ id, name, created, modified }`.
- **ProjectView** combines metadata and model into a `Project`.

Each projection offers two kinds of read:
- `getX()` is async. It calls `ensureFresh()` first, which applies any rows appended since the last read, from any tab.
- `getCached()` is synchronous. Render loops call it after `ensureFresh()` has run.

Projections apply only rows whose `projectId` matches `editorState.getCurrentProjectId()`. Opening a project resets every projection and replays.

`Storage` (`src/core/Storage.ts`) derives the project list from the same log with the same `replayModel()`. A project exists exactly when the log holds its `metadata:created` row.

### Dimensions and Blocks

Dimensions belong to the model. A dimension change shifts blocks and the meta block by the row's `shift` vector. `model:dimensionShrunk` also drops blocks that land outside the new bounds. ShrinkDimensionsCommand rejects a shrink that would drop any block, so in practice none are dropped.

## Undo and Redo

`editHistory` (`src/core/EditHistory.ts`) folds `action:started` markers into two stacks with `historyReducer`.

- An edit marker pushes its action onto the undo stack and clears the redo stack.
- `undo()` appends an empty action of kind `undo` whose `target` is the top of the undo stack.
- `redo()` appends an empty action of kind `redo` whose `target` is the top of the redo stack.
- A marker that targets anything other than the top of its stack changes nothing. A tab with stale stacks cannot reorder history.
- No row stores the state an undo restores. Replay skips the rows of undone actions.
- A new edit after an undo discards the redo stack. The discarded actions stay undone permanently.
- Metadata rows have no `actionId`, so renames and project creation are not undoable.

The stacks survive a reload because they are folded from the log. Undo and redo run one at a time. A step waits while a stroke is active and waits for pending writes with `eventLog.settled()`.

Notifications: `history:replayed`, `history:step-recorded`, `history:step-undone`, `history:step-redone`. `historyAnnouncer` turns each undo and redo into a toast.

## Project Files

Save and load use the same rows the log holds.

- `saveProjectFileCommand` reads the open project's rows and writes JSON (`.mcblueprint`, format `mc-blueprint`, version 1). Rows drop their `id` and `projectId`.
- `loadProjectFileCommand` parses and checks the file. It assigns a new project ID and new action IDs (undo and redo targets follow the same map), then writes every row with `appendBatch`. A loaded project never shares an ID with the project it came from.
- A name already in use gets a `metadata:renamed` row to "Name (from file)" or "Name (from file N)".

The codec lives in `src/utils/projectFile.ts`.

## Three Distinct Patterns

### Event Sourcing (Persisted Rows)

**Purpose:** reconstruct state from persisted rows.

```typescript
// One paint stroke becomes one action
await eventLog.appendAction(projectId, {
  kind: 'paint',
  tool: 'outline',
  events: [
    { type: 'model:blocksRemoved', data: { positions } },
    { type: 'model:blocksPlaced', data: { blocks } },
  ],
});

// State derivation
const model = replayModel(events);  // Pure: skips undone actions
```

**Key Files:** `src/core/EventLog.ts`, `src/reducers/modelReducer.ts`, `src/reducers/historyReducer.ts`, `src/projections/`

### Event-Driven (Notifications)

**Purpose:** loose coupling through ephemeral notifications.

```typescript
// The projection applied a row, then notifies
this.emit('model:rebuilt');

// An HOC re-reads on notification
modelProjection.on('model:rebuilt', handleRebuilt);
```

Notifications are not persisted rows:
- No id, timestamp, or actionId
- Never replayed
- Named `<entity>:<past-tense-action>`, such as `screen:shown`, `layer:adjusted`, `atlas:ready`

### Commands (Imperative Requests)

**Purpose:** request work.

```typescript
await renameProjectCommand.execute(projectId, 'Keep');
await draftingService.finalize(operations);
void editHistory.undo();
editorState.setPaintMode('fill');
```

A command may validate and throw, append rows, and lead to notifications.

## Tool System

### Base Classes

Tools turn pointer input on one canvas into preview blocks and paint actions. All live in `src/core/tools/`.

- **ToolBase**: pan (space-drag or middle mouse), wheel zoom, modifier tracking, and coordinate resolution. A pointer event resolves to a `UniversalPosition` with pixel, grid, and model coordinates, so concrete tools never convert coordinates.
- **ClickDragReleaseTool**: idle → hovering → dragging. Subclasses implement `onHover`, `onDragStart`, `onDrag`, `onDragEnd`, `onDragCancel`.
- **MultiClickTool**: collects up to `maxPoints` clicks. Subclasses implement `onHoverWithPoints`, `onPointPlaced`, `onComplete`, `onMultiClickCancel`.

| Tool | Base | Strategy |
|------|------|----------|
| PointPaintTool | ClickDragReleaseTool | PointPaintStrategy |
| FillPaintTool | ClickDragReleaseTool | FillPaintStrategy |
| OutlinePaintTool | ClickDragReleaseTool | OutlinePaintStrategy (a DragShapeStrategy) |
| CirclePaintTool | ClickDragReleaseTool | CirclePaintStrategy (a DragShapeStrategy) |
| ArchPaintTool | MultiClickTool | ArchPaintStrategy |
| CurvePaintTool | MultiClickTool | CurvePaintStrategy |

`toolRegistry` (`src/core/tools/ToolRegistry.ts`) registers each tool with a name, hotkey, label, and factory at module load. `Canvas2D` creates the active tool from the registry. `hotkeyDispatcher` resolves hotkeys to tool names.

### Modifier Keys

`ToolBase` reads Shift and Alt from key events and from every pointer event, which carries the true state. It writes them to `editorState.setHeldModifiers`, which emits `modifiers:held`. `DragShapeStrategy` reads them when it computes the drag box: Shift squares the box and Alt centers it on the press point. `ClickDragReleaseTool` redraws an active drag when a modifier changes. `src/config/modifierHints.ts` lists each tool's modifiers for the hint chips in the tool options bar.

### Strategies: What to Paint

A `PaintStrategy` (`src/core/painting/strategies/`) computes which positions an interaction covers. It does not know about pointer events or existing blocks.

```typescript
interface PaintOperation {
  position: Vector3D;
  blockType: string | null;  // null erases
  blockState?: BlockStateProperties;
}

interface PaintStrategy {
  calculateOperations(
    startPosition: Vector3D,
    selectedBlockId: string | null,
    dimensions: Dimensions,
    constrainAxis?: { axis: 'x' | 'y' | 'z'; value: number },
  ): PaintOperation[] | Promise<PaintOperation[]>;
}
```

Arch and Curve strategies also implement `GuideGeometryProvider`. The 2D view draws their guide lines.

### Behaviors: Whether to Paint

A `PaintBehavior` (`src/core/painting/behaviors/`) filters operations by what already occupies each position:
- `NormalBehavior`: paint everywhere
- `OnlyReplaceBehavior`: paint only over existing blocks
- `SelectiveReplaceBehavior`: paint only over specific block types

### PaintPipeline

`PaintPipeline.process(operations, viewType, dimensions)` (`src/core/tools/PaintPipeline.ts`) runs every tool's operations through the same stages:

1. **Depth**: repeats each operation through `thickness` layers away from the camera. In `until-collision` mode it stops at the first existing block.
2. **Behavior**: filters through the behavior from `editorState.getPaintBehavior()`.
3. **Delete modifier**: in delete mode, keeps only positions that hold a block.
4. **Block state**: attaches the selected block's default state merged with the user's active state (facing, half, type).

The depth stage does not care what the operations are. Any strategy gains depth through the pipeline.

## DraftingService

`draftingService` (`src/core/DraftingService.ts`) holds preview blocks shared by every view.

```typescript
draftingService.start();                  // draft:started
draftingService.set(previewBlocks);       // draft:updated
await draftingService.finalize(ops);      // appends one paint action, then draft:finalized
draftingService.cancel();                 // draft:cancelled, nothing persisted
```

- The preview is never persisted.
- `finalize(operations)` is the only path from a tool to the log. It writes removals before placements in one `paint` action. Delete mode turns every operation into a removal.
- Only user intent is persisted (block type, facing, half, type). Derived state, such as stair corner shapes, is computed at read time by `shapeCatalog.resolveBlockState()`.
- `getResolvedPreview()` overlays the preview on the real blocks (`OverlayBlockIndex`), so a stair preview shows its final corner shape.
- `isActive()` is true from `start()` until `finalize()` or `cancel()`. Undo waits while a stroke is active.

## Rendering Flow

`renderLoop` (`src/core/RenderLoop.ts`) runs one `requestAnimationFrame` loop for every view:

1. `ensureFresh()` on the projections. It returns at once when no row was appended.
2. Emit `tick`.
3. Each registered view renders from cached projection state.

### 2D (`src/core/canvas2d/`)

- `Canvas2D` wires `ViewState` (zoom, pan, coordinates), `Canvas2DRenderer`, the active tool, and the render loop.
- Model coordinates resolve to grid blocks when a notification arrives, not during the draw. The renderer receives only `GridBlock[]`.
- Preview blocks draw over model blocks.
- `canvas2DMounter.refFor(viewType)` is the canvas ref callback. It creates the `Canvas2D` on mount and destroys it on unmount. A ResizeObserver follows the canvas size.

### 3D (`src/core/Babylon3D.ts`)

- `babylon3d.attach(canvas)` creates the engine, scene, and modules. `detach()` tears them down. `attach` is idempotent.
- Modules in `src/core/rendering/`: `CameraRig`, `MaterialResolver`, `BlockRenderer`, `PreviewRenderer`, `SlicePlaneVisualizer`, and stateless setup functions for lighting, environment, shadows, and post-processing.
- The model is Z-up and right-handed. BabylonJS is Y-up and left-handed. `toBabylonVector` in `babylonUtils.ts` converts.

## Complete Interaction: Click-Drag Paint

```
1. Pointer down on a 2D canvas
   └─> PointPaintTool.onDragStart(pos)
       └─> draftingService.start()                → draft:started

2. Pointer moves
   └─> PointPaintTool.onDrag(start, current)
       ├─> strategy.calculateOperations(...)
       ├─> PaintPipeline.process(...)
       └─> draftingService.set(preview)           → draft:updated
           └─> next tick: views draw model + preview

3. Pointer up
   └─> PointPaintTool.onDragEnd(start, end)
       └─> draftingService.finalize(operations)
           ├─> eventLog.appendAction(projectId, { kind: 'paint', tool, events })
           │   └─> commit → event:appended per row
           │       ├─> ModelProjection applies rows  → model:rebuilt, model:blocks-rebuilt
           │       └─> EditHistory folds the marker  → history:step-recorded
           └─> preview cleared                      → draft:finalized

4. Escape mid-drag
   └─> PointPaintTool.onDragCancel()
       └─> draftingService.cancel()               → draft:cancelled
```

## Anti-Patterns

### ❌ Conflating Event Sourcing and Event-Driven

```typescript
// WRONG: re-broadcasting persisted rows as notifications
eventLog.on('event:appended', (event) => {
  editorState.emit(event.type, event);
});

// WRONG: building state from notifications
const state = notifications.reduce(reducer, null);

// WRONG: persisting a notification
await eventLog.append('draft:updated', previewBlocks);
```

### ✅ Correct Separation

```typescript
// Persist through a writer
await eventLog.appendAction(projectId, { kind: 'metablock-place', events });

// Read from a projection
const model = await modelProjection.getModel();

// Notify after the state changed
this.emit('model:rebuilt');

// Keep previews ephemeral
draftingService.set(previewBlocks);
```

### ❌ Mutating Projections from Commands

```typescript
// WRONG: a command edits read-model state
blockProjection.getCached().set(position, block);
```

Commands append rows. Projections apply them.

### ❌ Storing Derived State in Rows

```typescript
// WRONG: persisting a stair's computed corner shape
{ type: 'model:blocksPlaced', data: { blocks: [{ ..., blockState: { shape: 'inner_left' } }] } }
```

Persist user intent only. Derive the rest at read time.

## Design Rules

1. **DraftingService is the only tool write path.** Tools build previews and call `finalize()`. They never append to the log.
2. **One user action is one undoable action.** A stroke, a dimension step, or a meta block change writes one `appendAction` call, however many rows it holds.
3. **Undo appends, never deletes.** History is a fold over markers. Rows stay immutable.
4. **Strategies compose through the pipeline.** A strategy computes positions. Depth, behavior, delete mode, and block state apply to every strategy the same way.
5. **Tools live in `src/core/tools/`, strategies and behaviors in `src/core/painting/`.**
