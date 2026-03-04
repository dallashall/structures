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
