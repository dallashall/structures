import type { Vector3D, Dimensions, ViewType, LayerState } from '../../types';

/**
 * CoordinateConverter - Shared coordinate transformation utilities
 *
 * Handles conversion between 2D grid coordinates and 3D world positions.
 * Extracted from Canvas2D to avoid duplication and enable reuse.
 *
 * Coordinate System:
 * - Our system: Z-up, right-handed (X=width, Y=height, Z=depth)
 * - Grid system varies by view type (what you see on 2D canvas)
 */
export class CoordinateConverter {
  /**
   * Convert 2D grid coordinates to 3D world position
   *
   * @param gridX - Horizontal grid coordinate
   * @param gridY - Vertical grid coordinate
   * @param viewType - Current view (front, back, left, right, top, bottom)
   * @param activeLayers - Current active layers for hidden dimension
   * @param dimensions - Project dimensions
   * @returns 3D world position
   */
  static gridToPosition(
    gridX: number,
    gridY: number,
    viewType: ViewType,
    activeLayers: LayerState,
    dimensions: Dimensions
  ): Vector3D {
    // Z-up coordinate system: X=East/West (width), Y=North/South (height), Z=Up/Down (depth)
    switch (viewType) {
      case 'front':
      case 'back':
        // Looking North/South: gridX=X (width), gridY=Z (depth, inverted)
        return {
          x: gridX,
          y: activeLayers.y,
          z: dimensions.depth - 1 - gridY,
        };
      case 'left':
      case 'right':
        // Looking East/West: gridX=Y (height), gridY=Z (depth, inverted)
        return {
          x: activeLayers.x,
          y: gridX,
          z: dimensions.depth - 1 - gridY,
        };
      case 'top':
      case 'bottom':
        // Looking Down/Up: gridX=X (width), gridY=Y (height, inverted)
        return {
          x: gridX,
          y: dimensions.height - 1 - gridY,
          z: activeLayers.z,
        };
      default:
        return { x: 0, y: 0, z: 0 };
    }
  }

  /**
   * Convert 3D world position to 2D grid coordinates
   *
   * @param position - 3D world position
   * @param viewType - Current view
   * @param dimensions - Project dimensions
   * @returns Grid coordinates or null if position not visible in this view
   */
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
