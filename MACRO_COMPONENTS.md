# Macro Components Architecture

This document outlines the major architectural pieces of the Minecraft Magic Blueprint System, organized by layer and responsibility.

## Core Systems (Singleton Classes)

These classes manage business logic and state outside the React render cycle. They live in `src/core/`.

### EventEmitter

**File:** `src/core/EventEmitter.ts`

**Purpose:** Base class providing event subscription/emission capabilities for all singletons.

**Key Methods:**
- `on(event: string, handler: Function): void` - Subscribe to event
- `off(event: string, handler: Function): void` - Unsubscribe from event
- `emit(event: string, ...args: any[]): void` - Emit event to subscribers

**Events:** N/A (base class)

---

### ProjectManager

**File:** `src/core/ProjectManager.ts`

**Purpose:** Manages the current project state, including dimensions, blocks, and metadata.

**Key Methods:**
- `createProject(name: string, dimensions: Dimensions): void`
- `loadProject(projectId: string): void`
- `getProject(): Project | null`
- `updateProject(updates: Partial<Project>): void`
- `setBlock(position: Vector3D, blockType: string): void`
- `removeBlock(position: Vector3D): void`
- `getBlock(position: Vector3D): BlockData | null`
- `getAllBlocks(): BlockData[]`
- `setMetaBlock(position: Vector3D, direction: Direction): void`

**Events:**
- `project:created` - Emitted when a new project is created
- `project:loaded` - Emitted when a project is loaded from storage
- `project:renamed` - Emitted when project name changes
- `project:dimensions-expanded` - Emitted when dimensions are expanded
- `project:dimensions-shrunk` - Emitted when dimensions are shrunk
- `block:placed` - Emitted when a block is placed (formerly `block:added`)
- `block:removed` - Emitted when a block is removed
- `meta-block:placed` - Emitted when meta block position is set
- `meta-block:confirmed` - Emitted when meta block is confirmed

---

### BlockRegistry

**File:** `src/core/BlockRegistry.ts`

**Purpose:** Manages the catalog of available Minecraft block types and their properties.

**Key Methods:**
- `getBlock(blockId: string): Block | null`
- `getAllBlocks(): Block[]`
- `getBlocksByCategory(category: string): Block[]`
- `searchBlocks(query: string): Block[]`
- `registerBlock(block: Block): void`

**Events:**
- `block:registered` - Emitted when a block is added to the registry
- `blocks:loaded` - Emitted when initial block data is loaded

**Initial Data:**
- Loads predefined set of common Minecraft blocks on initialization
- Categorized: stone, wood, decoration, redstone, etc.

---

### EditorStateManager

**File:** `src/core/EditorStateManager.ts`

**Purpose:** Manages the state of the editor UI (current view, active layer, selected tool, etc.).

**Key Methods:**
- `setActiveView(view: ViewType): void`
- `getActiveView(): ViewType`
- `setActiveLayer(layer: number): void`
- `getActiveLayer(): number`
- `setSelectedBlock(blockId: string | null): void`
- `getSelectedBlock(): string | null`
- `setActiveTool(tool: ToolType): void`
- `getActiveTool(): ToolType`

**Events:**
- `view:changed` - Emitted when active view changes
- `layer:changed` - Emitted when active layer changes
- `block:selected` - Emitted when selected block changes
- `tool:changed` - Emitted when active tool changes

---

### ViewportManager

**File:** `src/core/ViewportManager.ts`

**Purpose:** Manages 3D camera state (position, rotation, zoom level).

**Key Methods:**
- `setCamera(position: Vector3D, target: Vector3D): void`
- `getCamera(): { position: Vector3D, target: Vector3D }`
- `rotate(deltaX: number, deltaY: number): void`
- `pan(deltaX: number, deltaY: number): void`
- `zoom(delta: number): void`
- `resetCamera(): void`

**Events:**
- `camera:moved` - Emitted when camera position/target changes
- `camera:rotated` - Emitted when camera rotation changes
- `camera:zoomed` - Emitted when camera zoom level changes
- `camera:reset` - Emitted when camera is reset to default

---

### StorageManager

**File:** `src/core/StorageManager.ts`

**Purpose:** Handles persistence of projects to localStorage (or IndexedDB in future).

**Key Methods:**
- `saveProject(project: Project): Promise<void>`
- `loadProject(projectId: string): Promise<Project | null>`
- `deleteProject(projectId: string): Promise<void>`
- `listProjects(): Promise<ProjectMetadata[]>`
- `autoSave(project: Project): void` - Debounced auto-save

**Events:**
- `save:success` - Emitted after successful save
- `save:error` - Emitted on save failure
- `load:success` - Emitted after successful load
- `load:error` - Emitted on load failure

---

## Higher-Order Components (HOCs)

HOCs bridge singletons and components by subscribing to events and passing data as props. They live in `src/hocs/`.

### withProjectState

**File:** `src/hocs/withProjectState.tsx`

**Purpose:** Provides current project data to wrapped component.

**Props Injected:**
- `project: Project | null`

**Subscribes To:** `ProjectManager` - `project:created`, `project:loaded`, `project:renamed`, `block:placed`, `block:removed`, `meta-block:placed`, `meta-block:confirmed`

---

### withEditorState

**File:** `src/hocs/withEditorState.tsx`

**Purpose:** Provides editor UI state to wrapped component.

**Props Injected:**
- `activeView: ViewType`
- `activeLayer: number`
- `selectedBlock: string | null`
- `activeTool: ToolType`

**Subscribes To:** `EditorStateManager` - `view:changed`, `layer:changed`, `block:selected`, `tool:changed`

---

### withBlockRegistry

**File:** `src/hocs/withBlockRegistry.tsx`

**Purpose:** Provides block catalog data to wrapped component.

**Props Injected:**
- `blocks: Block[]`
- `getBlock: (blockId: string) => Block | null`

**Subscribes To:** `BlockRegistry` - `block:registered`, `blocks:loaded`

---

### withViewportState

**File:** `src/hocs/withViewportState.tsx`

**Purpose:** Provides 3D camera state to wrapped component.

**Props Injected:**
- `camera: { position: Vector3D, target: Vector3D }`

**Subscribes To:** `ViewportManager` - `camera:moved`, `camera:rotated`, `camera:zoomed`, `camera:reset`

---

## Views (Top-Level Containers)

Views are complete screens or major sections of the application. They live in `src/views/`.

### EditorView

**File:** `src/views/EditorView.tsx`

**Purpose:** Main application container that orchestrates all sub-views.

**Contains:**
- Toolbar
- MaterialPalette
- Canvas2DView OR Preview3DView (based on active mode)
- LayerDepthSelector
- ViewSelector

**HOCs Used:** `withProjectState`, `withEditorState`

---

### Canvas2DView

**File:** `src/views/Canvas2DView.tsx`

**Purpose:** Renders the 2D pixel editor canvas for front/side/back views.

**Responsibilities:**
- Render grid based on project dimensions and active view
- Render placed blocks as colored pixels
- Handle mouse events (click, drag) for painting
- Highlight active layer
- Display meta block and direction indicator

**HOCs Used:** `withProjectState`, `withEditorState`, `withBlockRegistry`

**Canvas Operations:**
- Uses requestAnimationFrame for smooth rendering
- Implements dirty-checking to avoid unnecessary redraws
- Handles zoom/pan within 2D canvas

---

### Preview3DView

**File:** `src/views/Preview3DView.tsx`

**Purpose:** Renders the 3D BabylonJS preview of the structure.

**Responsibilities:**
- Initialize BabylonJS scene, camera, lights
- Render blocks as 3D meshes
- Update scene when blocks change
- Handle camera controls (orbit, pan, zoom)
- Display grid/axes for spatial reference

**HOCs Used:** `withProjectState`, `withViewportState`, `withBlockRegistry`

**BabylonJS Integration:**
- Creates scene on component mount
- Cleans up scene on unmount
- Updates meshes efficiently on project changes
- Implements instance rendering for performance

---

### SettingsView

**File:** `src/views/SettingsView.tsx`

**Purpose:** Project settings and export configuration.

**Features:**
- Edit project name and dimensions
- Configure meta block position and direction
- Export options (format, filename)
- Export preview/download

**HOCs Used:** `withProjectState`

---

## UI Components

Dumb rendering components that compose to create the UI. They live in `src/components/`.

### MaterialPalette

**File:** `src/components/MaterialPalette.tsx`

**Purpose:** Display available blocks and allow selection.

**Props:**
- `blocks: Block[]`
- `selectedBlockId: string | null`
- `onSelectBlock: (blockId: string) => void`

**Features:**
- Grid of block buttons with color swatches
- Highlight selected block
- Search/filter input (future)
- Category tabs (future)

---

### ViewSelector

**File:** `src/components/ViewSelector.tsx`

**Purpose:** Toggle between front/side/back 2D views.

**Props:**
- `activeView: ViewType`
- `onViewChange: (view: ViewType) => void`

**UI:**
- Segmented button group (Front | Side | Back)
- Highlight active view

---

### LayerDepthSelector

**File:** `src/components/LayerDepthSelector.tsx`

**Purpose:** Select which depth layer to edit in 2D view.

**Props:**
- `maxLayers: number` - Based on project depth dimension
- `activeLayer: number`
- `onLayerChange: (layer: number) => void`

**UI:**
- Slider or number input
- Previous/Next layer buttons
- Visual indicator of layer position

---

### Toolbar

**File:** `src/components/Toolbar.tsx`

**Purpose:** Main application toolbar with common actions.

**Props:**
- `projectName: string | null`
- `onNewProject: () => void`
- `onSaveProject: () => void`
- `onOpenProject: () => void`
- `onToggle3D: () => void`
- `is3DMode: boolean`

**UI:**
- Project name display
- New/Open/Save buttons
- Toggle 2D/3D button
- Settings button

---

### BlockButton

**File:** `src/components/BlockButton.tsx`

**Purpose:** Individual block button in material palette.

**Props:**
- `block: Block`
- `isSelected: boolean`
- `onClick: (blockId: string) => void`

**UI:**
- Colored square representing block
- Tooltip with block name on hover
- Selected state styling

---

### ExportDialog

**File:** `src/components/ExportDialog.tsx`

**Purpose:** Dialog for configuring and executing export.

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `project: Project`
- `onExport: (config: ExportConfig) => void`

**Features:**
- Export format selection
- Filename input
- Preview of export data
- Download button

---

### NewProjectDialog

**File:** `src/components/NewProjectDialog.tsx`

**Purpose:** Dialog for creating a new project.

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `onCreate: (name: string, dimensions: Dimensions) => void`

**Fields:**
- Project name input
- Width/Height/Depth number inputs
- Validation for dimensions
- Create button

---

## Data Flow Example

**User clicks a block in MaterialPalette:**

1. `MaterialPalette` component calls `onSelectBlock(blockId)` prop
2. Callback invokes `editorStateManager.setSelectedBlock(blockId)`
3. `EditorStateManager` updates internal state
4. `EditorStateManager` emits `block:selected` event
5. `withEditorState` HOC receives event
6. `withEditorState` updates state and re-renders wrapped component
7. Components receive new `selectedBlock` prop
8. UI updates to show new selection

**User paints a block on Canvas2DView:**

1. Canvas detects mouse click at pixel coordinates
2. `Canvas2DView` converts pixel coords to 3D position based on active view/layer
3. `Canvas2DView` calls `projectManager.setBlock(position, selectedBlockId)`
4. `ProjectManager` updates internal block map
5. `ProjectManager` emits `block:added` event
6. `withProjectState` HOC receives event
7. `withProjectState` updates state and re-renders wrapped components
8. `Canvas2DView` and `Preview3DView` receive updated project data
9. Both views re-render to show the new block

---

## Component Tree Structure

```
App
├── EditorView (HOC: withProjectState, withEditorState)
│   ├── Toolbar
│   ├── ViewSelector
│   ├── LayerDepthSelector
│   ├── MaterialPalette (HOC: withBlockRegistry, withEditorState)
│   │   └── BlockButton (multiple instances)
│   ├── Canvas2DView (HOC: withProjectState, withEditorState, withBlockRegistry)
│   └── Preview3DView (HOC: withProjectState, withViewportState, withBlockRegistry)
└── Dialogs (rendered conditionally)
    ├── NewProjectDialog
    ├── ExportDialog
    └── SettingsView (HOC: withProjectState)
```

---

## Future Component Additions

- `UndoRedoButtons` - Undo/redo toolbar buttons
- `SymmetryControls` - Mirror and rotation tools
- `AnimationTimeline` - Timeline for entrance animations
- `ProjectBrowser` - Grid view of saved projects
- `TemplateGallery` - Browse/import structure templates
- `CollaborationPanel` - Multiplayer editing (far future)
