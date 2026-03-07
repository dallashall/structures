# Architecture Patterns and Decisions

## Core Principles

### 1. Avoid "Manager" and "Controller" Anti-Patterns

**Problem:** These names signal ambiguous purpose or doing too many things.

**Instead:** Name by actual concern/responsibility:
- ❌ `ProjectManager` → ✅ `Model` or `ModelHistory`
- ❌ `EditorStateManager` → ✅ `EditorState`
- ❌ `Canvas2DController` → ✅ `Canvas2D` or tool-specific names

### 2. Clear Separation of Concerns

The application has distinct concerns that must not be conflated:

#### **Model State (Persisted)**
- **What:** The 3D structure - coordinates → material (+ direction in future)
- **Where:** Derived from event history
- **Storage:** EventStore (persisted to localStorage)
- **Access:** `modelHistory.replay()` returns current model state
- **Immutable:** State is computed, not mutated

#### **Preview/Draft State (Ephemeral)**
- **What:** Blocks being placed during active interaction
- **Where:** DraftingService (in-memory only)
- **Shared:** All views (2D/3D) see the same preview
- **Structure:** Raw data `Array<{ position, material, direction? }>`
- **Lifecycle:** start → set → finalize/cancel

#### **Editor State (UI)**
- **What:** Selected material, active layer, current tool/mode
- **Where:** EditorState singleton
- **Not:** The model itself, just UI configuration

#### **Input (Interaction)**
- **What:** Touch/mouse, keyboard, modifiers
- **Where:** Per-canvas listeners, global keyboard shortcuts
- **Pattern:** Browser's event system with bubbling

#### **Rendering (Visualization)**
- **What:** Pure visualization combining model + preview
- **Formula:** `render(modelBlocks + previewBlocks)`
- **No state:** Just draws what it's given

## Three Distinct Patterns

### Event Sourcing (Model History)

**Purpose:** State reconstruction from persisted events

```typescript
// Event structure (persisted)
interface BlockPlacedEvent {
  type: 'block:placed';
  eventId: string;
  timestamp: number;
  sessionId: string;
  projectId: string;
  version: number;
  payload: {
    position: Vector3D;
    blockType: string;
    previousBlockType?: string;
  };
}

// State derivation
const model = modelHistory.replay(projectId);
// Internally: events.reduce(reducer, initialState)

// Undo/redo
modelHistory.undo();  // Replay to version - 1
modelHistory.redo();  // Replay to version + 1
```

**Key Files:**
- `src/core/ModelHistory.ts` (formerly EventStore)
- `src/events/types.ts`
- `src/reducers/modelReducer.ts` (formerly projectReducer)

### Event-Driven (Notifications)

**Purpose:** Loose coupling via ephemeral notifications

```typescript
// After persisting event to history
modelHistory.write(blocks);  // Persists event

// Emit notification (separate from persisted event)
modelHistory.emit('model:updated');  // Generic notification

// Views subscribe
modelHistory.on('model:updated', () => {
  const model = modelHistory.replay();
  updateView(model);
});
```

**Not the same as Event Sourcing events:**
- Notifications are ephemeral (not persisted)
- No version, timestamp, or eventId
- Just signals "something changed"

### Commands (Imperative Requests)

**Purpose:** Request that work be done

```typescript
// User action triggers command
draftingService.finalize();  // Command
modelHistory.undo();         // Command
editorState.setMaterial('stone');  // Command

// Commands may:
// - Validate and reject
// - Create events (Event Sourcing)
// - Emit notifications (Event-Driven)
```

## Tool System Architecture

### Base Tool Classes

Tools abstract interaction patterns from application:

```typescript
// Base class for click-drag interactions
abstract class ClickDragTool {
  constructor(protected draftingService: DraftingService) {}

  // Base class wires up actual event listeners
  private wireListeners() {
    canvas.on('mousedown', this.handleStart);
    canvas.on('mousemove', this.handleMove);
    canvas.on('mouseup', this.handleEnd);
  }

  // Subclasses override these NOOPs
  protected onInteractionStart(ctx: InteractionContext): void {}
  protected onInteractionMove(ctx: InteractionContext): void {}
  protected onInteractionEnd(ctx: InteractionContext): void {}
}

// Concrete tool
class PaintTool extends ClickDragTool {
  constructor(
    draftingService: DraftingService,
    private strategy: PaintStrategy
  ) {
    super(draftingService);
  }

  protected onInteractionStart(ctx: InteractionContext) {
    this.draftingService.start();
  }

  protected onInteractionMove(ctx: InteractionContext) {
    const blocks = this.strategy.calculate(ctx.position);
    this.draftingService.set(blocks);
  }

  protected onInteractionEnd(ctx: InteractionContext) {
    this.draftingService.finalize();
  }
}
```

**Base Tool Types:**
- `SingleClickTool` - One click performs action
- `ClickDragTool` - Click, drag, release
- `MultiClickTool` - Multiple clicks to define shape
- `ModifierTool` - Keyboard modifier changes behavior

**Location:** `src/core/tools/base/`

### Strategy Pattern (Composable Functions)

Strategies are **pure functional transformations** that tools compose.

```typescript
// Strategy interface
interface PaintStrategy {
  calculate(
    position: Vector3D,
    material: string,
    constraints: Constraints
  ): Array<{ position: Vector3D; material: string }>;
}

// Point strategy - single block
class PointStrategy implements PaintStrategy {
  calculate(position, material) {
    return [{ position, material }];
  }
}

// Outline strategy - rectangle outline
class OutlineStrategy implements PaintStrategy {
  calculate(position, material, constraints) {
    const { startPos, endPos } = constraints;
    return calculateRectangleOutline(startPos, endPos, material);
  }
}

// Depth strategy - copy blocks N layers in M direction
class DepthStrategy {
  apply(
    blocks: Array<{ position; material }>,
    layers: number,
    direction: Direction
  ): Array<{ position; material }> {
    // Doesn't care WHAT the blocks are
    // Just copies them N times in direction
    return blocks.flatMap(block =>
      Array.from({ length: layers }, (_, i) => ({
        position: offsetInDirection(block.position, direction, i),
        material: block.material
      }))
    );
  }
}
```

**Composing Strategies:**

```typescript
// Tool composes multiple strategies
class TunnelPaintTool extends ClickDragTool {
  constructor(
    draftingService: DraftingService,
    private outlineStrategy: OutlineStrategy,
    private depthStrategy: DepthStrategy
  ) {
    super(draftingService);
  }

  protected onInteractionMove(ctx: InteractionContext) {
    // 1. Calculate outline
    const outlineBlocks = this.outlineStrategy.calculate(
      ctx.position,
      ctx.material,
      { startPos: this.startPos, endPos: ctx.position }
    );

    // 2. Apply depth
    const tunnelBlocks = this.depthStrategy.apply(
      outlineBlocks,
      ctx.depthLayers,
      ctx.depthDirection
    );

    // 3. Send to drafting service
    this.draftingService.set(tunnelBlocks);
  }
}
```

**Key Insight:** Strategies are functional, composable, and don't care about interaction patterns. Tools orchestrate strategies based on user interaction.

**Location:** `src/core/painting/strategies/`

## DraftingService

Manages ephemeral preview state shared across all views.

```typescript
class DraftingService extends EventEmitter {
  private previewBlocks: Array<{
    position: Vector3D;
    material: string;
    direction?: Direction;
  }> = [];

  /**
   * Start new draft (clear previous)
   */
  start(): void {
    this.previewBlocks = [];
    this.emit('draft:started');
  }

  /**
   * Update draft with new blocks
   */
  set(blocks: Array<{ position; material; direction? }>): void {
    this.previewBlocks = blocks;
    this.emit('draft:updated');  // Views re-render
  }

  /**
   * Finalize draft - persist to history
   */
  finalize(): void {
    if (this.previewBlocks.length === 0) return;

    // Write to model history (creates event, persists)
    modelHistory.write(this.previewBlocks);

    // Clear preview
    this.previewBlocks = [];
    this.emit('draft:finalized');
  }

  /**
   * Cancel draft - discard without persisting
   */
  cancel(): void {
    this.previewBlocks = [];
    this.emit('draft:cancelled');
  }

  /**
   * Get current preview blocks
   */
  getPreview(): Array<{ position; material; direction? }> {
    return this.previewBlocks;
  }
}

export const draftingService = new DraftingService();
```

**Key Points:**
- Preview is ephemeral (not in ModelHistory)
- Shared across all views (2D and 3D)
- `finalize()` delegates to ModelHistory for persistence
- Emits notifications for view updates

**Location:** `src/core/DraftingService.ts`

## ModelHistory (formerly EventStore/ProjectManager)

Manages persisted events and state derivation.

```typescript
class ModelHistory extends EventEmitter {
  private journal: ModelEvent[] = [];
  private snapshots: Map<number, Snapshot> = new Map();
  private currentVersion: number = 0;

  /**
   * Write blocks to history (creates event internally)
   */
  write(blocks: Array<{ position; material; direction? }>): void {
    // Create compound event
    const event: CompoundEvent = {
      type: 'compound',
      eventId: generateUUID(),
      timestamp: Date.now(),
      sessionId: getSessionId(),
      projectId: this.currentProjectId,
      version: this.currentVersion,
      events: blocks.map(block => ({
        type: 'block:placed',
        eventId: generateUUID(),
        timestamp: Date.now(),
        sessionId: getSessionId(),
        projectId: this.currentProjectId,
        version: this.currentVersion,
        payload: block
      }))
    };

    // Persist event
    this.journal.push(event);
    this.currentVersion++;
    this.persist();

    // Notify (Event-Driven)
    this.emit('model:updated');
  }

  /**
   * Replay events to get current model state
   */
  replay(projectId?: string): Model {
    const events = this.getEvents(projectId);
    return events.reduce(modelReducer, initialModel);
  }

  /**
   * Undo last operation
   */
  undo(): void {
    // Move version pointer back
    // Re-emit model:updated
  }

  /**
   * Redo undone operation
   */
  redo(): void {
    // Move version pointer forward
    // Re-emit model:updated
  }
}

export const modelHistory = new ModelHistory();
```

**Responsibilities:**
- Persist events to localStorage
- Replay events to derive model state
- Snapshot compaction
- Undo/redo via version pointers
- Emit notifications when model changes

**Location:** `src/core/ModelHistory.ts`

## Rendering Flow

### 2D Canvas Rendering

```typescript
class Canvas2DRenderer {
  render() {
    // 1. Get model state (from history)
    const model = modelHistory.replay(projectId);

    // 2. Get preview state (ephemeral)
    const preview = draftingService.getPreview();

    // 3. Render model blocks (solid)
    for (const block of model.blocks) {
      this.drawBlock(block, { opacity: 1.0 });
    }

    // 4. Render preview blocks (translucent)
    for (const block of preview) {
      this.drawBlock(block, { opacity: 0.7 });
    }
  }
}

// Subscribe to updates
modelHistory.on('model:updated', () => canvas.render());
draftingService.on('draft:updated', () => canvas.render());
```

### 3D Babylon Rendering

```typescript
class Babylon3DRenderer {
  render() {
    const model = modelHistory.replay(projectId);
    const preview = draftingService.getPreview();

    // Update model meshes
    this.updateModelMeshes(model.blocks);

    // Update preview meshes (with transparency)
    this.updatePreviewMeshes(preview);
  }
}
```

## Complete User Interaction Flow

### Example: Click-Drag Paint

```
1. User clicks canvas
   └─> PaintTool.onInteractionStart()
       └─> draftingService.start()
           └─> Clears previous preview
           └─> Emits 'draft:started'

2. User drags
   └─> PaintTool.onInteractionMove(position)
       └─> strategy.calculate(position) → blocks[]
       └─> draftingService.set(blocks)
           └─> Updates preview
           └─> Emits 'draft:updated'
           └─> Views render: model + preview

3. User releases
   └─> PaintTool.onInteractionEnd()
       └─> draftingService.finalize()
           ├─> modelHistory.write(previewBlocks)
           │   ├─> Creates CompoundEvent
           │   ├─> Appends to journal
           │   ├─> Persists to localStorage
           │   └─> Emits 'model:updated'
           └─> Clears preview
           └─> Emits 'draft:finalized'
           └─> Views render: model (includes finalized blocks)

4. User presses ESC
   └─> PaintTool.onEscape()
       └─> draftingService.cancel()
           └─> Clears preview without persisting
           └─> Emits 'draft:cancelled'
           └─> Views render: model only
```

## File Structure

```
src/
├── core/
│   ├── ModelHistory.ts          (Event Sourcing - persisted events)
│   ├── DraftingService.ts       (Ephemeral preview state)
│   ├── EditorState.ts           (UI state - selected material, layer, tool)
│   ├── EventEmitter.ts          (Base class for pub/sub)
│   ├── UndoManager.ts           (Undo/redo coordination)
│   │
│   ├── tools/
│   │   ├── base/
│   │   │   ├── SingleClickTool.ts
│   │   │   ├── ClickDragTool.ts
│   │   │   ├── MultiClickTool.ts
│   │   │   └── ModifierTool.ts
│   │   └── paint/
│   │       ├── PaintTool.ts
│   │       ├── FillTool.ts
│   │       └── TunnelTool.ts
│   │
│   └── painting/
│       └── strategies/
│           ├── PointStrategy.ts
│           ├── FillStrategy.ts
│           ├── OutlineStrategy.ts
│           └── DepthStrategy.ts
│
├── events/
│   └── types.ts                 (Event type definitions)
│
├── reducers/
│   └── modelReducer.ts          (Pure reducer for state derivation)
│
└── panels/
    ├── Canvas2D.tsx             (2D view)
    └── Canvas3D.tsx             (3D view)
```

## Anti-Patterns to Avoid

### ❌ Conflating Event Sourcing and Event-Driven

```typescript
// WRONG - Emitting persisted events as notifications
eventStore.on('event:appended', (event) => {
  this.emit(event.type, event);  // ❌ Don't broadcast persisted events
});

// WRONG - Using notifications for state reconstruction
const state = notifications.reduce(reducer, null);  // ❌ Use ModelHistory

// WRONG - Persisting notification events
this.emit('block:placed', block);
modelHistory.appendEvent(notificationEvent);  // ❌ Notifications aren't persisted
```

### ✅ Correct Separation

```typescript
// GOOD - Event Sourcing (persisted)
const event: BlockPlacedEvent = { /* full structure */ };
modelHistory.append(event);
const model = modelHistory.replay();

// GOOD - Event-Driven (notifications)
this.emit('model:updated');  // After persisting

// GOOD - Preview (ephemeral)
draftingService.set(previewBlocks);  // Not persisted
```

### ❌ Putting Preview in Model History

```typescript
// WRONG - Draft events in ModelHistory
modelHistory.setDraftEvent(previewEvent);  // ❌ Preview isn't historical
```

### ✅ Correct Preview Management

```typescript
// GOOD - Preview in DraftingService
draftingService.set(previewBlocks);  // Ephemeral, shared
```

## Decision Log

### 1. DraftingService.finalize() delegates to ModelHistory

**Decision:** `draftingService.finalize()` calls `modelHistory.write(blocks)`. ModelHistory handles event creation and persistence.

**Rationale:** Clear separation - DraftingService manages ephemeral preview, ModelHistory manages persisted events.

### 2. Tools in src/core/tools/ with subfolders

**Decision:** Tools organized by base type and application:
- `src/core/tools/base/` - Base classes (ClickDragTool, etc.)
- `src/core/tools/paint/` - Paint-related tools
- `src/core/tools/select/` - Selection tools (future)

**Rationale:** Clear organization, easy to find tools by interaction pattern or purpose.

### 3. Strategies are composable within tools

**Decision:** Strategies are pure functions/classes that tools compose. A tool can combine OutlineStrategy + DepthStrategy to paint a tunnel.

**Rationale:** Strategies are functional transformations, tools are interaction patterns. Composition enables powerful combinations without explosion of tool classes.

**Example:** DepthStrategy doesn't care what blocks it's copying - it just applies "copy N layers in M direction" transformation.
