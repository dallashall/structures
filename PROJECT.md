# Minecraft Magic Blueprint System

## Project Overview

The Minecraft Magic Blueprint System is a web-based application that allows users to design 3D Minecraft structures using an intuitive 2D pixel-art editor combined with a real-time 3D preview. The system enables creators to build complex structures that can be exported and integrated into Minecraft mods as placeable objects or command blocks.

## Purpose

This tool bridges the gap between creative vision and Minecraft construction by providing:
- An accessible, pixel-art style interface familiar to designers
- Multi-view 2D editing (front, side, back) for precise block placement
- Layer-based depth editing for complete 3D control
- Real-time 3D visualization to verify designs
- Export functionality for integration with Minecraft mods

## System Architecture

### 2D Editor Functionality

The core editing experience uses HTML Canvas to provide a pixel-art style interface where each pixel represents a Minecraft block.

**Multi-View System:**
- **Front View**: Edit the X-Y plane (width × height)
- **Side View**: Edit the Z-Y plane (depth × height)
- **Back View**: Edit the X-Y plane from opposite perspective

**Depth Layer System:**
- Each view has multiple depth layers corresponding to the third dimension
- Users select which layer they're currently editing
- Only the active layer accepts paint operations
- Non-active layers are visible but dimmed for context

**Editing Operations:**
- Paint: Click/drag to place selected block type
- Erase: Remove blocks from grid
- Fill: Flood-fill connected regions (future enhancement)
- Eyedropper: Sample existing blocks (future enhancement)

### 3D Visualizer

The 3D preview uses BabylonJS to render the complete structure in real-time.

**Current Capabilities:**
- Real-time rendering of all placed blocks
- Orbit camera controls (rotation around structure)
- Pan controls (move view position)
- Zoom controls (adjust camera distance)
- Grid overlay for spatial reference

**Future Enhancements:**
- Layer visibility toggles
- Viewpoint transparency
- Lighting and shadow options
- Animation preview for structure entrance effects

### Meta Block and Orientation System

Every project includes a special "meta block" that defines the structure's origin and placement orientation.

**Meta Block Properties:**
- Position: The origin point for the structure (typically near ground level)
- Direction Arrow: Indicates the "front" facing when placed in-game
- Placement Restrictions: Two blocks in front of meta block must remain empty (player standing space)

**In-Game Behavior:**
- When a player activates the structure object/command block in Minecraft
- The structure materializes with the meta block at the activation point
- The direction arrow aligns with the player's facing direction
- Animated entrance effects make placement feel dramatic (future feature)

### Material System

**Block Registry:**
- Catalog of all available Minecraft block types
- Organized by categories (stone, wood, decoration, etc.)
- Each block has:
  - Unique ID
  - Display name
  - Color representation for 2D editor
  - Texture reference for 3D preview (future)

**Material Palette:**
- UI component for selecting active block type
- Search/filter functionality
- Recently used blocks
- Favorites system (future enhancement)

## Technology Stack

### Core Technologies

- **TypeScript**: Type-safe development, improved code quality
- **Vite**: Fast development server, optimized builds
- **React**: Component-based UI architecture

### UI Libraries

- **react-spectrum**: Adobe's design system for consistent, accessible UI components
  - Buttons, dialogs, menus, form controls
  - Built-in accessibility features
  - Responsive design support

### Rendering Engines

- **HTML Canvas**: 2D pixel editor rendering
  - Direct pixel manipulation
  - Efficient for grid-based editing
  - Event handling for paint operations

- **BabylonJS**: 3D visualization
  - WebGL-based rendering
  - Built-in camera controls
  - Optimized for real-time updates

## Data Model

### Project Structure

```typescript
{
  id: string,
  name: string,
  dimensions: { width: number, height: number, depth: number },
  metaBlock: {
    position: { x: number, y: number, z: number },
    direction: 'north' | 'south' | 'east' | 'west'
  },
  blocks: Map<string, BlockData>, // key: "x,y,z"
  created: Date,
  modified: Date
}
```

### Block Data

```typescript
{
  position: { x: number, y: number, z: number },
  blockType: string // references Block Registry ID
}
```

## Data Persistence

### Storage Strategy

**Phase 1: localStorage**
- Simple key-value storage in browser
- JSON serialization of project data
- Sufficient for prototype and single-user scenarios
- ~5-10MB storage limit (browser dependent)

**Phase 2: IndexedDB (Future)**
- Structured database in browser
- Better performance for large projects
- No practical size limit
- Supports indexing and queries

### Auto-Save

- Project auto-saves every 30 seconds when modified
- Manual save option in toolbar
- "Unsaved changes" indicator in UI

## User Workflow

1. **Create New Project**
   - Set project name
   - Define dimensions (width × height × depth)
   - Place meta block and set direction

2. **Build Structure**
   - Select material from palette
   - Choose view (front/side/back)
   - Select depth layer
   - Paint blocks on canvas

3. **Preview in 3D**
   - Switch to 3D view
   - Rotate, pan, zoom to inspect
   - Return to 2D for refinements

4. **Configure & Export**
   - Set structure metadata
   - Choose export format
   - Download for mod integration

## Future Enhancements

- Undo/redo system
- Copy/paste regions
- Symmetry tools (mirror, rotate)
- Template library
- Multi-project management
- Collaborative editing
- Animation timeline for entrance effects
- Texture pack support
- NBT structure export format
