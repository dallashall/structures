import type { Vector3D, Dimensions, ViewType, LayerState } from '../../types';

/**
 * CoordinateConverter - Grid cell ↔ model position for each 2D view
 *
 * The model is Z-up and right-handed: x spans dimensions.width, y spans dimensions.height, z spans dimensions.depth.
 * Grid rows count down from the top, so the axis a view shows vertically is inverted.
 * Back, right, and bottom share the front, left, and top mappings: they are not mirrored.
 */
export class CoordinateConverter {
  /**
   * The view's depth axis takes its value from activeLayers
   */
  static gridToPosition(
    gridX: number,
    gridY: number,
    viewType: ViewType,
    activeLayers: LayerState,
    dimensions: Dimensions
  ): Vector3D {
    switch (viewType) {
      case 'front':
      case 'back':
        // gridX = x, gridY = z inverted
        return {
          x: gridX,
          y: activeLayers.y,
          z: dimensions.depth - 1 - gridY,
        };
      case 'left':
      case 'right':
        // gridX = y, gridY = z inverted
        return {
          x: activeLayers.x,
          y: gridX,
          z: dimensions.depth - 1 - gridY,
        };
      case 'top':
      case 'bottom':
        // gridX = x, gridY = y inverted
        return {
          x: gridX,
          y: dimensions.height - 1 - gridY,
          z: activeLayers.z,
        };
      default:
        return { x: 0, y: 0, z: 0 };
    }
  }

  static positionToGrid(
    position: Vector3D,
    viewType: ViewType,
    dimensions: Dimensions
  ): { gridX: number; gridY: number } | null {
    switch (viewType) {
      case 'front':
      case 'back':
        return {
          gridX: position.x,
          gridY: dimensions.depth - 1 - position.z,
        };
      case 'left':
      case 'right':
        return {
          gridX: position.y,
          gridY: dimensions.depth - 1 - position.z,
        };
      case 'top':
      case 'bottom':
        return {
          gridX: position.x,
          gridY: dimensions.height - 1 - position.y,
        };
      default:
        return null;
    }
  }

}
