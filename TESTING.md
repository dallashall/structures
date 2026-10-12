# Testing Plan - Structures

This file holds the automated test commands and a manual checklist for the app.
Run the automated suite first. Walk the manual checklist before a release or after a change to the area it covers.

---

## Automated Suite

- [ ] `npx vitest run` passes
- [ ] `npm run type-check` passes
- [ ] `npm run build` succeeds

Tests use Vitest with jsdom and `fake-indexeddb`. Setup lives in `src/test/setup.ts`. Test files sit in `__tests__` folders next to the code they cover:

- `src/commands/__tests__` (project file save and load round trip)
- `src/core/__tests__` (EventLog, EditHistory, DraftingService, HistoryAnnouncer, Storage, StairShapeResolver)
- `src/core/canvas2d/__tests__` (ViewState)
- `src/core/rendering/__tests__` (CameraRig, GrowAnimator)
- `src/projections/__tests__` (block, model, and metadata projections)
- `src/reducers/__tests__` (history reducer)
- `src/utils/__tests__` (project file codec, wheel zoom, throttle, keyboard focus, material categories, frame stats)


`npm run check:addon` builds a sample Bedrock add-on with the export code and validates it with Mojang's `@minecraft/creator-tools` plus a manifest version range check. Run it after any change under `src/utils/bedrock*` or `src/utils/mcstructure.ts`.
---

## Setup and Textures

- [ ] **Fresh clone with network**
  - [ ] `npm install` then `npm run dev`
  - [ ] The texture setup downloads the Squareful pack, checks its SHA-512, and builds `public/atlas.png` and `public/atlas.json`
  - [ ] A second `npm run dev` skips the download because the atlas exists

- [ ] **Forced rebuild**
  - [ ] `npm run setup:textures` downloads again (or reuses `.cache/packs/squareful.zip` when its hash matches) and rebuilds the atlas

- [ ] **No network**
  - [ ] Delete `public/atlas.png` and `public/atlas.json`, then run `npm run dev` offline
  - [ ] Setup prints a warning and the dev server still starts
  - [ ] `TEXTURES_REQUIRED=1 npm run build` fails instead

- [ ] **Missing-textures notice**
  - [ ] With no atlas, the welcome screen shows "Textures are not installed" with the `npm run setup:textures` command
  - [ ] Blocks draw in flat colors in the swatches, the 2D views, and the 3D view
  - [ ] The editor still opens and painting works
  - [ ] After setup and a reload, the notice is gone and blocks show textures

- [ ] **Docker image**
  - [ ] `docker build` from a clean checkout succeeds
  - [ ] The running container serves the app on port 80
  - [ ] `/assets/` files carry a one-year immutable cache header
  - [ ] `index.html`, `atlas.json`, and `data/canonical-blocks.json` carry `no-cache`

---

## Projects

- [ ] **Welcome screen**
  - [ ] With no projects, the grid shows "No projects yet"
  - [ ] Each project card shows a thumbnail, name, and details
  - [ ] Clicking a card selects it and fills the side panel with name, created date, Open, Rename, and Delete
  - [ ] Rename turns the name into a selected text field. Enter saves and the card shows the new name.
  - [ ] Escape or Cancel leaves the name unchanged
  - [ ] An empty name or another project's name shows an error under the field and saves nothing
  - [ ] Selecting another card closes the rename field
  - [ ] Open shows the project in the editor
  - [ ] Delete removes the project with no confirmation step. Its thumbnail, quick-select slots, and render settings go with it. A new project never inherits them.

- [ ] **New project**
  - [ ] New Project opens the dialog
  - [ ] Presets: Small (16 × 16 × 16), Medium (32 × 32 × 32), Large (64 × 64 × 64), Custom
  - [ ] Custom shows Width, Height, and Depth fields limited to 1 to 256
  - [ ] Create stays disabled until the form is valid
  - [ ] Cancel closes the dialog and creates nothing
  - [ ] Create opens the editor with no dialog. The meta block sits on the ground at the center, facing −Y.

- [ ] **Persistence**
  - [ ] Place blocks, reload the page, and the same project reopens with its blocks
  - [ ] Undo and redo history survives the reload
  - [ ] Data lives in IndexedDB. Nothing is written to localStorage.

- [ ] **Thumbnails**
  - [ ] With the 3D view showing, a card's thumbnail updates about a second after edits stop
  - [ ] Projects back button returns to the welcome screen with the new thumbnail

- [ ] **Save indicator**
  - [ ] The toolbar shows the save status next to the project name
  - [ ] It reads "Saved" after an edit, a quick-select change, or a render settings change
  - [ ] It reads "Not saved" when browser storage refuses a write (for example, storage full), and "Saved" again after the next successful edit

---

## Project Files

- [ ] **Save to file**
  - [ ] The editor toolbar Save button opens a save picker in Chromium browsers, named `<project name>.mcblueprint`
  - [ ] Other browsers download the file to the download folder
  - [ ] Characters that Windows or macOS refuse are stripped from the file name
  - [ ] Cancelling the picker does nothing and shows no error
  - [ ] The file is readable JSON with `format: "mc-blueprint"`, `version`, `name`, `savedAt`, and `events`

- [ ] **Load from file**
  - [ ] Load from File on the welcome screen opens a file picker filtered to `.mcblueprint`
  - [ ] Cancelling the picker does nothing
  - [ ] A loaded file opens in the editor with the same blocks, dimensions, and meta block
  - [ ] Undo and redo history from the file works after the load

- [ ] **Name collisions**
  - [ ] Load a file whose project name no other project uses. The name stays the same.
  - [ ] Load a file whose name is taken. The project gets "(from file)" added.
  - [ ] Load the same file again. The project gets "(from file 2)".
  - [ ] Edits in the loaded copy do not change the original project, and the reverse

- [ ] **File errors**
  - [ ] A file that is not JSON shows "The file is not valid JSON."
  - [ ] JSON from another app shows "The file is not a Structures project file."
  - [ ] A file with a higher `version` shows "The file comes from a newer version of Structures."
  - [ ] A file with a broken event row shows "The file has a damaged event list."
  - [ ] A file whose first event is not `metadata:created` shows "The file has no project creation event."
  - [ ] The error shows in a snackbar at the bottom of the screen and hides after 8 seconds

---

## Credits

- [ ] The Credits button on the welcome screen opens the Credits dialog
- [ ] The info icon in the editor toolbar opens the same dialog
- [ ] The dialog's first entry is Structures by Dallas Hall under MIT, linking to github.com/dallashall/structures
- [ ] The dialog lists Squareful by XeKr under CC BY-NC-ND 4.0 with links to the license and the Modrinth page
- [ ] The dialog notes the textures are copied unchanged into one atlas image
- [ ] The dialog lists Chakra Petch, Lexend, and Red Hat Mono under SIL OFL 1.1
- [ ] The dialog lists Babylon.js, React, Material UI, dnd kit, and react-window with their licenses
- [ ] The dialog shows the notice that the app is not affiliated with Mojang
- [ ] Escape and the close button both close the dialog. Focus returns to the button that opened it.

---

## Bedrock Export

- [ ] Export in the editor toolbar opens "Export for Bedrock" with add-on name, item name, icon, build animation, seconds, and uses
- [ ] The add-on name defaults to the project name, and the helper text shows the matching `/give` command as it changes
- [ ] Two exports with different add-on names install side by side in game, each with its own item
- [ ] Using the item on a block builds once, anchored next to the clicked face, never a second copy at the player's feet
- [ ] The item name placeholder reads "<project> Wand". Seconds disable for "All at once".
- [ ] Export saves `<project_slug>.mcaddon` through the save picker or a download
- [ ] The dialog then shows the file name and the `/give @s structures:<slug>_wand` command
- [ ] A project holding a block with no Bedrock version lists it in a warning, with its count
- [ ] Unzipped, the file holds `<slug>_BP` (manifest, items, scripts/main.js, structures/structures/<slug>.mcstructure) and `<slug>_RP` (manifest, textures/item_texture.json), and no image files
- [ ] Exporting the same project twice gives the same pack UUIDs and a higher version
- [ ] In Bedrock 1.26.50+, opening the file imports both packs. With them on in a world:
  - [ ] The item appears in the creative inventory under its name and vanilla icon
  - [ ] Used in the air, the build appears with the meta block cell at the player's feet, and the player faces the arrow's way
  - [ ] Used on a block, the build anchors in the cell next to the clicked face
  - [ ] Facing each of north, east, south, and west, the build turns with the player
  - [ ] Rise: blocks land bottom to top in shuffled order within each layer, over the chosen seconds
  - [ ] Ripple out and ripple in: blocks land in rings from or toward the meta block
  - [ ] A glow in each block's color appears in each cell just before its block lands
  - [ ] Stairs, logs, and other directional blocks face the right way for all four player facings
  - [ ] With uses set to 3, the item shows a wear bar, and the third use builds and then breaks the item
- [ ] Orbit in game: the camera rises out of first person, circles the build once while it lands, keeps circling the finished build after the last block lands, and only then comes back into their eyes. The camera never stops before control returns. The circle speeds up from rest and slows to a stop. Movement and looking stay locked until then.
- [ ] Orbit with Rise: the camera starts low near the base and tilts up as the layers climb
- [ ] Look around in game: the view turns once around the player and tilts up while the build rises
- [ ] Preview with Orbit or Look around flies the 3D view along the same path, then returns the editor camera
- [ ] Re-exporting the same add-on name replaces the installed add-on. Another name installs beside it.
- [ ] Preview hides the dialog, plays the chosen animation in the 3D view with tinted glow puffs ahead of the blocks, then shows the dialog again
- [ ] In the tabbed layout, Preview switches to the 3D tab first
- [ ] Preview is disabled for "All at once"
- [ ] An edit during a preview ends it and shows the full model
  - [ ] Existing world blocks stay where the design has empty cells

---

## Meta Block

- [ ] M selects the Meta Block tool. The options bar shows "Facing" with turn buttons and hides depth and behavior.
- [ ] Clicking a 2D view moves the meta block to the clicked cell on the active layer
- [ ] T turns it right and Shift+T turns it left. The arrow in the top view follows.
- [ ] A view looking along the facing draws a dot instead of an arrow
- [ ] Undo of a move or turn reads "Undid Meta block"
- [ ] Clicking outside the grid does nothing
- [ ] A project made before the Meta Block tool existed opens with its meta block where it was

---

## Editor Layout

- [ ] **View mode**
  - [ ] The toolbar View Mode select switches between Tabbed and Quad Layout
  - [ ] Tabbed shows tabs for Top, Bottom, Front, Back, Left, Right, and 3D Preview
  - [ ] Quad Layout shows Front, Left, and Top 2D views plus the 3D view
  - [ ] Each 2D view in Quad Layout shows a block orientation preview

- [ ] **Side panel**
  - [ ] Tool buttons, foreground and background squares, block state controls (for stateful blocks), and the quick-select palette show in the left panel

- [ ] **Tool options bar**
  - [ ] Fill mode (outline or filled) shows only for Rectangle, Circle, Arch, and Curve
  - [ ] Depth and paint behavior controls always show
  - [ ] The X, Y, and Z layer readout sits on the right. The gear opens step buttons and fields.

- [ ] **Window resize**
  - [ ] Canvases resize with the window and the grid redraws without stretching

---

## 2D Views

- [ ] **Zoom and pan**
  - [ ] Mouse wheel and trackpad pinch zoom toward the cursor
  - [ ] Space plus left drag, or middle drag, pans. The cursor shows grab, then grabbing.

- [ ] **Layers**
  - [ ] Each view paints only on its active layer
  - [ ] Blocks off the active layer draw fainter with distance
  - [ ] W and S step the Z layer, A and D step X, X and C step Y. Keys wrap at the ends.
  - [ ] Step buttons in the layer popover stop at the ends instead of wrapping

- [ ] **Hover preview**
  - [ ] A preview block follows the cursor at reduced opacity
  - [ ] The preview clears when the cursor leaves the canvas

- [ ] **Shared drafts**
  - [ ] A stroke in one view shows its preview in the other 2D views and in 3D while the drag is in progress
  - [ ] Release makes the blocks solid in every view

- [ ] On a 64 × 64 project in the quad layout, filled areas read as solid colors with a faint line at every cell edge, and grass tops stay green
- [ ] Zooming in past 12px per cell brings the textures back
---

## Painting Tools

Painting uses the material in the active slot (foreground or background).

- [ ] **Point (B)**
  - [ ] Click places one block
  - [ ] Drag paints along the path without doubling cells
  - [ ] One undo removes the whole stroke
  - [ ] Shift held while dragging in a circle places a straight line from the press cell to the release cell, not the circle. One undo removes it.
  - [ ] Pressing or releasing Shift mid-drag switches between the straight line and the freehand path

- [ ] **Fill (no key)**
  - [ ] Click fills the connected region of matching cells on the active layer
  - [ ] Dragging does not fill
  - [ ] Filling a region with its own material does nothing

- [ ] **Rectangle (R)**
  - [ ] Drag shows the rectangle preview. Release places it.
  - [ ] Outline fill mode places only the edge. Filled mode places the whole rectangle.
  - [ ] Shift makes a square. Alt draws from the press point outward on all sides. Both together draw a square from the center.
  - [ ] Pressing or releasing Shift or Alt mid-drag reshapes the preview without moving the pointer

- [ ] **Circle (O)**
  - [ ] Drag corner to corner draws the ellipse that fits the box
  - [ ] Shift draws a true circle. Alt draws from the center. Both together draw a circle around the press point.
  - [ ] The outline has no gaps for even and odd sizes
  - [ ] Outline and filled modes both work

- [ ] **Modifier hints**
  - [ ] Point, Rectangle, and Circle show their modifier chips in the tool options bar. Fill, Arch, and Curve show none.
  - [ ] A chip fills in while its key is held, and clears when the window loses focus

- [ ] **Arch (G)**
  - [ ] Clicks one and two set the feet. Click three sets the apex.
  - [ ] Guide points and lines show while placing. The preview follows the cursor.

- [ ] **Curve (V)**
  - [ ] Clicks set start, end, and two control points
  - [ ] Guide points, lines, and tangent hints show while placing

- [ ] **Cancel**
  - [ ] Escape during a drag or a multi-click sequence clears the preview in every view
  - [ ] Nothing is saved and the undo stack is unchanged

- [ ] **Shortcut tooltips**
  - [ ] Each tool button tooltip shows its key. Fill shows none.

### Paint Behaviors

- [ ] **Normal** paints on empty cells and replaces existing blocks
- [ ] **Only Replace** paints only where a block exists. The preview shows only those cells.
- [ ] **Selective Replace** is selectable
- [ ] **Erase** removes blocks under the stroke. The preview shows the blocks that will go.

### Depth

- [ ] Depth off paints one layer
- [ ] Depth on with thickness 3 paints three layers away from the camera
- [ ] Thickness stops at the edge of the build volume
- [ ] Through paints every layer in range
- [ ] Until Hit stops at the first existing block

---

## Materials

- [ ] **Quick-select palette**
  - [ ] Nine slots. Keys 1 to 9 put a slot's material in the active slot.
  - [ ] Clicking a slot does the same
  - [ ] Right-click assigns the active material to that slot
  - [ ] Slots persist per project across reloads

- [ ] **Foreground and background**
  - [ ] Clicking either square makes it active. The active one has a highlight border.
  - [ ] F and the swap button switch the active slot

- [ ] **Material browser**
  - [ ] E or the browser button opens it. E closes it again.
  - [ ] Tabs: All, Building, Natural, Decoration
  - [ ] Search narrows the grid by name
  - [ ] Clicking a material puts it in the active slot
  - [ ] Holding and dragging a material onto the slot bar at the foot assigns it. The bar lights up during the drag.
  - [ ] Scrolling a long list stays smooth

- [ ] **Block state**
  - [ ] Picking a slab shows Bot, Top, and Dbl
  - [ ] Picking a stair shows facing and half controls
  - [ ] T rotates facing and Y flips half when a stateful block is active. Both keys do nothing for plain blocks.
  - [ ] Placed stairs join into corner shapes with their neighbors

---

## Undo and Redo

- [ ] Ctrl+Z (⌘Z on Mac) undoes. Ctrl+Shift+Z (⇧⌘Z) redoes.
- [ ] Toolbar Undo and Redo buttons enable and disable with the history. Tooltips show the keys.
- [ ] Each step shows a toast such as "Undid Point (3 blocks)" or "Redid Rectangle (12 blocks)"
- [ ] Erase steps read like "Point (3 blocks removed)"
- [ ] Toasts stack newest at the bottom, show at most four, and leave after about 2.5 seconds
- [ ] A new edit after an undo clears the redo history
- [ ] Undo during a drag does not crash or leave a stuck preview

---

## 3D View

- [ ] **Scene**
  - [ ] Blocks match the 2D views in position, shape, and texture
  - [ ] New blocks grow into place. Removed blocks shrink out.
  - [ ] Hover and draft previews from the 2D views show as ghost blocks

- [ ] **Camera**
  - [ ] Left drag orbits. Right drag, middle drag, or Space plus left drag pans.
  - [ ] Trackpad scroll orbits. Shift plus scroll pans. Pinch and mouse wheel zoom toward the cursor.
  - [ ] Home frames the structure while the pointer is over the 3D canvas
  - [ ] Front, Back, Left, Right, Top, and Bottom buttons move the camera to that side
  - [ ] Zoom In, Zoom Out, Fit Model to View, and Reset Camera buttons work
  - [ ] Right-click opens no context menu

- [ ] **Slice guides**
  - [ ] The X, Y, and Z slice toggles show and hide a plane at each active layer
  - [ ] Planes move when the active layer changes

- [ ] **Render settings**
  - [ ] The gear button opens Render Settings
  - [ ] Each control applies at once: FXAA, MSAA samples, lighting preset (Day, Night, Cloudy), background (Flat Color, Sky), PBR materials, environment intensity, shadows, SSAO, bloom, tone mapping, contrast, exposure
  - [ ] Highlight Active Layer brightens the active layer's blocks
  - [ ] Show Frame Stats shows the frame timing overlay
  - [ ] Settings persist per project across reloads

---

## Keyboard and Focus

- [ ] Shortcuts do nothing while a text field has focus
- [ ] While a dialog is open, only E (to close the material browser) acts
- [ ] Ctrl or Cmd with any key other than Z passes through to the browser
- [ ] Every dialog holds focus inside itself and closes on Escape
- [ ] Tab reaches every control in a sensible order with a visible focus ring
- [ ] Icon-only buttons have accessible names (Undo, Redo, Credits, Close)

---

## Performance

- [ ] A 64 × 64 × 64 project with thousands of blocks still pans and zooms smoothly in 2D
- [ ] The 3D view holds a steady frame rate. Frame Stats jitter stays under 0.5 while the camera moves.
- [ ] Fast hovering across a canvas does not lag
- [ ] Undo of a large fill finishes without a visible stall

---

## Browsers

- [ ] Chrome: all of the above, plus the save picker
- [ ] Firefox: all of the above. Save downloads the file.
- [ ] Safari on macOS: all of the above, including WebGL. Save downloads the file.
- [ ] Edge: all of the above

---

## Pre-Release

- [ ] Automated suite passes
- [ ] Setup and Textures, Projects, and Project Files sections pass
- [ ] No console errors during normal use
- [ ] Credits dialog matches `src/config/credits.ts` and `resource-packs/squareful/pack-source.json`

---

## Bug Report Template

```markdown
**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Environment:**
- Browser:
- OS:
- Screen Size:

**Console Errors:**
(paste any errors from the browser console)

**Screenshots:**
(if applicable)
```
