# Structures

## Project Overview

Structures is a browser app for designing Minecraft structures. Users paint blocks on 2D orthographic views, one layer at a time, and check the result in a live 3D view. The goal is a structure that a Minecraft mod can place as an object or from a command block.

## Purpose

The app gives builders:
- A pixel-art style editor where each cell is one block
- Six orthographic views (front, back, left, right, top, bottom) for exact placement
- Layer controls on all three axes for full 3D control
- A live 3D view to check the design
- Undo and redo that survive a reload
- A project file that moves a design between browsers

## System Architecture

### Coordinate System

The model is Z-up and right-handed. X is width, Y is depth, and Z is height. Babylon.js is Y-up, so the 3D renderer swaps Y and Z. See `src/core/rendering/README.md`.

### 2D Editor

Each 2D view is an HTML canvas that draws one slice of the model.

**Views:**
- Front and Back look along the depth axis
- Left and Right look along the width axis
- Top and Bottom look along the height axis

**Layers:**
- Each axis has an active layer. A view paints into the active layer of its own axis.
- A view draws the active layer and the two layers on each side of it.
- The canvas fits the grid to the panel until the user zooms or pans.

**Tools:**
- Point (B): paint one cell at a time
- Fill: flood-fill the connected cells of one block type on the active layer
- Rectangle (R): draw a rectangle
- Circle (O): draw an ellipse or a circle
- Arch (G): draw an arch from clicked points
- Curve (V): draw a Bezier curve from clicked points
- Meta Block (M): move the meta block to a clicked cell. T and Shift+T turn it.

**Modifier keys:** the tool options bar lists the active tool's modifiers and fills in each one while it is held.
- Rectangle: drag corner to corner. Shift makes a square. Alt draws from the center.
- Circle: drag corner to corner for an ellipse. Shift makes a true circle. Alt draws from the center.
- Point: holding Shift turns the stroke into a straight line from the press cell to the cursor, whatever path the pointer takes.
- Shift and Alt combine. A modifier pressed mid-drag reshapes the preview at once.

Shape tools draw an outline or a filled shape. Depth painting repeats a stroke through 1 to 10 layers, either through everything or until it hits a block.

**Paint behaviors:**
- Normal: paint anywhere
- Only Replace: paint only over existing blocks
- Selective Replace: replace only a chosen block type
- Erase: remove blocks instead of placing them

### 3D View

The 3D view renders the whole structure with Babylon.js.

- Left drag orbits. Right drag, middle drag, or Space and left drag pans.
- Pinch and the mouse wheel zoom toward the cursor. Trackpad scroll orbits, and Shift with scroll pans.
- Home frames the structure. Toolbar buttons fit the model and reset the camera.
- Slice planes show the active X, Y, and Z layers and can be toggled.
- Render settings cover anti-aliasing, PBR materials, lighting presets (day, night, cloudy), backgrounds, shadows, SSAO, bloom, and tone mapping. Settings persist per project.
- Blocks grow into place and shrink out when they change.
- The view captures a thumbnail for the project browser.

### Meta Block

Every project has one meta block. It marks the structure's origin and its front direction.

- The meta block is the point where the structure appears in game. Used on a block, the export item anchors the build at that block. Used in the air, it anchors at the player's feet.
- Its arrow is the way the player faces when the build appears. The build turns with the player.
- A new project places it on the ground at the center of the footprint, facing −Y (north).
- The Meta Block tool (M) moves it to a clicked cell on the active layer. T turns it right and Shift+T turns it left. Each move or turn is one undoable action.
- Its own cell exports as air, so the player is never buried.

### Materials

**Block registry:**
- `public/data/canonical-blocks.json` lists every block. Keys are Minecraft IDs such as `minecraft:acacia_door`.
- Each block has a display name, a category, a fallback color, face textures, default block state, and cube and transparency flags.
- Textures come from a texture atlas built from the Squareful resource pack. Without the atlas, blocks draw in their fallback color.
- Slabs and stairs render their real shapes. Other blocks render as cubes.

**Picking a material:**
- Each project has nine quick-select slots. Keys 1 to 9 pick a slot.
- The editor holds a foreground and a background material, like Photoshop's two colors. F swaps them.
- The material browser (E) searches by name and filters by category tabs. Drag a material onto a slot to assign it, or click it to put it in the active slot.
- Slabs and stairs show block state controls. T rotates facing and Y flips the half.

## Technology Stack

- TypeScript, React 18, and Vite 6
- MUI 7 for UI components
- dnd kit for material drag and drop
- react-window for the windowed material grid
- HTML Canvas for the 2D views
- Babylon.js 7 for the 3D view
- IndexedDB for all persistence
- Vitest with jsdom and fake-indexeddb for tests
- sharp and fflate, at build time only, to build the texture atlas

## Data Model

### Event Log

All project state lives in one IndexedDB event log (`src/core/EventLog.ts`). Each row is an event:

```typescript
interface Event {
  id?: number;        // Auto-increment, assigned by the log
  type: string;       // e.g. 'model:blockPlaced', 'metadata:renamed'
  data: unknown;      // Event-specific payload
  timestamp: number;
  projectId?: string;
  actionId?: string;  // Shared by every event one user action wrote
}
```

Event types:
- `metadata:created`, `metadata:renamed`
- `model:initialized`, `model:blockPlaced`, `model:blockRemoved`, `model:blocksPlaced`, `model:blocksRemoved`
- `model:dimensionExpanded`, `model:dimensionShrunk`
- `model:metaBlockPlaced` (position and facing). Older logs may hold `model:metaBlockConfirmed` rows, which replay ignores.
- `action:started`, `action:ended`, which bracket one user action

An undo or redo appends an `action:started` marker whose `target` names the action it acts on. Replay skips undone actions. No event stores the state an undo restores.

### Model

Projections replay the log into the model the views read (`src/types/index.ts`):

```typescript
interface Model {
  dimensions: Dimensions;  // { width, height, depth }
  metaBlock: MetaBlock;    // { position, direction }
  blocks: BlockIndex;      // Blocks indexed by position and by layer
}

interface BlockData {
  position: Vector3D;
  blockType: string;                 // Block registry ID
  blockState?: BlockStateProperties; // facing, half, type, shape, and so on
}
```

Directions use axis names such as `x+` and `y-`.

## Data Persistence

- Every edit appends to the IndexedDB event log as it happens. The toolbar shows "Saving..." while a write is in flight, "Saved" once every write has committed, and "Not saved" after a write fails.
- The project list is replayed from the log. A project exists while the log holds its `metadata:created` event.
- Thumbnails, quick-select slots, render settings, and preferences live in separate IndexedDB databases.
- The app writes nothing to localStorage.
- The browser may evict IndexedDB under storage pressure, so the app asks for persistent storage.

### Project Files

Save writes the open project to a `.mcblueprint` file. The file is JSON holding the project's events in log order, so undo history survives the round trip.

Load from File reads that file into a new project with a new ID. Action IDs get new values, so a file can load beside the project it came from. When the name is taken, the loaded project becomes "Name (from file)" or "Name (from file N)".

### Bedrock Export

Export in the editor toolbar saves a `.mcaddon` for Minecraft Bedrock 1.26.50 or newer. Opening the file imports two packs:

- A behavior pack with the build as a `.mcstructure`, an item, and a script on `@minecraft/server` 2.10.0.
- A resource pack that points the item icon at a vanilla texture. Neither pack ships a texture file.

In game, the item builds the project around the player:

- Used on a block, it anchors the meta block in the cell next to the clicked face. Used in the air, it anchors at the player's feet.
- The build turns so the player faces the meta block's arrow.
- The script places the blocks itself, in one of three sequences: rise (layer by layer, shuffled within each layer), ripple out from the meta block, or ripple in toward it. Each cell glows in its block's average color 16 ticks before the block lands, so the outline sweeps ahead of the build. "All at once" places the whole `.mcstructure` instead.
- With a use limit, the item gets a wear bar and breaks on its last use.
- Preview in the export dialog plays the animation in the 3D view with the same order and timing as the game.
- The meta block's cell becomes air. Empty cells leave the world's blocks in place.

Every export starts from the project's model. Each block's state goes app → Java → Bedrock through `public/data/bedrock-blocks.json` (from minecraft-data). Blocks with no Bedrock version are left out, and the export dialog names them. Pack UUIDs come from the project ID, so exporting again updates the installed packs.

Known limits: walls load as posts until a neighbor changes, since the editor stores no wall connections. Bedrock's rotation direction for `Rotate90` is assumed clockwise from above and needs an in-game check.

## User Workflow

1. **Create a project**
   - Enter a name
   - Pick Small (16), Medium (32), Large (64), or custom dimensions

2. **Build the structure**
   - Pick a material from the quick-select slots or the material browser
   - Pick a view and the active layers
   - Pick a tool, a shape fill, depth, and a paint behavior
   - Paint on the canvas

3. **Check in 3D**
   - Open the 3D tab, or use the quad layout
   - Orbit, pan, and zoom to inspect

4. **Keep and share**
   - Edits persist in the browser on their own
   - Save writes a project file. Load from File on the welcome screen reads one back.
   - Export saves a Bedrock add-on whose item builds the project around the player.

## Future Enhancements

- A custom placeable block as a third export trigger
- Explicit air blocks that clear existing world blocks when the build appears. Empty cells leave the world alone.
- UI to expand and shrink a project. The commands exist without controls.
- A confirmation before deleting a project
- An eyedropper that samples a placed block
- Copy and paste of regions
- Symmetry tools (mirror, rotate)
- Categories in the material browser taken from the block registry
- Doors and other multi-part blocks in block state controls
- A template library
- An animation timeline for the structure's entrance effect
- Collaborative editing
