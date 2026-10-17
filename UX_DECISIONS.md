# UX Decisions & Interaction Patterns

This document records the interaction decisions for Structures and how the app carries them out. Ideas not built yet live in [PROJECT.md](./PROJECT.md) under Future Enhancements.

---

## 1. Initial App Experience

**Decision:** The app opens on a welcome screen that doubles as the project browser.

**Details:**
- The header shows the logo, the app name, and a one-line description.
- Actions: New Project, Load from File, and Credits.
- A notice appears when the build has no texture atlas. It tells the user to run `npm run setup:textures`.
- The project grid fills the left side. A details panel on the right shows the selected project.

---

## 2. Project Creation Flow

**Decision:** A dialog asks for a name and dimensions. The editor opens at once.

**Details:**
1. The project name is required.
2. Dimensions come from presets, Small (16×16×16), Medium (32×32×32), and Large (64×64×64), or from custom width, height, and depth fields.
3. The meta block starts on the ground at the center of the footprint, facing −Y.

**Meta block concept:** a block with an arrow that points forward. All other blocks are positioned relative to it. In game it stands for an activatable block or a player who holds an item and uses it.

---

## 3. Main Editor Layout

**Decision:** The editor supports a tabbed layout and a quad layout. The toolbar's View Mode select switches between them.

**Toolbar (top):** project name, save status, undo and redo, Save, Projects, View Mode, and Credits.

**Tool options bar (below the toolbar):** shape fill mode for shape tools, depth painting, paint behavior, and layer controls.

**Tabbed layout:** one view at a time. Tabs: Front, Back, Left, Right, Top, Bottom, and 3D Preview.

**Quad layout:** a 2×2 grid with Front (top left), Left (top right), Top (bottom left), and the 3D view (bottom right). Every 2D panel accepts paint.

**Side panel (right, both layouts):** tool icons, block state controls when the material has states, the quick-select slots, and the foreground and background selector.

**The 2D views:**
1. Front and Back look along the depth (Y) axis.
2. Left and Right look along the width (X) axis.
3. Top and Bottom look along the height (Z) axis.

---

## 4. Layer Control

**Decision:** A compact layer readout in the tool options bar, a popover with full controls, and global keys.

**Details:**
- The readout always shows the active X, Y, and Z layers.
- The settings button opens a popover. Each axis has decrement and increment buttons, a number field, and a slider.
- The step buttons show their keys in tooltips.

**Keys (global, no panel focus needed):**
- `A` / `D`: X layer down / up
- `X` / `C`: Y layer down / up
- `S` / `W`: Z layer down / up

---

## 5. 2D Canvas Interaction

**Decision:** Tools, shape fill, depth, and paint behavior combine. Each is picked on its own.

**Tools (side panel, with keys):**
- Point (B): paint single cells
- Fill: flood-fill connected cells of one block type on the active layer
- Rectangle (R)
- Circle (O)
- Arch (G): placed by clicking points
- Curve (V): a Bezier curve placed by clicking points
- Meta Block (M): move the meta block to a clicked cell. T and Shift+T turn it.

**Decision:** modifiers follow design-tool convention. Shift keeps sides equal and Alt draws from the center. Ctrl and Cmd stay free for shortcuts, and Ctrl-click is a right-click on macOS.

**Modifier keys:** the tool options bar lists the active tool's modifiers and fills in each one while it is held.
- Rectangle: drag corner to corner. Shift makes a square. Alt draws from the center.
- Circle: drag corner to corner for an ellipse. Shift makes a true circle. Alt draws from the center.
- Point: holding Shift turns the stroke into a straight line from the press cell to the cursor, whatever path the pointer takes.
- Shift and Alt combine. A modifier pressed mid-drag reshapes the preview at once.

**Shape fill:** shape tools draw an outline or a filled shape.

**Depth painting:** a stroke repeats through 1 to 10 layers. "Through" paints every layer. "Until Hit" stops at the first block.

**Paint behaviors:**
- Normal: paint anywhere
- Only Replace: paint only over existing blocks
- Selective Replace: replace only a chosen block type
- Erase: remove blocks. The preview turns red. Erase with an outline shape and depth cuts a tunnel. Erase with a filled shape and depth hollows out a volume.

**Small cells:** below 12px a cell fills edge to edge with its face's average texture color, and a faint dark line marks every cell edge over the blocks (down to 3px cells). Textures and the 1px gap between cells return at 12px and up.

**Zoom and pan:**
- The grid fits the panel until the user zooms or pans.
- The mouse wheel zooms.
- Space and drag, or middle drag, pans.

**Visual feedback:**
- A hover preview shows the cells a stroke will touch.
- The view draws the active layer and the two layers on each side.
- Layer indicators mark the other axes' active layers.

---

## 6. Material Selection

**Decision:** Nine quick-select slots in the side panel, a foreground and background pair, and a modal material browser.

**Quick-select slots:**
- Each project has nine slots. The user fills them by hand.
- A click or keys 1 to 9 put a slot's block in the active material.
- A right click assigns the selected block to a slot.
- A tenth button opens the material browser.

**Foreground and background:**
- Two overlapping squares, like Photoshop's two colors or Minecraft's two hands.
- Click a square to make it active. F swaps them.

**Material browser (E):**
- A modal with a search field and category tabs: All, Building, Natural, Decoration.
- Search matches block names. The grid is windowed, so the full block list stays responsive.
- Drag a material onto a quick-select slot to assign it. Click a material to put it in the active slot.
- E closes the browser too.

**Block state:**
- Slabs show bottom, top, and double. Y flips the half.
- Stairs show facing and half. T rotates the facing.
- Fences, walls, torches, and doors take their shape from their neighbours, so they need no controls beyond facing.
- Doors show a Flip hinge toggle. H flips it. The hinge comes from the neighbours, and the toggle swaps it, so a double door needs no setting.

---

## 7. Meta Block Handling

**Decision:** The meta block is a tool, not a setup step. It always exists and stays editable.

**Flow:**
1. The Meta Block tool (M, anchor icon) is in the side panel.
2. A click on a 2D view moves the meta block to that cell on the active layer.
3. T turns it right and Shift+T turns it left. The tool options bar shows its facing and two turn buttons.
4. Each move or turn is one undoable action, labeled "Meta block".

**Visual representation:** the 2D views draw it as a green-bordered cell with an arrow for its facing. A view that looks along the facing draws a dot instead. The 3D view does not draw it yet.

**Placement restrictions:** the app does not check for player standing space.

---

## 8. Project Management

**Decision:** Edits persist in the browser on their own. Files carry a project between browsers.

**Persistence:**
- Every edit writes to IndexedDB as it happens. No save dialog appears.
- The toolbar shows "Saving..." while a write is in flight, "Saved" once every write has committed, and "Not saved" after a write fails.

**Project files:**
- Save in the toolbar writes a `.mcblueprint` JSON file. Chromium browsers show a save picker. Other browsers download the file.
- Load from File on the welcome screen opens a file as a new project, with its undo history.
- A loaded project whose name is taken becomes "Name (from file)" or "Name (from file N)".
- A file that fails to load or save shows an error toast.

**Project browser:**
- A grid of cards with name and thumbnail
- A selected project shows its name and created date, with Open, Rename, and Delete buttons

**Rename:** the name turns into a text field. Enter or Save keeps the new name, and Escape or Cancel leaves it. An empty name or a name another project holds shows an error under the field.
- The 3D view captures thumbnails shortly after the structure settles

**Delete:** removes the project at once, with no confirmation.

**Undo and redo:**
- Ctrl+Z or ⌘Z undoes. Ctrl+Shift+Z or ⇧⌘Z redoes.
- Toolbar buttons do the same.
- A toast names each undone or redone step.
- History survives a reload, because it is folded from the event log.

---

## 10. Export to Minecraft

**Decision:** Export is one dialog with an edition choice (Bedrock or Java) above add-on name, item name, icon, build animation, seconds, and uses. Both editions share every field except Camera, which is Bedrock only. A field that does not apply to the current choices is hidden: Camera for Java, and Seconds and Camera for "All at once". Defaults: the project name, "<add-on name> Wand", Blaze Rod, rise, 6 seconds, unlimited uses. The add-on name names the pack, the file, and the item ID, and the dialog shows the `/give` command as it changes. Exporting again under the same name updates that add-on, and a new name installs a separate one.

**Details:**
- The icon list holds vanilla item textures only, so the add-on ships no game texture.
- Animations: rise (bottom up, shuffled within each layer, layers overlapping), ripple out from the meta block, ripple in toward it, or all at once. A glow in each block's own color sweeps through the build just ahead of the blocks.
- Uses above 0 give the item a wear bar. The use that breaks it still builds.
- Camera: none, Orbit (circles the build once, starting and ending straight behind the player. It keeps circling the finished build for 1.5 seconds after the last block lands, then closes in on the player's eyes over 2 seconds. With Rise it starts low at the base and tilts up late as the layers climb), or Look around (stays at the player's eyes, turns once, and tilts up as the build rises). The camera is heavy: it follows each move on a spring, so it is slow to start, slow to stop, and never stops partway through. It drifts about 2.5% past a mark and settles back. Both moves carry a handheld shake modeled on After Effects' wiggle expression, which fades out in first person. Camera and movement input lock for the shot. "All at once" has no camera move.
- Add-on identifiers use the namespace `<name>_<project code>`, so `/give @s castle_k3f9:wand`. The same project and name always give the same namespace and pack UUIDs, so a re-export installs as a new version. A different name, or the same name from another project, installs as a separate add-on.
- Preview steps the dialog aside and plays the chosen animation in the 3D view, switching to the 3D tab in the tabbed layout, then brings the dialog back. Order and timing come from the same module the add-on script embeds, so the preview matches the game's sequence. The glow is an approximation, and sounds do not play.
- One item handles both triggers: use on a block (the anchor goes next to the clicked face) and use in the air (the anchor goes at the player's feet).
- After a save, the dialog shows the file name and the `/give` command. Blocks left out of the export show in a warning with their counts.
- Java saves a data pack `.zip` for one Java release (26.3). The wand is the chosen vanilla item with a glint, given by `/function <namespace>:give`. A right-click starts one build. Holding the button does not start more. The build anchors at the player's feet, since a Java item use reports no clicked block. Uses above 0 give the wand Java's own durability bar, and the use that breaks it still builds. The camera stays with the player.
- Java exports can add a crafting recipe for the wand: none (the default), or the icon item plus a Gold Ingot, a Diamond, or a Nether Star. The recipe shows in the recipe book once the player holds the cost item. `/function <namespace>:give` works either way, since Java data packs cannot add items to the creative inventory.
- After a Java save, the dialog gives both install routes: drag the file into a new world's Data Packs screen, or put it in a saved world's `datapacks` folder and run `/reload`.

---

## 9. Keyboard Focus

**Decision:** Global keys never act while the user types or while a dialog is open.

**Details:**
- Keys are ignored in text fields.
- An open modal owns the keyboard. E still closes the material browser.
- Ctrl or Cmd with any key other than Z passes through to the browser.
