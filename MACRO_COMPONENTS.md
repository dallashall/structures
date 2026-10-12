# Macro Components

This document maps the major pieces of the app by layer. Each entry names the file, its job, its main methods, and the notifications it emits. Read [ARCHITECTURE_PATTERNS.md](./.claude/skills/ARCHITECTURE_PATTERNS.md) for the rules that tie them together.

Data moves in one direction:

```
User input -> Command or DraftingService -> EventLog (IndexedDB)
           -> Projections replay events -> notifications -> HOCs -> components
```

Singletons export one instance in camelCase (`eventLog`, `editorState`). Every class that emits notifications extends `EventEmitter` (`src/core/EventEmitter.ts`), which provides `on`, `off`, and `emit`.

## Event log

### EventLog

**File:** `src/core/EventLog.ts`

The single source of truth. It holds one IndexedDB object store of events with auto-increment `id`, plus `projectId` and `actionId` indexes. The `actionId` index looks up across all projects.

- `append(type, data, projectId)` writes one event outside any action.
- `appendAction(projectId, draft)` writes an `action:started` marker, the action's events, and an `action:ended` marker in one transaction. It returns the new action ID.
- `appendBatch(events)` writes many rows in one transaction. Project file loads use it.
- `settled()` resolves after pending writes commit.
- `getEvents(query)` filters by `fromId`, `toId`, `types`, and `projectId`.
- `getActionEvents(actionId)`, `getLatestEventId()`, `deleteProjectEvents(projectId)`, `clear()`, `deleteDatabase()`.

Action kinds: `paint`, `dimension-expand`, `dimension-shrink`, `metablock-place`, `metablock-confirm`, `undo`, `redo`. Undo and redo markers carry `data.target`, the action ID they act on.

Persisted event types: `metadata:created`, `metadata:renamed`, `model:initialized`, `model:blockPlaced`, `model:blockRemoved`, `model:blocksPlaced`, `model:blocksRemoved`, `model:dimensionExpanded`, `model:dimensionShrunk`, `model:metaBlockPlaced`, `model:metaBlockConfirmed`, plus the action markers.

**Emits:** `event:appended` (event) after each committed row.

## Commands

Commands live in `src/commands/`. Each one validates against projections and appends events to the EventLog. None of them changes a projection directly.

| Command | Method | Writes |
|---|---|---|
| `createProjectCommand` | `execute(name, dimensions)` returns the project ID | `metadata:created`, `model:initialized` |
| `openProjectCommand` | `execute(projectId)`, `executeLastOpened()` | Nothing. Sets the current project and waits until every projection holds it. |
| `renameProjectCommand` | `execute(newName)` | `metadata:renamed` |
| `expandDimensionsCommand` | `execute(direction)` | A `dimension-expand` action |
| `shrinkDimensionsCommand` | `execute(direction)` | A `dimension-shrink` action. Refuses when blocks would fall outside. |
| `setMetaBlockCommand` | `execute(position)` | A `metablock-place` action |
| `confirmMetaBlockCommand` | `execute()` | A `metablock-confirm` action |
| `saveProjectFileCommand` | `execute()` returns false on cancel | Nothing. Writes the project's events to a file on disk. |
| `loadProjectFileCommand` | `execute()` opens a picker, `load(text)` returns the new project ID | Every row in the file under a new project ID, in one transaction |

### Project files

`src/utils/projectFile.ts` holds the file codec. A `.mcblueprint` file is plain JSON:

```json
{ "format": "mc-blueprint", "version": 1, "name": "...", "savedAt": 0, "events": [] }
```

- Each event row keeps `type`, `data`, `timestamp`, and `actionId`. It drops the log's `id` and `projectId`.
- `parseProjectFile` rejects invalid JSON, another format, a newer version, damaged rows, and a file whose first event is not `metadata:created`. It throws `ProjectFileError`.
- `toLoadedEvents` assigns the new project ID to every row and to the IDs inside `metadata:created` and `model:initialized`. It maps every action ID and undo/redo target to a fresh UUID, so two loads of one file share no actions.
- `toUnusedName` keeps the name when it is free. Otherwise it returns "Name (from file)", then "Name (from file 2)", and so on. The load command appends a `metadata:renamed` event when the name changes.

`src/utils/fileAccess.ts` does the browser file I/O. `saveTextFile` uses `showSaveFilePicker` where the browser has it and falls back to a download link. `openTextFile` uses a hidden file input.

## Projections and reducers

Projections replay the EventLog for the current project into read models. Each has `ensureFresh()`, which returns at once when no new events exist, and `getCached()` for synchronous reads inside a render tick.

| Projection | File | Holds | Emits |
|---|---|---|---|
| `modelProjection` | `src/projections/ModelProjection.ts` | Dimensions, blocks, meta block | `model:rebuilt`, `model:blocks-rebuilt` |
| `blockProjection` | `src/projections/BlockProjection.ts` | The model's `BlockIndex`, with `getBlock` and `getBlocksAtLayer` | `blocks:rebuilt` |
| `metadataProjection` | `src/projections/MetadataProjection.ts` | ID, name, created, modified | `metadata:rebuilt` |
| `projectView` | `src/projections/ProjectView.ts` | Metadata and model joined into one `Project` | Nothing |

`ModelReplayer` (`src/projections/ModelReplayer.ts`) keeps one model current. Model events apply in place. An undo or redo marker names no blocks, so it triggers a full replay that skips undone actions.

`src/reducers/modelReducer.ts` applies `model:*` events to a model. ModelProjection and Storage share it. `src/reducers/historyReducer.ts` folds action markers into undo and redo stacks. History is linear. A marker that targets anything other than the top of its stack changes nothing.

## Core singletons

### EditHistory

**File:** `src/core/EditHistory.ts`

Undo and redo stacks for the open project, folded from action markers, so they survive a reload. `undo()` and `redo()` append an empty action that names its target. Also `canUndo()`, `canRedo()`, `replay(projectId)`, `describe(actionId)`.

**Emits:** `history:replayed`, `history:step-recorded`, `history:step-undone` and `history:step-redone` (with `{ actionId }`).

### HistoryAnnouncer

**File:** `src/core/HistoryAnnouncer.ts`

Turns each undo and redo into a toast that expires on its own. `getToasts()`, `remove(key)`.

**Emits:** `toast:shown`, `toast:expired`, `toast:removed`.

### DraftingService

**File:** `src/core/DraftingService.ts`

Holds preview blocks while a tool draws. Both the 2D and 3D views read it. `finalize(operations)` is the only path by which a tool writes to the EventLog. It appends one `paint` action. Also `start()`, `set(blocks)`, `cancel()`, `isActive()`, `getPreview()`, `getResolvedPreview()`. The resolved preview runs block-state derivation (stair joins) over an `OverlayBlockIndex`, so preview stairs see each other.

**Emits:** `draft:started`, `draft:updated`, `draft:finalized`, `draft:cancelled`.

### EditorState

**File:** `src/core/EditorState.ts`

UI state for the editor. It holds the layout mode, active view, active layer per axis, tool, paint mode and behavior, shape fill mode, depth config, foreground and background blocks, quick-select slots, block state (facing, half), material browser state, slice guide visibility, render settings, hover previews, and the current project ID. Setters are arrow functions (`setActiveTool`, `incrementLayer`, `rotateFacing`, `setRenderSettings`, and so on) so components can pass them as callbacks.

**Emits:** `layout:toggled`, `view:switched`, `layer:adjusted`, `block:selected`, `materialslot:toggled`, `tool:selected`, `paintmode:selected`, `paintbehavior:selected`, `shapefillmode:selected`, `depthconfig:applied`, `placementmode:toggled`, `actionbar:toggled`, `materialbrowser:toggled`, `materialbrowser:search:entered`, `materialbrowser:tab:switched`, `drag:started`, `drag:cleared`, `quickselect:assigned`, `quickselect:foreground:selected`, `quickselect:background:selected`, `blockstate:applied`, `preview:rendered`, `project:switched`, `sliceguide:axis:toggled`, `rendersettings:applied`, `rendersettingsmodal:toggled`.

### ScreenRouter

**File:** `src/core/ScreenRouter.ts`

Which top-level screen shows (`welcome`, `editor`, or the `#/preview` component gallery), which app-level dialog is open, and the current file error. Methods: `showWelcome`, `showEditor`, `openNewProjectDialog`, `closeNewProjectDialog`, `openCreditsDialog`, `closeCreditsDialog`, `showFileError`, `dismissFileError`.

**Emits:** `screen:shown`, `newprojectdialog:toggled`, `creditsdialog:toggled`, `file-error:shown`, `file-error:dismissed`.

### Storage

**File:** `src/core/Storage.ts`

Project browser queries. The project list is derived from the EventLog on every read. A project exists exactly when the log holds its `metadata:created` event. `listProjects()`, `getProject(id)`, `deleteProject(id)`, `getLastOpenedProjectId()`, `setLastOpenedProjectId(id)`. Deleting a project removes its events, thumbnail, quick-select slots, render settings, and last-opened entry. The last opened project ID lives in a separate IndexedDB database. The app writes nothing to localStorage.

**Emits:** `project:deleted`.

### SaveTracker

**File:** `src/core/SaveTracker.ts`

Counts project writes still in flight. EventLog, QuickSelectStore, and RenderSettingsStore pass each write promise to `track()`. A write counts when its transaction commits. `getSaveState()` returns `saving` while any write is in flight, `error` after a failed write until a later write commits, and `saved` otherwise.

**Emits:** `save:started`, `save:completed`, `save:failed`.

### Other IndexedDB stores

These hold derived or per-project preference data outside the EventLog.

- `quickSelectStore` (`src/core/QuickSelectStore.ts`) keeps nine quick-select slots per project, plus the foreground and background slot indexes.
- `renderSettingsStore` (`src/core/RenderSettingsStore.ts`) keeps one render settings record per project.
- `thumbnailStore` (`src/core/ThumbnailStore.ts`) keeps one JPEG data URL per project. It emits `thumbnail:saved` (projectId).

### BlockRegistry

**File:** `src/core/BlockRegistry.ts`

The block catalog, loaded from `public/data/canonical-blocks.json`. `getBlock(id)`, `getAllBlocks()`, `getPickableBlocks()`, `getBlocksByCategory(category)`, `searchBlocks(query)`, `waitForLoad()`.

**Emits:** `blocks:loading`, `blocks:registered` (blocks), `blocks:error`.

### TextureResolver

**File:** `src/core/TextureResolver.ts`

Loads `public/atlas.png` and `public/atlas.json` and answers UV and tint queries per block face. `getAtlasStatus()` returns `loading`, `ready`, or `missing`. When the atlas is missing, every view draws flat colors. Also `getAtlas()`, `getAtlasMetadata()`, `isAtlasLoaded()`, `waitForAtlas()`, `getTintedTexture(blockId, faceIndex)`.

**Emits:** `atlas:ready`, `atlas:error`.

### SwatchPainter

**File:** `src/core/SwatchPainter.ts`

Paints a block's front texture onto small swatch canvases. `refFor(blockId, pixelSize, fallbackColor)` returns a ref callback, so swatches repaint without effects.

### HotkeyDispatcher

**File:** `src/core/HotkeyDispatcher.ts`

Global keyboard shortcuts, set up once in `src/main.tsx`. Key bindings live in `src/core/Shortcuts.ts`.

- 1 to 9 pick a quick-select slot. F swaps the foreground and background slot.
- T rotates facing and Y flips a slab half, when the selected block has state.
- W/S, A/D, and X/C step the Z, X, and Y layers.
- E toggles the material browser.
- B, R, O, G, and V pick the point, outline, circle, arch, and curve tools.
- Ctrl/Cmd+Z undoes. Ctrl/Cmd+Shift+Z redoes.

### RenderLoop and FrameStats

`renderLoop` (`src/core/RenderLoop.ts`) runs one `requestAnimationFrame` loop for every view. Each tick it calls `ensureFresh()` on the projections and then emits `tick`. Views call `register()` and `unregister()`. `frameStats` (`src/core/FrameStats.ts`) records frame timings and emits `framestats:sampled`.

### Babylon3D

**File:** `src/core/Babylon3D.ts`

The 3D view. `attach(canvas)` creates the engine, scene, and rendering modules. `detach()` captures any pending thumbnail and then tears them down. Also `setCameraView`, `zoomCamera`, `fitToModel`, `resetCamera`, `setVisible`. It subscribes to projection, DraftingService, EditorState, and TextureResolver notifications. See [src/core/rendering/README.md](./src/core/rendering/README.md) for its modules.

## Canvas2D

The 2D views live in `src/core/canvas2d/`, with tools in `src/core/tools/` and painting logic in `src/core/painting/`. Each layer knows only the concepts at its own level.

| Layer | Files | Knows about | Does not know about |
|---|---|---|---|
| Input and tool behavior | `ToolBase`, `ClickDragReleaseTool`, `MultiClickTool`, concrete tools | DOM pointer and wheel events, modifier keys, grid positions, drag state | Drawing |
| Orchestration | `Canvas2D` | Projections, EditorState, DraftingService, the active tool | DOM events |
| Coordinates | `ViewState`, `CoordinateConverter` | Zoom, pan, pixel to grid to model conversion | Domain state |
| Drawing | `Canvas2DRenderer`, `drawGrid`, `drawBlocks`, `drawPreview`, `drawOverlays`, `GuideGeometryRenderer` | `GridBlock` data and a canvas context | Model coordinates |

- `ToolBase` handles pan (Space+drag or middle mouse), wheel zoom, modifier tracking, and pointer to grid to model resolution. Concrete tools never convert coordinates.
- `ClickDragReleaseTool` is the base for point, outline, circle, and fill. `MultiClickTool` is the base for arch (three clicks) and curve (four clicks).
- `toolRegistry` (`src/core/tools/ToolRegistry.ts`) registers each tool by name and hotkey. Canvas2D creates tools through it.
- A tool computes operations with a paint strategy (`src/core/painting/strategies/`). It then runs them through `PaintPipeline`: `applyDepth`, then `applyBehavior` (normal, only-replace, selective-replace), then `applyDeleteModifier`. It hands the result to DraftingService.
- `Canvas2D` converts model positions to `GridBlock` records when data changes, not on every frame. The renderer receives only `GridBlock` arrays.
- `canvas2DMounter` (`src/core/canvas2d/Canvas2DMounter.ts`) hands out one stable ref callback per view type. React calls it with the canvas on mount and with null on unmount, which creates and destroys one `Canvas2D` without effects.

Block shapes live in `src/core/shapes/`. `shapeCatalog.resolve(blockId)` returns a `CubeShape`, `SlabShape`, or `StairShape`. Renderers and the pipeline ask the shape instead of branching on block type. `StairShapeResolver.ts` computes stair joins.

## Higher-order components

HOCs live in `src/hocs/`. Each subscribes to singleton notifications and injects props. Components never subscribe themselves.

| HOC | Injects | Subscribes to |
|---|---|---|
| `withScreenState` | `screen`, `isNewProjectDialogOpen`, `isCreditsDialogOpen`, `fileError` | ScreenRouter: all five notifications |
| `withAtlasStatus` | `atlasStatus` | TextureResolver: `atlas:ready`, `atlas:error`. It reads the status once more after subscribing, since the load can settle before the subscription. |
| `withProjectState` | `project` | `model:rebuilt`, `metadata:rebuilt` |
| `withProjectListState` | `projects`, `isLoadingProjects`, `selectedProjectId`, `onSelectProject`, `onDeleteProject` | `project:deleted`, `thumbnail:saved` |
| `withEditorState` | Every EditorState value the editor shows | The EditorState notifications that change those values |
| `withBlockRegistry` | `blocks`, `getBlock`, `searchBlocks` | `blocks:registered` |
| `withEditHistory` | `canUndo`, `canRedo`, `onUndo`, `onRedo` | The four `history:*` notifications |
| `withHistoryToast` | `toasts`, `onExited` | The three `toast:*` notifications |
| `withMaterialBrowserState` | Open state, search query, tab, results, grid width | `materialbrowser:*`, `blocks:registered` |
| `withFrameStats` | `stats` | `framestats:sampled` |
| `withSaveState` | `saveState` | `save:started`, `save:completed`, `save:failed` |
| `withNewProjectFormState` | `newProjectForm`, `onNewProjectFormChange`, `onNewProjectFormReset` | Nothing. It holds local form state. |
| `withDisclosureState` | `isOpen`, `anchorEl`, `onOpen`, `onClose` | Nothing. It holds local popover state. |

## Views, layouts, and panels

- `App` (`src/App.tsx`) is wrapped in `withAtlasStatus(withScreenState(...))`. It picks the screen and renders the app-level dialogs.
- `WelcomeView` (`src/views/WelcomeView.tsx`) lists projects as `ProjectCard`s with thumbnails. It offers New Project, Load from File, and Credits, and shows `TexturesMissingAlert` when the atlas is missing.
- `EditorView` (`src/views/EditorView.tsx`) is wrapped in `withSaveState`, `withBlockRegistry`, `withEditorState`, and `withProjectState`. It renders the `Toolbar`, the `ToolOptionsBar`, the layout view, the material browser, the meta block modal, and history toasts.
- `TabbedEditorView` and `QuadEditorView` pair the tool panel and palettes with `TabbedLayout` (one view at a time) or `QuadLayout` (four views at once).
- `Canvas2DView` (`src/panels/Canvas2DView.tsx`) is a canvas whose ref callback comes from `canvas2DMounter`.
- `Preview3DView` (`src/panels/Preview3DView.tsx`) hosts the Babylon3D canvas, camera buttons, the frame stats overlay, and the render settings modal.

## Component tree

```
App  (withAtlasStatus, withScreenState)
├── ComponentPreview                 when the URL hash is #/preview
├── WelcomeView  (withProjectListState)
│   ├── TexturesMissingAlert
│   └── ProjectCard ...
├── EditorView  (withSaveState, withBlockRegistry, withEditorState, withProjectState)
│   ├── Toolbar
│   │   ├── UndoRedoButtons  (withEditHistory)
│   │   └── SaveStatusIndicator
│   ├── ToolOptionsBar
│   │   ├── PaintBehaviorControl, ShapeFillModeControl, DepthPaintingControl
│   │   └── LayerControls -> DialogTrigger -> LayerDimensionControl
│   ├── TabbedEditorView or QuadEditorView
│   │   ├── ToolPanel
│   │   ├── QuickSelectPalette, ForegroundBackgroundSelector, BlockStateControls
│   │   ├── MetaBlockPlacementBanner
│   │   └── TabbedLayout or QuadLayout
│   │       ├── Canvas2DView ...
│   │       ├── Preview3DView  (withEditorState)
│   │       │   ├── FrameStatsOverlay  (withFrameStats)
│   │       │   └── RenderSettingsModal
│   │       └── BlockOrientationPreview  (withEditorState)
│   ├── MaterialBrowserModal  (withMaterialBrowserState)
│   │   ├── MaterialGrid -> MaterialGridCell -> MaterialTile
│   │   ├── QuickSelectDropBar -> QuickSelectDropSlot
│   │   └── MaterialDragOverlay
│   ├── MetaBlockPlacementModal
│   └── HistoryToast  (withHistoryToast) -> HistoryToastItem
├── NewProjectDialog  (withNewProjectFormState)
├── CreditsDialog -> CreditSection
└── FileErrorSnackbar
```

Every dialog renders through `ModalDialog`, which opens a native modal that holds focus and the keyboard.

`CreditsDialog` reads `src/config/credits.ts`. The texture entry comes from `resource-packs/squareful/pack-source.json`, so the credited version always matches the version the setup script downloads.

These components exist but no screen mounts them. Only the preview gallery shows some of them: `ActionBarExpandButton`, `BlockButton`, `DeleteModeControl`, `DraggableMaterialBlock`, `LayerDepthSelector`, `MaterialPalette`, `MaterialQuickSelect`, `PaintControls`, `ViewSelector`, `CanvasPlaceholder`.
