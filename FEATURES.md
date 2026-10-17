# Features

Structures is a browser editor for Minecraft builds. You paint blocks in 2D views of a 3D volume. A live 3D preview shows the result. The finished build exports as a Bedrock add-on or a Java data pack, and both give you a wand that builds the structure in game.

This file describes what the app does today. "Known gaps" at the end lists features that exist only in part.

## Contents

- [Projects](#projects)
- [Editor layout](#editor-layout)
- [2D views](#2d-views)
- [Layers](#layers)
- [Paint tools](#paint-tools)
- [Paint behaviors and erase](#paint-behaviors-and-erase)
- [Depth painting](#depth-painting)
- [Materials](#materials)
- [Block state and shapes](#block-state-and-shapes)
- [Meta block](#meta-block)
- [3D preview](#3d-preview)
- [Slice guides and layer highlight](#slice-guides-and-layer-highlight)
- [Render settings](#render-settings)
- [Undo and redo](#undo-and-redo)
- [Export](#export)
- [Theme](#theme)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Other screens](#other-screens)
- [Known gaps](#known-gaps)

## Projects

The welcome screen lists every project as a card with a 3D thumbnail. Cards sort by creation date, oldest first. Click a card to see its details panel, which holds Open, Rename, and Delete.

**New Project** asks for a name and a size:

| Preset | Size |
|---|---|
| Small (default) | 16 × 16 × 16 |
| Medium | 32 × 32 × 32 |
| Large | 64 × 64 × 64 |
| Custom | Width, Height, and Depth from 1 to 256 each |

Create stays disabled until the project has a name.

- **Rename** edits the name in place. Enter saves and Escape cancels. A blank name or a name another project already uses is refused.
- **Delete** removes the project at once, with no confirmation. Its thumbnail, quick-select slots, and render settings go with it.
- **Autosave**: every edit writes to the browser's IndexedDB as it happens. The toolbar shows "Saving...", "Saved", or "Not saved". The app asks the browser for persistent storage, so the browser is less likely to evict it.
- **Last opened**: the app reopens the last project you opened when it starts.
- **Thumbnails**: the app captures a 320 × 200 image of the 3D view one second after the scene changes.

### Project files

- **Save** in the toolbar writes `<name>.mcblueprint`, a JSON file that holds the project's full edit history. Chromium browsers show a save dialog. Other browsers download the file.
- **Load from File** on the welcome screen imports a `.mcblueprint` file as a new project. A name that is already taken becomes "Name (from file)". A damaged file, a file that isn't a project, or a file from a newer version shows an error message for 8 seconds.

## Editor layout

The **View Mode** menu in the toolbar switches between two layouts:

- **Quad Layout** (the default) shows Front, Left, and Top 2D views and the 3D preview in a 2 × 2 grid.
- **Tabbed** shows one view at a time. Its tabs are Front, Back, Left, Right, Top, Bottom, and 3D Preview.

The layout choice resets when the page reloads.

The editor has three bars:
- **Toolbar** (top): project name, save status, undo and redo, Save, Export, Projects, View Mode, the theme toggle, and Credits.
- **Tool options bar** (below the toolbar): options for the active tool, the modifier key hints, and the active layer readout.
- **Side panel** (right): paint tools, block orientation controls, the quick-select palette, and the foreground and background materials.

## 2D views

Each 2D view is a grid slice through the volume. You can paint in any 2D view.

| View | Looks along | Grid axes |
|---|---|---|
| Front, Back | Y | X across, Z up |
| Left, Right | X | Y across, Z up |
| Top, Bottom | Z | X and Y |

Z is the vertical axis.

- **Zoom**: the mouse wheel or a trackpad pinch zooms toward the cursor, from 0.25× to 4×. A new view fits the grid to the panel until you zoom or pan.
- **Pan**: hold Space and drag, or drag with the middle mouse button.
- **Small cells**: below 12 pixels per cell, each cell fills with its block's average color instead of the texture. A thin dark line marks each cell edge down to 3 pixels.
- **Overlays**: each view draws an axis gizmo in the corner and colored lines at the other two axes' active layers. A badge in the corner shows the view's own layer, such as "Y: 4".
- **Orientation indicator**: when the selected block is a stair or slab, a small 2 × 2 grid in the corner shows the shape that view will draw.

## Layers

The editor keeps one active layer per axis, X, Y, and Z. Each view paints on the layer of the axis it looks along. Front and Back paint on the Y layer, Left and Right on the X layer, and Top and Bottom on the Z layer.

- **Readout**: the tool options bar always shows "X: n Y: n Z: n".
- **Layer popover**: the gear button next to the readout opens a popover with a stepper, a number field, and a slider per axis. The step buttons stop at the first and last layer.
- **Keys**: A and D move the X layer, X and C move the Y layer, and S and W move the Z layer. The keys wrap from the last layer to the first.
- **Neighbouring layers**: each 2D view shows the two layers on each side of the active one, faded. Blocks one layer away draw at 30% opacity and blocks two layers away at 10%. Layers farther away are hidden. Paint previews always draw at full opacity.

## Paint tools

The tool buttons sit at the top of the side panel. The left mouse button paints. Escape cancels a drag or a shape in progress. Every stroke or shape is one undo step.

| Tool | Key | How it works |
|---|---|---|
| Point | B | Paints every cell the drag crosses. Hold Shift for a straight line from the press point. |
| Fill | none | Click a cell to flood-fill the connected area of the same block on the active layer. A drag does nothing. |
| Rectangle | R | Drag from corner to corner. Shift makes a square. Alt draws from the center. |
| Circle | O | Drag a box to draw the ellipse inside it. Shift makes a true circle. Alt draws from the center. |
| Arch | G | Click Base Start, Base End, then Apex. The arch is the arc of the circle through all three points. |
| Curve | V | Click Start, End, Control Point 1, then Control Point 2 for a cubic Bezier curve. Until you place the second control point, the preview mirrors the first one. |
| Meta Block | M | Moves the meta block. See [Meta block](#meta-block). |

**Fill mode**: Rectangle, Circle, Arch, and Curve show an Outline / Filled toggle in the tool options bar. Outline is the default. A filled arch draws a solid sector.

**Modifier hints**: the tool options bar shows a chip for each modifier key the active tool uses, such as "Shift: Straight line". The chip fills in while you hold the key. Pressing or releasing a modifier mid-drag reshapes the preview at once.

**Guides**: the Arch and Curve tools draw labelled handles and guide lines, but only in the view you click.

## Paint behaviors and erase

The Behavior toggle in the tool options bar sets how a stroke treats existing blocks. It applies to every tool except Meta Block.

| Behavior | Effect |
|---|---|
| Normal (default) | Paints anywhere |
| Only Replace | Paints only over cells that already hold a block |
| Selective Replace | Paints like Normal. See [Known gaps](#known-gaps). |
| Erase | Removes blocks instead of placing them |

**Erase** works with every paint tool. It removes only cells that hold a block. The 2D preview tints the cells it will remove red, and the 3D preview shows them as red ghost blocks. A material must be selected for any tool to run, Erase included.

## Depth painting

Depth repeats each stroke through several layers, moving away from the viewer. Front, Left, and Bottom paint deeper in the positive direction. Back, Right, and Top paint deeper in the negative direction.

- **Depth** checkbox: on by default.
- **Thickness** slider: 1 to 10 layers, shown as "3L". The default is 1.
- **Mode** chip: **Through** paints every layer in range. **Until Hit** stops each column at the first layer that already holds a block.

The repeat stops at the edge of the volume. The depth controls hide while the Meta Block tool is active.

## Materials

The block catalog lists about 750 Minecraft blocks you can pick. Blocks draw with textures from the Squareful pack.

### Quick-select palette

The side panel holds 9 quick-select slots per project. A new project starts with cobblestone, oak planks, grass block, birch planks, acacia planks, spruce planks, coarse dirt, oak leaves, and birch leaves.

- Click a slot, or press 1 to 9, to use that slot's block.
- Right-click a slot to store the selected block in it.

### Foreground and background

Two overlapping squares below the palette hold a foreground and a background material. Click one to make it the active material. The swap button, or F, switches which square is active.

### Material browser

Press E, or click the grid button after the slots, to open the material browser. Press E again to close it.

- **Search**: matches any part of the block name, ignoring case.
- **Tabs**: All, Building (names with "stone" or "brick"), Natural ("grass", "dirt", or "wood"), and Decoration ("wool" or "glass").
- **Click a tile** to put that block in the active slot. The browser stays open.
- **Drag a tile** onto a slot in the bar at the bottom of the browser to assign it there.

Search and tab reset each time the browser opens.

## Block state and shapes

Blocks have one of eight shapes: stair, slab, fence, wall, torch, door, campfire, or full cube. The 2D views clip each shape to the part of the cell it fills, and the 3D view builds it from Minecraft's model proportions.

When the selected block has an orientation, the side panel shows **Orientation** controls:

| Block | Controls | Key |
|---|---|---|
| Slab | Bottom, Top, Double | Y flips bottom and top |
| Stair | Bottom, Top half | Y flips the half |
| Stairs, torches, doors, campfires, and other facing blocks | Facing -Y, +X, +Y, -X | T rotates the facing |
| Door | Flip hinge | H flips the hinge |

Picking a new block resets its orientation to the default.

The app shapes these blocks from their neighbours on every change, so placing or removing a neighbour reshapes them. Previews show the shape a block will have once placed.

- **Stair corners**: a stair with another stair at a right angle in front of it becomes an inner corner. A stair with one at a right angle behind it becomes an outer corner. Only stairs with the same half join.
- **Fences** join fences of the same family (wooden fences together, nether brick fences together), fence gates along the gate's width, and full blocks.
- **Walls** join walls, fence gates, and full blocks. A wall side rises to full height under a full block. A wall shows its post at ends, corners, and junctions, and on a straight run only when a torch or lantern sits on it.
- **Torches** stand on a full block, fence, or wall below. Otherwise a torch hangs on a full block beside it, tilted away from the wall. The facing picks the wall when several are free. A torch with nothing to hold it stands on the floor.
- **Doors** are two blocks tall. Painting a door places both halves, and erasing or replacing either half removes both. A door is skipped where the cell above it is outside the build or holds a block. The hinge follows Minecraft's rule: a door of the same type beside it makes a double door, and otherwise the side with more full blocks holds the hinge. Flip hinge swaps that choice on doors painted while it is on. A closed door sits on the cell edge opposite its facing.
- **Campfires** use Minecraft's campfire model: four crossed logs on an ember bed, with crossed fire when lit. The soul campfire has blue embers and fire. New campfires are lit.

## Meta block

The meta block marks where the build appears in game and which way the player faces. A new project places it at the center of the floor, facing -Y.

- **Move it**: choose the Meta Block tool (M) and click a cell in any 2D view. It moves to that cell on the active layer and keeps its facing.
- **Turn it**: with the Meta Block tool active, T turns it right and Shift+T turns it left. The tool options bar also has Turn left and Turn right buttons and shows the current facing.
- **In the 2D views** it draws as a bordered cell with an arrow for its facing. It shows a dot when it faces along the view's own axis. It fades on neighbouring layers like blocks do.
- **In the 3D view** it does not draw.

Moving or turning the meta block is one undo step, labelled "Meta block".

**On export** a wand build leaves the meta block's cell empty, so the player is never buried. A bow or snowball build fills it. Every block's position is measured from it. In Bedrock, using the wand on a block anchors the build next to the face you clicked. Using it in the air anchors the build at your feet. The build turns so you face the way the arrow points.

## 3D preview

The 3D preview renders the build with textures, lighting, shadows, and a sky. Blocks grow in and shrink out as you paint.

On the Night and Cloudy presets, light-emitting blocks such as torches, lit campfires, lanterns, and froglights light the blocks around them. Each light fades out at the block's Minecraft light level, for example 14 blocks for a torch and 7 for a redstone torch. Overlapping lights add together, where Minecraft takes the brightest. An unlit campfire gives no light. Animated textures show their first frame.

**Mouse and trackpad**

| Input | Action |
|---|---|
| Left drag | Orbit |
| Right drag, middle drag, or Space + left drag | Pan |
| Mouse wheel or pinch | Zoom toward the cursor |
| Two-finger trackpad scroll | Orbit |
| Shift + scroll | Pan |
| Home (pointer over the 3D view) | Frame the build |

**Camera bar** (bottom left)
- Front, Back, Left, Right, Top, and Bottom presets animate the camera to that angle.
- Zoom In and Zoom Out.
- Fit Model to View frames the placed blocks, or the whole volume when the project is empty.
- Reset Camera returns to the default angle.

## Slice guides and layer highlight

The app has no x-ray or cutaway mode. These features show where the active layers sit in the 3D view:

- **Slice guides**: the X, Y, and Z buttons at the top right of the 3D view toggle a translucent plane at each axis's active layer. The planes follow layer changes. All three start off and reset when the page reloads.
- **Layer highlight**: the render setting "Highlight Active Layer" tints blocks on the active layers, red for X, blue for Y, and green for Z. A block on two active layers gets both tints.
- **Neighbouring layers** in the 2D views. See [Layers](#layers).

## Render settings

The slider icon at the top right of the 3D view opens Render Settings. Changes apply at once and save with the project. **Reset to Defaults** restores the values below.

| Section | Setting | Default | Range |
|---|---|---|---|
| Anti-Aliasing | FXAA | off | on, off |
| | MSAA Samples | 4 | 1, 2, 4, 8 |
| Lighting & Environment | Lighting Preset | Day | Day, Night, Cloudy |
| | Background | Sky + Ground | Flat Color, Sky, Sky + Ground |
| | PBR Materials | on | on, off |
| | Environment Intensity | 0.5 | 0 to 2 |
| Shadows | Enable Shadows | on | on, off |
| | Shadow Quality | 1024 | 512, 1024, 2048 |
| | Shadow Darkness | 0.5 | 0 to 1 |
| Ambient Occlusion | Enable SSAO | on | on, off |
| | Radius | 2 | 0.5 to 4 |
| | Intensity | 1 | 0.5 to 2 |
| | Samples | 16 | 8, 16, 32 |
| Post Processing | Enable Bloom | on | on, off |
| | Bloom Intensity | 0.25 | 0 to 1 |
| | Bloom Threshold | 0.3 | 0.1 to 1.5 |
| | Tone Mapping | on | on, off |
| | Contrast | 1.1 | 0.5 to 2 |
| | Exposure | 1 | 0.5 to 2 |
| Layer Highlight | Highlight Active Layer | off | on, off |
| Diagnostics | Show Frame Stats | off | on, off |

Environment Intensity needs PBR Materials. Contrast and Exposure need Tone Mapping.

- **Night** raises the glow of emissive blocks so they stand out against the dark sky.
- **Frame stats** shows frame rate and frame timings in the top left of the 3D view.

## Undo and redo

- **Keys**: Ctrl+Z (⌘Z on Mac) undoes. Ctrl+Shift+Z (⇧⌘Z) redoes. The toolbar has Undo and Redo buttons too.
- **Scope**: every stroke, shape, fill, and meta block move is one step.
- **Persistence**: history lives in the project's edit log, so undo still works after a reload.
- **Toasts**: each undo or redo shows a toast such as "Undid Point (12 blocks)" for 2.5 seconds.

Render settings, quick-select slots, and the theme are not part of undo history.

## Export

**Export** in the toolbar opens "Export to Minecraft". Choose Bedrock or Java at the top.

| Option | Bedrock | Java | Default |
|---|---|---|---|
| Add-on or data pack name | yes | yes | the project name |
| Starts the build: use a wand, shoot a bow, or throw snowballs | yes | yes | wand |
| Item name | yes | yes | "<name> Wand", "<name> Bow", or "<name> Snowball" |
| Item icon (wand only): Blaze Rod, Breeze Rod, Stick, Trial Key, Amethyst Shard, Nether Star | yes | yes | Blaze Rod |
| Build animation: Rise layer by layer, Ripple out from the anchor, Ripple in toward the anchor, Pop into place, All at once | yes | yes | Rise |
| Animation seconds, 1 to 60 | yes | yes | 6 |
| Camera: Player keeps control, Orbit the build, Look around from the player | yes | no | Player keeps control |
| Crafting recipe: none, or the item plus a Gold Ingot, Diamond, or Nether Star | no | yes | none |
| Uses before it breaks, 0 to 1000, 0 for unlimited. For snowballs, the stack size, 0 to 16, 0 for 16 | yes | yes | 0 |

A wand builds around the player who uses it. A bow builds where each arrow it fires lands, and a snowball builds where it lands. Any vanilla arrow works in the bow. A block hit puts the meta block in the open cell in front of the struck face. A mob hit puts it at the mob's feet. The build turns so the shooter faces the meta block's arrow, so a bridge with its meta block at the far end, arrow pointing along the bridge, reaches back toward the shooter. The bow wears one use per shot, in creative mode too. Each snowball builds once.

"Pop into place" glows every cell at once, then lands every block together 0.8 seconds later. Animation seconds and Camera hide for "Pop into place" and "All at once". The dialog remembers your choices until the page reloads.

- **Preview** closes the dialog, plays the build animation in the 3D view, then reopens the dialog. It is disabled for "All at once".
- **Export** saves the file and shows the in-game command. A warning lists any blocks the export skipped, with counts.

| | Bedrock | Java |
|---|---|---|
| File | `<name>.mcaddon` | `<name>.zip` |
| Command | `/give @s <namespace>:wand` | `/function <namespace>:give` |
| Minimum version | 1.26.50 | 26.3 |

In game, a glow marks each cell just before its block lands. The Bedrock export plays sounds and can move the camera.

## Theme

The toggle in the toolbar and on the welcome screen offers Light, Dark, and System. System is the default and follows your operating system's setting as it changes. The choice applies to the whole UI and the 2D views, and the browser remembers it. The 3D view uses the lighting preset, not the theme.

## Keyboard shortcuts

Shortcuts do nothing while you type in a field. While a dialog is open only E works, to close the material browser.

| Key | Action |
|---|---|
| B, R, O, G, V, M | Point, Rectangle, Circle, Arch, Curve, Meta Block |
| 1 to 9 | Use a quick-select slot |
| E | Open or close the material browser |
| F | Switch the active material square |
| T | Rotate the facing. With the Meta Block tool, turn the meta block right. |
| Shift+T | Turn the meta block left (Meta Block tool) |
| Y | Flip the half (slabs, stairs) |
| H | Flip the hinge (doors) |
| A, D | X layer down, up |
| X, C | Y layer down, up |
| S, W | Z layer down, up |
| Ctrl/⌘+Z | Undo |
| Ctrl/⌘+Shift+Z | Redo |
| Home | Frame the build (pointer over the 3D view) |
| Space (held) | Pan, in 2D and 3D |
| Shift, Alt | Drawing modifiers |
| Escape | Cancel the stroke or shape in progress |

## Other screens

- **Credits** lists the app, the Squareful texture pack, the fonts, and the libraries, with their licenses. It opens from the welcome screen or the info button in the toolbar.
- **Textures missing**: when the texture atlas isn't installed, the welcome screen says so and names the setup command. Blocks then draw in flat colors.
- **Component gallery**: `#/preview` at the end of the URL shows a gallery of the app's components, for development.

## Known gaps

- **Selective Replace** has no way to choose its target block, so it paints like Normal.
- **F** switches which material square is active. It does not exchange the two blocks.
- **Curve** shows the Outline / Filled toggle but always draws an outline.
- **Erase with "Until Hit" depth** stops each column at its first block before erasing, so it may remove nothing.
- **Fill with Erase** does nothing when the clicked block matches the selected material.
- **Resizing a project**: the code can expand and shrink a project one side at a time, but the UI has no control for it.
- **Fence gates, trapdoors, and lanterns** draw as full cubes. Fences and walls still join fence gates.
- **Open doors** draw open when a loaded project stores them open, but the UI has no control to open a door.
- **Fill and resize with doors**: Fill compares block types one cell at a time, and shrinking a project can cut a door in half.
