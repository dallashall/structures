# Canvas2D Architecture

## Problem
Canvas2DController had become a monolithic God Object with 1400+ lines handling:
- Rendering
- Input handling
- Coordinate conversions
- Preview management
- Painting
- Zoom/pan state
- Cursor management

This violated Single Responsibility Principle and made the code unmaintainable.

## Solution: Composition via Focused Modules

Break Canvas2DController into single-responsibility classes that compose together.

### Module Breakdown

```
Canvas2DController (Orchestrator - ~100 lines)
├── Canvas2DViewport (Coordinate & View State - ~200 lines)
│   ├── Zoom/pan management
│   ├── Pixel ↔ Grid conversion
│   ├── Grid ↔ World conversion
│   └── Grid dimensions calculation
│
├── Canvas2DPreviewManager (Preview Logic - ~250 lines)
│   ├── Outline drag preview
│   ├── Fill preview (Alt key)
│   ├── Point hover preview
│   └── Preview calculation & 3D sync
│
├── Canvas2DRenderer (Pure Rendering - ~300 lines)
│   ├── Grid rendering
│   ├── Block rendering
│   ├── Coordinate axes
│   ├── Layer indicators
│   └── Preview rendering
│
├── Canvas2DInteractionHandler (Input Events - ~400 lines)
│   ├── Mouse events (pan, paint, erase)
│   ├── Keyboard events (space, shift, alt)
│   ├── Wheel events (zoom)
│   └── Cursor state management
│
└── Canvas2DPaintHandler (Paint Operations - ~150 lines)
    ├── Paint execution
    ├── Erase execution
    └── CanvasPainter delegation
```

### Data Flow

**Rendering:**
```
Canvas2DController.render()
  → Canvas2DRenderer.render(viewport, previewMgr, projectState)
    → Reads viewport for zoom/pan/conversions
    → Reads previewMgr for preview data
    → Pure rendering with no state mutation
```

**Input Handling:**
```
User Input
  → Canvas2DInteractionHandler (detects intent)
    → Delegates to appropriate handler:
      - Pan: calls viewport.applyPan()
      - Paint: calls paintHandler.paint()
      - Preview: calls previewMgr.activate()
  → Canvas2DController.render() (update display)
```

**Preview:**
```
User Interaction (drag/alt-key/hover)
  → Canvas2DPreviewManager
    → Uses viewport for coordinate conversion
    → Uses canvasPainter for operation calculation
    → Updates EditorStateManager.previewBlocks
  → Babylon3DController (listens to preview events)
```

### Benefits

**Single Responsibility:**
- Each class has one clear purpose
- Easy to understand at a glance
- Changes are localized

**Testability:**
- Viewport can be tested independently
- Preview logic can be tested without rendering
- Renderer can be tested with mock viewport

**Reusability:**
- Viewport logic could be shared with other views
- Preview logic is decoupled from rendering
- Renderer could work with different viewport implementations

**Maintainability:**
- Finding code is easy (clear module boundaries)
- Adding features is localized
- Refactoring is safe (limited blast radius)

**Composition > Inheritance:**
- No complex inheritance hierarchies
- Clear interfaces between modules
- Easy to swap implementations

### Migration Plan

1. ✅ Create Canvas2DViewport
2. ✅ Create Canvas2DPreviewManager
3. ⏳ Create Canvas2DRenderer
4. ⏳ Create Canvas2DInteractionHandler
5. ⏳ Create Canvas2DPaintHandler
6. ⏳ Refactor Canvas2DController to compose these modules
7. ⏳ Remove old code from Canvas2DController
8. ⏳ Update tests

### File Structure

```
src/core/canvas2d/
├── ARCHITECTURE.md (this file)
├── Canvas2DController.ts (orchestrator)
├── Canvas2DViewport.ts (coordinates & view)
├── Canvas2DPreviewManager.ts (preview logic)
├── Canvas2DRenderer.ts (pure rendering)
├── Canvas2DInteractionHandler.ts (input handling)
└── Canvas2DPaintHandler.ts (paint operations)
```

Total lines: ~1400 (same as before)
Lines per file: ~150-400 (manageable!)
Complexity: Distributed, not concentrated
