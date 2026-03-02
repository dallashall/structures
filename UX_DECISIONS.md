# UX Decisions & Interaction Patterns

This document captures the user experience design decisions for the Minecraft Magic Blueprint System.

---

## 1. Initial App Experience

**Question:** When a user first opens the app, what do they see?

**Options:**
- A welcome screen with "New Project" / "Load Project" options?
- Directly prompted with a "Create New Project" dialog?
- An empty editor state with a call-to-action?

**Decision:** Welcome screen with "New Project" / "Load Project" options

**Details:** Traditional app landing page approach. Shows saved projects and provides clear entry points for creating new projects or loading existing ones.

---

## 2. Project Creation Flow

**Question:** What information do users provide when creating a new project?

**Considerations:**
1. Project name (required)
2. Dimensions (width × height × depth) - are there presets like "Small (16×16×16)", "Medium (32×32×32)", etc.?
3. Meta block placement - do they:
   - Specify coordinates during creation?
   - Place it interactively after creation?
   - Have it auto-placed at a default position (like center-bottom)?
4. Meta block direction - set during creation or after?

**Decision:**
1. Project name is required
2. Offer preset dimensions (Small/Medium/Large) + custom input. **Important:** Dimensions are dynamic - users can add/remove layers in any direction as they build. Make it clear in the UI that initial dimensions can be changed later.
3. Meta block must be placed first, before any other blocks. Users place it interactively as their first action after project creation.
4. No direction configuration needed - meta block always faces the same direction within the system. Users view it from different perspectives (front/back, left/right, top/bottom).

**Details:**
- Meta block concept: It's a block in 3D space with an arrow pointing "forward". All other blocks are positioned relative to it.
- Meta block represents either: (1) an activatable block in the world, or (2) a player holding an item and activating it.
- The fixed direction simplifies the system - different views are just different perspectives on the same structure.
- Initial dimension presets could be: Small (16×16×16), Medium (32×32×32), Large (64×64×64), or Custom.

---

## 3. Main Editor Layout

**Question:** How are the different views arranged?

**Option A: Tabbed Interface**
- Tabs switch between Front View / Side View / Back View / 3D Preview
- One main canvas area
- Material palette in a sidebar

**Option B: Split View**
- Multiple 2D views visible simultaneously in a grid
- 3D preview as a separate tab or floating panel

**Option C: Primary + Context**
- One large primary view (the one you're editing)
- Smaller thumbnail previews of other views
- 3D preview toggleable as overlay or split

**Decision:** Support BOTH tabbed and quad-layout modes

**Details:**
- **Tabbed Mode:** One view at a time (Front / Side / Back / 3D Preview tabs) - focused work
- **Quad Layout:** Four views simultaneously - 3 2D views + 1 3D preview in a grid
- **Layout Switching:** View menu dropdown to select layout mode ("Tabbed" / "Quad Layout")
- **Keyboard Shortcuts:** Architecture should support them, but not defining specific shortcuts yet
- **Material Palette:** Sidebar/actionbar component, consistent across both layout modes

**The Three 2D Views (with flippable perspectives):**
1. **Front/Back View** - X-Y plane (looking along Z axis)
   - Front: looking from the front
   - Back: looking from the back
2. **Left/Right View** - Z-Y plane (looking along X axis)
   - Left: looking from the left side
   - Right: looking from the right side
3. **Top/Bottom View** - X-Z plane (looking along Y axis)
   - Top: looking from the top down
   - Bottom: looking from the bottom up

**Quad-Layout Behavior:**
- All 2D views are paintable (no single "active" view)
- User defines active layers/levels in all dimensions (X, Y, Z)
- Each view shows the slice at that layer
- Each view has a perspective toggle (Front↔Back, Left↔Right, Top↔Bottom)
- Paint operations apply to the appropriate layer based on which view is clicked
- Perspective concept: "looking from the [top, bottom, left, right, front, back]"

---

## 4. Layer/Depth Control

**Question:** How do users navigate depth layers in 2D views?

**Options:**
- Slider/scrubber at the bottom of canvas?
- Previous/Next layer buttons with current layer indicator?
- Keyboard shortcuts ([ ] keys)?
- Visual stack indicator showing all layers?

**Decision:** Multi-level layer control system with central controls, per-panel quick adjustments, and keyboard shortcuts

**Details:**

**Central Control/Visualization:**
- Always displays the selected layers for all three dimensions (X, Y, Z) - constantly visible
- Full controls (arrows + text input) can be hidden until activated
- Text input allows typing specific layer numbers for precision
- Arrows for incrementing/decrementing layers
- Must handle projects with many layers gracefully

**Per-Panel Quick Controls:**
- Each 2D panel has +/- buttons for quick depth adjustments
- UI must be careful/minimal since panels also need zoom controls
- These are for quick iteration; central control is for precise jumps

**Keyboard Shortcuts (Global):**
- `z` / `Shift+z`: Adjust Z-layer (front/back depth)
- `y` / `Shift+y`: Adjust Y-layer (top/bottom height)
- `x` / `Shift+x`: Adjust X-layer (left/right depth)
- Work globally - no specific panel needs focus
- Lowercase = increment, Shift = decrement (or vice versa, TBD)

---

## 5. 2D Canvas Interaction

**Question:** What's the editing behavior?

**Considerations:**
- Click to place one block at a time?
- Click and drag to paint continuously?
- Grid lines always visible, or toggle-able?
- Zoom levels - fit to screen by default, or 1:1 pixel ratio?

**Decision:** Rich painting system with multiple modes, behaviors, and interaction patterns

**Details:**

**Painting Modes:**
1. **Point Mode:** Click to place single block, Shift+click to delete single block
2. **Fill Mode:** Click and drag to fill region, Shift+click-drag to bulk delete
3. **Outline Mode:** Click and drag to draw outline, Shift+click-drag to delete outline

**Paint Behaviors (especially useful with Fill mode):**
- **Normal:** Fill everything including empty cells
- **Only Replace:** Replaces cells that already have blocks, leaves empty cells empty
- **Selective Replace:** Replaces only specific selected block types

**Erasing:**
- Primary: Modifier key (Shift) + click/drag
- Secondary: Dedicated eraser tool option

**Future: Depth Painter Mode**
- Quickly create filled or hollow cubic shapes across depth layers
- UI/UX not yet defined - to be explored

**Grid:**
- Toggleable on/off
- Styleable (color, opacity, etc.)
- Naturally fades when it would render < 1px on screen
- Adaptive visibility based on zoom level

**Zoom & Pan:**
- Default zoom: fit-to-panel
- Zoom controls: buttons + mousewheel
- Pan: Spacebar + click + drag

**Visual Feedback:**
- Crosshair cursor
- Hover highlight/outline of affected area
- No block preview - just hover styling shows what will be affected

---

## 6. Material Selection

**Question:** Where does the block palette live and how does selection work?

**Considerations:**
- Fixed sidebar with scrollable grid of blocks?
- Collapsible panel?
- Floating palette?
- Recently used blocks at the top?
- Search/filter by name or category?

**Decision:** Floating actionbar at bottom with quick-select palette and pop-out menu for full block library

**Details:**

**Actionbar (Bottom of Screen):**
- Floating actionbar using React Spectrum's ActionBar pattern
- Always visible, non-intrusive
- Contains quick-select palette and button to open full palette menu

**Quick-Select Palette:**
- 5 slots, always visible on the actionbar
- User manually assigns blocks to each slot (not auto-populated)
- Similar to Photoshop color swatches, but for Minecraft blocks
- Quick access to frequently-used materials without opening full palette

**Full Palette Menu:**
- Pops out from actionbar (should be a common UI pattern in Spectrum)
- Organized by block type and sub-type (sectioned/categorized)
- Uses panels for organization
- Fuzzy search functionality (like Minecraft inventory, but with clean Spectrum UI)
- User can browse all available blocks and add them to quick-select

**Selection Feedback:**
- Match React Spectrum's color picker styling
- Visual highlight/border on selected block
- Consistent with Spectrum design patterns

---

## 7. Meta Block Handling

**Question:** When and how is the meta block placed?

**Considerations:**
- Set during initial project creation?
- Placed in the first editing action?
- Special tool mode to place/move it?
- Visual representation: Different color? Icon? Special border?

**Decision:** Guided placement as first action after project creation; cannot be moved once placed

**Details:**

**Initial Placement Flow:**
1. User creates new project (name + dimensions dialog)
2. Dialog closes, informational modal appears
3. Modal describes meta block purpose and placement
4. Modal may include image/gif showing what the meta block represents
5. User closes modal, enters "place meta block" mode
6. User can click on any 2D view to place the meta block
7. Once placed, meta block cannot be moved

**Visual Representation (2D Views):**
- White block with arrow pointing forward (the meta block's forward direction)
- Letter denoting which direction the view is looking from:
  - F (Front), B (Back), L (Left), R (Right), T (Top), Bo (Bottom)
- The arrow is trickier to represent in Front/Back views (looking along forward axis)

**Visual Representation (3D View):**
- Same concept as 2D but rendered in 3D
- White block with directional arrow

**Movement:**
- Meta block CANNOT be moved after placement
- Simplifies workflow and prevents accidental origin changes

**Placement Restrictions:**
- Not implementing placement restrictions (player standing space validation) in initial version

---

## 8. Project Management

**Question:** How do users manage multiple projects?

**Considerations:**
- File menu with New/Open/Save?
- Project browser/gallery view?
- Auto-saved in background, manual save also available?
- Where does the project list appear?

**Decision:** Auto-save to browser storage + manual export, with traditional File menu and project browser

**Details:**

**Auto-Save:**
- Auto-save to browser localStorage after changes
- 3 seconds wait time is sufficient
- Show indicators for "unsaved" and "saving" states
- No save confirmation dialogs

**Manual Save (Export):**
- "Save" in File menu = Export/Download file to desktop
- Exported file can be used to transfer between browsers or restore projects
- File format TBD (likely JSON)

**Loading Projects:**
- Can open from local browser storage (auto-saved projects)
- Can open from files (previously exported/saved projects)
- Accessible at any time via File menu → Open
- Also accessible from welcome screen

**Project Browser UI:**
- Grid view of projects
- Initially shows: name + thumbnail only
- On selection: show full metadata panel
- Action button to open selected project
- Thumbnails auto-generated from 3D view periodically

**Project Metadata (stored):**
- Name
- Created date
- Last modified date
- Dimensions (of actual blocks placed, not grid dimensions)
- Block count (number of blocks placed)
- Thumbnail image

**File Menu Structure:**
- Traditional menu: New, Open, Save (Export), Save As, Export (other formats)
- "Save" = export to file
- Auto-save handles browser storage persistence

**Deleting Projects:**
- Delete option available in project browser
- Requires confirmation dialog

**Side Note:**
- System must support Undo/Redo functionality (important architectural consideration)

---

## Summary

### Complete User Journey

**1. App Launch**
- User opens app, sees welcome screen
- Grid of existing projects (name + thumbnail) or "New Project" button

**2. Create New Project**
- Click "New Project"
- Dialog: Enter name + select dimensions (presets or custom)
- Note: Dimensions can be changed later by adding/removing layers

**3. Place Meta Block**
- Creation dialog closes
- Informational modal explains meta block purpose (with image/gif)
- User closes modal, enters placement mode
- Click on any 2D view to place white meta block with directional arrow
- Meta block cannot be moved once placed

**4. Choose Layout Mode**
- Via View menu dropdown, select:
  - **Tabbed Mode:** One view at a time (focused work)
  - **Quad Layout:** All views visible (Front/Back, Left/Right, Top/Bottom, 3D)
- Each 2D view has perspective toggle (Front↔Back, Left↔Right, Top↔Bottom)

**5. Building the Structure**
- **Select Material:** Use 5-slot quick-select palette on bottom actionbar, or open full palette menu (organized by type, fuzzy search)
- **Set Active Layers:** Use central layer controls (X, Y, Z) or keyboard shortcuts (x/shift+x, y/shift+y, z/shift+z)
- **Paint Blocks:** Choose painting mode (Point, Fill, Outline) and behavior (Normal, Only Replace, Selective Replace)
  - Click to place / Shift+click to erase
  - Click-drag for fills/outlines
- **Adjust View:** Per-panel +/- for layer depth, zoom (fit-to-panel default, buttons/mousewheel), pan (spacebar+drag)
- **Visual Feedback:** Crosshair cursor, hover highlight of affected area

**6. Auto-Save & Preview**
- Project auto-saves to browser storage after 3 seconds of inactivity
- Indicators show "unsaved" / "saving" states
- Toggle between 2D and 3D views to inspect structure
- 3D view periodically generates thumbnail for project browser

**7. Undo/Redo**
- Support for undoing/redoing actions (keyboard shortcuts TBD)

**8. Export Project**
- File menu → Save (Export)
- Downloads project file to desktop for transfer/backup
- No confirmation needed

**9. Load Existing Project**
- Welcome screen or File menu → Open
- Grid of projects (name + thumbnail)
- Select project to see full metadata (created, modified, dimensions, block count)
- Click action button to open
- Can also load from previously exported file

**10. Delete Project**
- Delete option in project browser
- Confirmation dialog required

### Key Architectural Considerations
- Dynamic dimensions (can add/remove layers while building)
- All 2D views paintable in quad-layout mode
- Global keyboard shortcuts for layer navigation
- Undo/redo system required
- Multiple painting modes and behaviors
- Auto-save + manual export workflow
