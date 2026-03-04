# Separation of Concerns - InteractionHandler Refactoring

## Problem: Concept Spillage

**Before (V2):**
```typescript
class Canvas2DInteractionHandler {
  // ❌ Knows about domain concepts
  private isPlacementMode: boolean;

  handleMouseMove() {
    // ❌ Domain logic in interaction layer
    if (paintMode === 'point') {
      this.previewManager.updatePointPreview(...);
    }

    // ❌ Calling domain modules directly
    this.paintHandler.paintAtPixel(...);
  }
}
```

**Issues:**
- ❌ InteractionHandler knows about "preview," "paint," "placement mode"
- ❌ Tightly coupled to domain logic
- ❌ Not reusable (specific to this app)
- ❌ Violates separation of concerns

## Solution: Generic Interaction Layer

**After (V3):**
```typescript
class Canvas2DInteractionHandler {
  // ✅ Only knows about generic interactions
  private modifiers: ModifierKeys;
  private isDragging: boolean;
  private isPanning: boolean;

  handleMouseMove() {
    // ✅ Generic event emission
    this.handlers.onHover?.(gridPos, modifiers);
    this.handlers.onDragMove?.(gridPos, modifiers);
  }
}
```

**Benefits:**
- ✅ No domain knowledge (preview, paint, placement)
- ✅ Emits generic events
- ✅ Reusable for any grid-based canvas
- ✅ Clean separation of concerns

## Architecture Layers

### Layer 1: Input Events (InteractionHandler)
**Responsibility:** Raw DOM → Semantic interactions
**Knows about:** Mouse, keyboard, modifiers, grid positions
**Doesn't know:** Previews, painting, modes, rendering

```typescript
// Generic interaction events
interface InteractionEventHandlers {
  onHover?: (position, modifiers) => void;
  onClick?: (position, button, modifiers) => void;
  onDragStart?: (position, button, modifiers) => void;
  onDragMove?: (position, modifiers) => void;
  onDragEnd?: (position, modifiers) => void;
  onZoom?: (delta, center) => void;
  onPanStart?: (position) => void;
  onPanMove?: (delta) => void;
  onPanEnd?: () => void;
  onModifierChange?: (modifiers) => void;
}
```

### Layer 2: Domain Logic (Controller)
**Responsibility:** Interaction events → Domain actions
**Knows about:** Paint modes, placement mode, previews
**Doesn't know:** DOM events, raw input

```typescript
class Canvas2DController {
  // Domain logic: decide what to do based on events
  private handleHover(position, modifiers) {
    const paintMode = editorStateManager.getPaintMode();

    // Point mode: show preview
    if (paintMode === 'point') {
      this.previewManager.updatePointPreview(position);
    }
  }

  private handleDragStart(position, button, modifiers) {
    // Placement mode: place meta block
    if (this.isPlacementMode) {
      this.placeMetaBlock(position);
      return;
    }

    // Outline mode: start outline preview
    if (paintMode === 'outline') {
      this.previewManager.startOutlineDrag(position);
      return;
    }

    // Point mode: paint
    this.canvasPainter.paint(...);
  }
}
```

### Layer 3: Specialized Modules
**Responsibility:** Execute specific domain operations
**Examples:** PreviewManager, PaintHandler, Renderer

## Data Flow

```
User Input (mouse/keyboard)
    ↓
InteractionHandler (translates to semantic events)
    ↓ emits: onHover, onClick, onDragStart, etc.
Controller (domain logic decides what to do)
    ↓ delegates to
PreviewManager, PaintHandler, Renderer (execute actions)
```

## Benefits

### 1. Reusability ✅
InteractionHandler can be used for ANY grid-based canvas:
- Chess board
- Spreadsheet
- Tile editor
- Level editor
- etc.

Just provide different event handlers with your domain logic.

### 2. Testability ✅
```typescript
// Test interaction layer independently
test('emits onHover when mouse moves to new cell', () => {
  const onHover = jest.fn();
  const handler = new Canvas2DInteractionHandler(
    canvas,
    viewport,
    { onHover }
  );

  simulateMouseMove(canvas, 100, 100);
  expect(onHover).toHaveBeenCalledWith(
    { gridX: 5, gridY: 5 },
    { space: false, shift: false, ... }
  );
});

// Test domain logic independently
test('point mode hover shows preview', () => {
  const controller = new Canvas2DController(...);
  controller.handleHover({ gridX: 5, gridY: 5 }, {});
  expect(previewManager.updatePointPreview).toHaveBeenCalled();
});
```

### 3. Maintainability ✅
- Change interaction detection? Edit InteractionHandler only
- Change domain logic? Edit Controller only
- Clear boundaries, localized changes

### 4. Extensibility ✅
Adding new domain features is easy:
```typescript
// New feature: "stamp mode" (click to place pattern)
private handleClick(position, button, modifiers) {
  if (stampMode) {
    this.stampManager.placeStamp(position);
    return;
  }
  // ... existing logic
}
```

No changes to InteractionHandler needed!

## Concepts by Layer

| Concept | InteractionHandler | Controller | Modules |
|---------|-------------------|------------|---------|
| Mouse events | ✅ | ❌ | ❌ |
| Keyboard events | ✅ | ❌ | ❌ |
| Modifier keys | ✅ | ✅ | ❌ |
| Grid positions | ✅ | ✅ | ✅ |
| Drag state | ✅ | ❌ | ❌ |
| Pan state | ✅ | ❌ | ❌ |
| Paint mode | ❌ | ✅ | ❌ |
| Placement mode | ❌ | ✅ | ❌ |
| Preview | ❌ | ✅ | ✅ |
| Rendering | ❌ | ✅ | ✅ |
| Painting | ❌ | ✅ | ✅ |

## Before vs After

### Before: Tightly Coupled
```
InteractionHandler
├── Knows about preview
├── Knows about paint
├── Knows about placement mode
├── Knows about rendering
└── Calls domain modules directly

Result: Cannot reuse, hard to test, concepts mixed
```

### After: Loosely Coupled
```
InteractionHandler (generic)
    ↓ emits events
Controller (domain logic)
    ↓ delegates to
Specialized Modules (execution)

Result: Reusable, testable, clear boundaries
```

## Key Principle

**Each layer should only know about concepts at its level of abstraction.**

- Low-level (InteractionHandler): Mouse, keyboard, grid coordinates
- Mid-level (Controller): Modes, features, orchestration
- High-level (Modules): Specialized domain operations

**Concept spillage** (low-level knowing about high-level) breaks modularity and reusability.

This refactoring eliminates concept spillage! ✅
