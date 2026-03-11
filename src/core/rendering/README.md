# Rendering Module

Composable rendering components for the Babylon.js 3D viewer.

## Architecture

This module follows Babylon.js best practices:
- **Small, focused files** - Each visualizer handles a specific rendering concern
- **Composition over inheritance** - Controllers compose visualizers rather than subclassing
- **Loose coupling** - Visualizers depend on stable interfaces (Scene, Dimensions)
- **Dependency injection** - Scene and configuration passed as constructor parameters

## Components

### SlicePlaneVisualizer

Renders semi-transparent planes showing the current 2D slice locations in 3D space.

**Features:**
- Creates pairs of planes on either side of each active slice (X, Y, Z)
- Color-coded to match 2D view axis colors:
  - Red (#e74c3c) = X planes (perpendicular to width axis)
  - Blue (#3498db) = Y planes (perpendicular to depth axis)
  - Green (#27ae60) = Z planes (perpendicular to height axis)
- Automatically updates when user changes slice selection
- Handles coordinate system conversion (our Z-up to Babylon's Y-up)

**Usage:**

```typescript
import { SlicePlaneVisualizer } from './rendering/SlicePlaneVisualizer';

// Create visualizer
const visualizer = new SlicePlaneVisualizer(scene, projectDimensions);

// Update when dimensions change
visualizer.updateDimensions(newDimensions);

// Toggle visibility
visualizer.setVisible(false);

// Cleanup
visualizer.destroy();
```

**Integration:**

The `Babylon3DController` automatically creates and manages the slice plane visualizer:
- Created during scene setup
- Updated when project dimensions change
- Destroyed when controller is destroyed

## Coordinate System

**Our system:** Z-up, right-handed
- X = width (East/West)
- Y = depth (North/South)
- Z = height (Up/Down)

**Babylon.js:** Y-up, left-handed
- X = X (preserved)
- Y = Z (our height)
- Z = Y (our depth)

All visualizers handle this conversion internally.

## Texture Atlas & UV Mappings

The texture atlas contains multiple variants of each texture to correct BabylonJS face UV orientations.

**Atlas Structure:**
- **Normal textures** - Original 16×16 textures from texture pack
- **`_hflip`** - Horizontal flip (mirror across vertical axis)
- **`_rotated90ccw`** - 90° counter-clockwise rotation
- **`_rotated90ccw_vflip`** - 90° CCW rotation + vertical flip

**Separate UV Coordinate Arrays:**
- **`blockFaceUV`** (2D Canvas) - Uses normal textures, standard face order
- **`blockFaceUV3D`** (Babylon 3D) - Uses transformed textures, faces 2/3 swapped

**3D Face Mappings (BabylonJS CreateBox order):**
```
Face 0 (Front/+Z):  Uses _hflip variant
Face 1 (Back/-Z):   Uses normal texture
Face 2 (Right/+X):  SWAPPED to left texture, uses _rotated90ccw_vflip variant
Face 3 (Left/-X):   SWAPPED to right texture, uses _rotated90ccw_vflip variant
Face 4 (Top/+Y):    Uses _rotated90ccw variant
Face 5 (Bottom/-Y): Uses normal texture
```

**Why Transformations Are Needed:**
BabylonJS CreateBox applies different default UV orientations to each face. Without correction, textures appear rotated or flipped. The atlas pre-transforms textures so they display correctly on each face.

**2D Rendering:**
Canvas2D uses `blockFaceUV` with normal textures and no transformations. The 2D face index mapping differs from 3D, so separate UV arrays prevent 2D views from breaking when 3D mappings change.

## Adding New Visualizers

When adding new rendering components:

1. Create a new file in `src/core/rendering/`
2. Export a class that takes `Scene` and configuration in constructor
3. Implement a `destroy()` method for cleanup
4. Subscribe to relevant singleton events (ProjectManager, EditorStateManager)
5. Unsubscribe in `destroy()`
6. Integrate via composition in `Babylon3DController`

**Example template:**

```typescript
export class MyVisualizer {
  private scene: Scene;
  private boundHandler = this.handleEvent.bind(this);

  constructor(scene: Scene, config: MyConfig) {
    this.scene = scene;
    // Setup visualization
    someManager.on('event', this.boundHandler);
  }

  destroy(): void {
    someManager.off('event', this.boundHandler);
    // Dispose Babylon resources
  }

  private handleEvent(): void {
    // Update visualization
  }
}
```
