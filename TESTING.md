# Frontend Testing Plan - Structures

**Last Updated:** 2026-03-07
**Version:** Post-Architectural Refactoring (Phases 1-7)

This document provides a comprehensive checklist for manual testing of the Structures application after the major architectural refactoring that introduced ModelHistory, DraftingService, and specific event naming.

---

## 🎯 Critical Path Tests

These tests verify the core user journey and must pass before release.

### Project Lifecycle
- [ ] **Create New Project**
  - [ ] Click "New Project" button
  - [ ] Enter project name
  - [ ] Set dimensions (width, height, depth)
  - [ ] Project creates successfully
  - [ ] Canvas displays with correct dimensions
  - [ ] Meta block appears at origin

- [ ] **Save Project**
  - [ ] Make changes to project (place blocks)
  - [ ] Observe save indicator shows "Saving..." (min 1.5s visible)
  - [ ] Save indicator changes to "Saved" after 3s debounce
  - [ ] Refresh browser
  - [ ] Project persists correctly

- [ ] **Load Project**
  - [ ] Navigate to project browser/welcome screen
  - [ ] See list of saved projects with thumbnails
  - [ ] Click on a project
  - [ ] Project loads with all blocks intact
  - [ ] Camera position reasonable

### Basic Painting Flow
- [ ] **Point Paint Mode**
  - [ ] Select a material from palette
  - [ ] Hover over canvas → preview block appears at 70% opacity
  - [ ] Click to place block
  - [ ] Block becomes solid (100% opacity)
  - [ ] Undo button becomes enabled
  - [ ] Save indicator shows "Pending" → "Saving..." → "Saved"

- [ ] **Draft Mode (Click-Drag)**
  - [ ] Select paint tool
  - [ ] Click and hold mouse button
  - [ ] Drag across multiple cells
  - [ ] Preview blocks appear at 70% opacity during drag
  - [ ] Preview visible in BOTH 2D and 3D views simultaneously
  - [ ] Release mouse → blocks become solid
  - [ ] Single undo removes entire stroke

- [ ] **Cancel Draft (ESC)**
  - [ ] Start painting (click and drag)
  - [ ] Preview blocks visible
  - [ ] Press ESC key while dragging
  - [ ] Preview blocks disappear immediately
  - [ ] No blocks persisted to project
  - [ ] Undo stack unchanged

### Undo/Redo
- [ ] **Undo Single Operation**
  - [ ] Place a block
  - [ ] Click Undo button (or Cmd/Ctrl+Z)
  - [ ] Block disappears
  - [ ] Redo button becomes enabled

- [ ] **Redo Operation**
  - [ ] After undoing, click Redo button (or Cmd/Ctrl+Shift+Z)
  - [ ] Block reappears

- [ ] **Undo Multi-Block Stroke**
  - [ ] Paint a stroke of 10 blocks (drag)
  - [ ] Click Undo once
  - [ ] All 10 blocks disappear as a unit
  - [ ] Click Redo
  - [ ] All 10 blocks reappear

---

## 🖼️ 2D Canvas Views

### View Selection
- [ ] **Top View**
  - [ ] Select "Top" view
  - [ ] Canvas shows XY plane (looking down Z axis)
  - [ ] Grid renders correctly
  - [ ] Axes labeled correctly (X=red, Y=blue)

- [ ] **Front View**
  - [ ] Select "Front" view
  - [ ] Canvas shows XZ plane (looking along +Y axis)
  - [ ] Grid and axes correct

- [ ] **Left View**
  - [ ] Select "Left" view
  - [ ] Canvas shows YZ plane (looking along +X axis)
  - [ ] Grid and axes correct

- [ ] **Back, Right, Bottom Views**
  - [ ] All remaining orthographic views render correctly

### Canvas Interactions
- [ ] **Zoom**
  - [ ] Mouse wheel up → zoom in
  - [ ] Mouse wheel down → zoom out
  - [ ] Zoom centers around cursor position
  - [ ] Grid scales appropriately

- [ ] **Pan**
  - [ ] Hold spacebar (or middle mouse) and drag → canvas pans
  - [ ] Cursor changes to "grab" → "grabbing"
  - [ ] Pan is smooth and responsive

- [ ] **Layer Controls**
  - [ ] Change active layer (e.g., Z layer in top view)
  - [ ] Layer indicator updates
  - [ ] Painting constrained to active layer
  - [ ] Blocks on active layer highlighted/brighter
  - [ ] Blocks on other layers dimmed

### Preview Rendering (2D)
- [ ] **Point Hover Preview**
  - [ ] Hover over grid cells
  - [ ] Single preview block follows cursor
  - [ ] Preview at 70% opacity
  - [ ] Preview disappears when mouse leaves canvas

- [ ] **Outline Drag Preview**
  - [ ] Select outline tool
  - [ ] Click and drag to create rectangle
  - [ ] Dashed outline appears during drag
  - [ ] Preview blocks render outline shape
  - [ ] Preview visible in 3D view simultaneously

- [ ] **Shared Draft Preview (Cross-View)**
  - [ ] Open two 2D views side-by-side (e.g., Top + Front)
  - [ ] Paint in Top view (click and drag)
  - [ ] Preview blocks appear in Front view simultaneously
  - [ ] Release mouse → blocks solidify in both views
  - [ ] Both views stay in sync

---

## 🎨 Painting Tools

### Paint Modes
- [ ] **Point Mode**
  - [ ] Single block placement
  - [ ] Preview follows cursor
  - [ ] Click to place
  - [ ] Drag to paint continuously

- [ ] **Fill Mode**
  - [ ] Click on enclosed area
  - [ ] Flood fill works correctly
  - [ ] Preview shows filled area (Alt key)
  - [ ] Respects layer boundaries

- [ ] **Outline Mode**
  - [ ] Click and drag to define rectangle
  - [ ] Only perimeter blocks placed
  - [ ] Interior remains empty

- [ ] **Circle Mode** (if implemented)
  - [ ] Creates circular shape
  - [ ] Preview shows circle during drag

- [ ] **Arch Mode** (if implemented)
  - [ ] Creates arch shape
  - [ ] Preview accurate

### Paint Behaviors
- [ ] **Normal Behavior**
  - [ ] Paints over air blocks
  - [ ] Paints over existing blocks (replaces)

- [ ] **Only Replace Behavior**
  - [ ] Only paints over existing blocks
  - [ ] Does NOT paint on air
  - [ ] Preview shows only blocks that will be replaced

- [ ] **Selective Replace Behavior**
  - [ ] Only replaces blocks of specific type
  - [ ] Configure target block type
  - [ ] Preview accurate

### Depth Mode
- [ ] **Enable Depth**
  - [ ] Toggle depth mode ON
  - [ ] Set thickness (e.g., 3 layers)
  - [ ] Paint operation extends through 3 layers away from camera
  - [ ] Preview shows all depth layers

- [ ] **Depth Mode: Through**
  - [ ] Paints through existing blocks
  - [ ] All layers painted regardless of obstacles

- [ ] **Depth Mode: Until Collision**
  - [ ] Stops painting when hits existing block
  - [ ] Preview shows where it stops

---

## 🎭 Material/Block Selection

### Material Palette
- [ ] **Quick Select Palette**
  - [ ] Shows 8-10 most recent materials
  - [ ] Click material → becomes selected
  - [ ] Visual indicator shows selected material
  - [ ] Color swatch matches block color

- [ ] **Full Material Browser**
  - [ ] Open full palette/browser
  - [ ] Search for materials by name
  - [ ] Filter by category (if implemented)
  - [ ] Select material → adds to quick palette
  - [ ] Close browser

- [ ] **Eraser/Air Block**
  - [ ] Select eraser (null block)
  - [ ] Paint to remove blocks
  - [ ] Erased blocks disappear

---

## 🎲 3D Babylon View

### Scene Rendering
- [ ] **Initial Load**
  - [ ] 3D scene renders all blocks correctly
  - [ ] Block colors match 2D view
  - [ ] Grid helper visible
  - [ ] Coordinate axes visible (X, Y, Z)
  - [ ] Lighting reasonable

- [ ] **Camera Controls**
  - [ ] Left click drag → rotate camera (arc rotate)
  - [ ] Mouse wheel → zoom in/out
  - [ ] Right click drag → pan camera (if supported)
  - [ ] Camera doesn't go through blocks or inverted

### Real-Time Updates
- [ ] **Block Placement in 3D**
  - [ ] Place block in 2D view
  - [ ] Block appears in 3D view immediately
  - [ ] No flickering
  - [ ] Correct position and color

- [ ] **Block Removal in 3D**
  - [ ] Remove block in 2D view
  - [ ] Block disappears from 3D view immediately

- [ ] **Preview in 3D**
  - [ ] Hover in 2D view with point tool
  - [ ] Preview (ghost) block appears in 3D view at 70% opacity
  - [ ] Preview follows cursor in real-time
  - [ ] Preview disappears when mouse leaves canvas

- [ ] **Draft Preview in 3D**
  - [ ] Start drag painting in 2D view
  - [ ] Ghost blocks appear in 3D view during drag
  - [ ] Release mouse → ghost blocks become solid in 3D

### Slice Plane Visualization
- [ ] **Active Layer Highlighting**
  - [ ] Change active layer in 2D view
  - [ ] Blocks on active layer brighten in 3D
  - [ ] Blocks on other layers dim
  - [ ] Smooth transition

- [ ] **Slice Planes** (if implemented)
  - [ ] Show/hide slice plane guides
  - [ ] Planes align with active layers
  - [ ] Correct axis and position

---

## 📐 Meta Block

### Placement
- [ ] **Initial Placement**
  - [ ] New project shows meta block at origin
  - [ ] Meta block visualized (special appearance)
  - [ ] Direction indicator (arrow pointing North)
  - [ ] Border shows "unconfirmed" state (green)

- [ ] **Move Meta Block**
  - [ ] Enter placement mode
  - [ ] Click on canvas to move meta block
  - [ ] Meta block follows cursor
  - [ ] Can move multiple times before confirming

- [ ] **Confirm Meta Block**
  - [ ] Click "Confirm" button
  - [ ] Meta block locked in place
  - [ ] Border changes to "confirmed" state (dark)
  - [ ] Can no longer move meta block

### Direction
- [ ] **Fixed North Direction**
  - [ ] Meta block always faces North
  - [ ] Arrow indicator points correctly
  - [ ] No rotation controls (as per UX decision)

---

## 📏 Dimension Management

### Expand Dimensions
- [ ] **Expand Positive Direction (X+, Y+, Z+)**
  - [ ] Click expand button for X+ (or Y+, Z+)
  - [ ] Dimension increases by 1
  - [ ] Existing blocks remain in place
  - [ ] New layer added on positive side
  - [ ] Grid updates
  - [ ] 3D view updates

- [ ] **Expand Negative Direction (X-, Y-, Z-)**
  - [ ] Click expand button for X- (or Y-, Z-)
  - [ ] Dimension increases by 1
  - [ ] Existing blocks shift by +1 in that axis
  - [ ] Meta block shifts accordingly
  - [ ] Grid updates

### Shrink Dimensions
- [ ] **Shrink Positive Direction**
  - [ ] Click shrink button for X+ (or Y+, Z+)
  - [ ] Dimension decreases by 1
  - [ ] Blocks on removed layer deleted
  - [ ] Warning shown if blocks will be deleted (if implemented)
  - [ ] Grid updates

- [ ] **Shrink Negative Direction**
  - [ ] Click shrink button for X-
  - [ ] Dimension decreases by 1
  - [ ] Blocks shift by -1
  - [ ] Blocks outside bounds deleted
  - [ ] Grid updates

- [ ] **Minimum Dimensions**
  - [ ] Cannot shrink below 1x1x1
  - [ ] Shrink button disabled when at minimum

---

## 💾 Save System

### Auto-Save
- [ ] **Auto-Save Triggers**
  - [ ] Place a block
  - [ ] Save indicator shows "Pending" immediately
  - [ ] Wait 3 seconds without changes
  - [ ] Save indicator shows "Saving..." (min 1.5s visible)
  - [ ] Save indicator shows "Saved"

- [ ] **Auto-Save Debounce**
  - [ ] Place block 1
  - [ ] Indicator shows "Pending"
  - [ ] Within 3s, place block 2
  - [ ] Timer resets
  - [ ] Wait 3s
  - [ ] Single save operation for both blocks

### Manual Save/Load
- [ ] **Export to JSON**
  - [ ] Click "Export" button
  - [ ] Downloads JSON file
  - [ ] File contains project data
  - [ ] File naming reasonable

- [ ] **Import from JSON**
  - [ ] Click "Import" button
  - [ ] Select previously exported JSON file
  - [ ] Project loads correctly
  - [ ] All blocks, dimensions, meta block preserved

### Persistence
- [ ] **LocalStorage Persistence**
  - [ ] Create project with blocks
  - [ ] Close browser tab
  - [ ] Reopen application
  - [ ] Project still in project list
  - [ ] Load project → blocks intact

- [ ] **Thumbnails**
  - [ ] Project list shows thumbnails
  - [ ] Thumbnail reflects current project state
  - [ ] Thumbnail updates after changes

---

## 🔄 Event System Integration

### ModelHistory Events
- [ ] **Block Operations Persisted**
  - [ ] Place 5 blocks
  - [ ] Refresh browser (reload app)
  - [ ] All 5 blocks persist correctly
  - [ ] Undo/redo history preserved

- [ ] **Event Journal**
  - [ ] Place blocks, remove blocks, expand dimensions
  - [ ] All operations stored in event journal (check localStorage if accessible)
  - [ ] State reconstruction works correctly

### DraftingService Integration
- [ ] **Preview Shared Across Views**
  - [ ] Open 2D view and 3D view simultaneously
  - [ ] Start painting in 2D (click and drag)
  - [ ] Preview blocks appear in 3D view immediately
  - [ ] Preview updates in real-time as cursor moves
  - [ ] Release mouse → blocks solidify in both views

- [ ] **Draft Cancellation**
  - [ ] Start draft (click and drag)
  - [ ] Preview visible in all views
  - [ ] Press ESC
  - [ ] Preview clears from ALL views simultaneously
  - [ ] No blocks persisted

### Specific Event Names (No Generic Events)
- [ ] **No 'project:changed' Events**
  - [ ] Open browser console
  - [ ] Perform various operations
  - [ ] Verify no generic 'project:changed' events emitted
  - [ ] Specific events only: 'block:placed', 'block:removed', 'dimensions:expanded', etc.

---

## 🎨 UI Components & Layout

### Toolbar
- [ ] **Tool Selection**
  - [ ] Click tool buttons (point, fill, outline, etc.)
  - [ ] Active tool highlighted
  - [ ] Tool behavior changes correctly

- [ ] **Undo/Redo Buttons**
  - [ ] Enabled/disabled state correct
  - [ ] Tooltips show keyboard shortcuts
  - [ ] Icons clear

### Sidebar/Panels
- [ ] **Material Palette Docked**
  - [ ] Palette visible and accessible
  - [ ] Scrolling works if many materials
  - [ ] Resize panel (if supported)

- [ ] **Layer Controls**
  - [ ] Layer slider/input responsive
  - [ ] Layer number displays correctly
  - [ ] Visual feedback on active layer

### Dialogs/Modals
- [ ] **New Project Dialog**
  - [ ] Form validation (dimensions > 0)
  - [ ] Submit creates project
  - [ ] Cancel closes without creating

- [ ] **Confirmation Dialogs**
  - [ ] Delete project requires confirmation
  - [ ] Destructive operations confirmed

### Responsive Design
- [ ] **Window Resize**
  - [ ] Resize browser window
  - [ ] Canvas resizes appropriately
  - [ ] Grid recalculates
  - [ ] No broken layout

- [ ] **Multi-Panel Layout**
  - [ ] Switch between single view and quad view (if supported)
  - [ ] All panels render correctly
  - [ ] Each panel independent controls

---

## ⚡ Performance

### Rendering Performance
- [ ] **Large Projects**
  - [ ] Create 32x32x32 project (or max size)
  - [ ] Fill with blocks (e.g., 1000+ blocks)
  - [ ] 2D canvas still responsive (zoom, pan)
  - [ ] 3D view maintains 30+ fps
  - [ ] No stuttering during interactions

- [ ] **Preview Performance**
  - [ ] Hover rapidly across canvas
  - [ ] Preview updates smoothly
  - [ ] No lag or dropped frames

### Memory
- [ ] **No Memory Leaks**
  - [ ] Open DevTools → Performance/Memory tab
  - [ ] Perform operations for 2-3 minutes
  - [ ] Memory usage stable (no continuous growth)
  - [ ] Garbage collection works

### History Performance
- [ ] **Undo Stack Size**
  - [ ] Perform 100 operations
  - [ ] Undo 100 times
  - [ ] No performance degradation
  - [ ] History depth configurable (default 100 events)

---

## 🐛 Error Handling

### Validation
- [ ] **Invalid Dimensions**
  - [ ] Try to create project with 0 or negative dimensions
  - [ ] Error message shown
  - [ ] Project not created

- [ ] **Out of Bounds Painting**
  - [ ] Try to paint outside grid bounds
  - [ ] Operation rejected gracefully
  - [ ] No console errors

### Edge Cases
- [ ] **Empty Project**
  - [ ] Create project without placing blocks
  - [ ] Save and reload
  - [ ] No errors

- [ ] **Rapid Clicks**
  - [ ] Click rapidly on canvas
  - [ ] No duplicate blocks
  - [ ] Debouncing works correctly

- [ ] **Concurrent Operations**
  - [ ] Start painting stroke
  - [ ] During drag, press undo (keyboard)
  - [ ] Graceful handling (no crash)

### LocalStorage Limits
- [ ] **Storage Full**
  - [ ] Create many large projects (if possible to hit limit)
  - [ ] Error message if storage full
  - [ ] Guidance to delete old projects

---

## ♿ Accessibility

### Keyboard Navigation
- [ ] **Tab Navigation**
  - [ ] Tab through all interactive elements
  - [ ] Focus indicators visible
  - [ ] Logical tab order

- [ ] **Keyboard Shortcuts**
  - [ ] Cmd/Ctrl+Z → Undo
  - [ ] Cmd/Ctrl+Shift+Z → Redo
  - [ ] Spacebar → Pan (while held)
  - [ ] ESC → Cancel draft
  - [ ] Number keys → Select tools (if implemented)

### Screen Readers
- [ ] **ARIA Labels**
  - [ ] Buttons have accessible labels
  - [ ] Form inputs labeled correctly
  - [ ] Status messages announced (save state, errors)

### Visual
- [ ] **Color Contrast**
  - [ ] Text readable on backgrounds
  - [ ] Passes WCAG AA standards (if required)

- [ ] **Focus Indicators**
  - [ ] Clear outline on focused elements
  - [ ] Not hidden by CSS

---

## 🌐 Browser Compatibility

### Desktop Browsers
- [ ] **Chrome** (latest)
  - [ ] All features work
  - [ ] No console errors

- [ ] **Firefox** (latest)
  - [ ] All features work
  - [ ] No console errors

- [ ] **Safari** (latest, macOS)
  - [ ] All features work
  - [ ] WebGL/BabylonJS works

- [ ] **Edge** (latest)
  - [ ] All features work

### Mobile/Tablet (if supported)
- [ ] **Touch Interactions**
  - [ ] Tap to place blocks
  - [ ] Pinch to zoom
  - [ ] Two-finger pan

- [ ] **Responsive Layout**
  - [ ] Layout adapts to smaller screens
  - [ ] Controls accessible

---

## 🧪 Regression Tests

These tests ensure recent refactoring didn't break existing functionality.

### Post-Refactoring Critical Tests
- [ ] **EventStore → ModelHistory Migration**
  - [ ] Load project created before refactoring (if applicable)
  - [ ] Project loads correctly
  - [ ] History intact

- [ ] **DraftingService Integration**
  - [ ] Painting flow: click → drag → preview → release → solid
  - [ ] Preview visible in all views
  - [ ] No duplicate blocks on finalize

- [ ] **Event Name Changes**
  - [ ] All components subscribe to correct events
  - [ ] No broken subscriptions
  - [ ] No console warnings about missing event handlers

- [ ] **Canvas2D V2**
  - [ ] V2 controller active (V1 deleted)
  - [ ] No references to old controller
  - [ ] Interaction handlers work correctly

---

## 📋 Pre-Release Checklist

Before releasing to production:

- [ ] All **Critical Path Tests** pass
- [ ] No console errors or warnings during normal usage
- [ ] Performance acceptable on target hardware
- [ ] LocalStorage persistence works
- [ ] Undo/redo reliable
- [ ] Cross-view preview synchronization works
- [ ] Auto-save reliable (3s debounce, 1.5s min visible duration)
- [ ] Browser compatibility tested (Chrome, Firefox, Safari)
- [ ] Accessibility basics covered (keyboard nav, focus indicators)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)

---

## 🔍 Testing Notes

### How to Test Draft Mode
1. Select paint tool and material
2. Click and hold mouse on canvas
3. Drag to paint multiple blocks
4. **During drag:** Preview blocks should appear at 70% opacity in ALL views
5. **Release mouse:** Preview blocks become solid (100% opacity)
6. **Press ESC during drag:** Preview disappears, nothing persisted

### How to Test Cross-View Preview
1. Open browser with multiple views visible (e.g., split screen with 2D + 3D)
2. Start painting in one view
3. Observe preview appearing simultaneously in other views
4. Verify preview disappears from all views when drag ends or ESC pressed

### How to Check Event Names (Developer)
1. Open browser console
2. In console, run: `localStorage.getItem('mc-blueprint-journal-current')`
3. Inspect event types in journal
4. Verify specific event names: `'block:placed'`, `'block:removed'`, `'dimensions:expanded'`, etc.
5. Verify NO generic events: `'project:changed'`, `'block:added'`

---

## 📝 Bug Report Template

When filing bugs, include:

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
(paste any errors from browser console)

**Screenshots:**
(if applicable)
```

---

**End of Testing Plan**
