/**
 * Rendering utilities for Canvas2D
 *
 * Pure functions for rendering calculations and configuration.
 * No dependencies on viewport or project state.
 */

/**
 * Axis color constants
 */
const AXIS_COLORS = {
  X: '#e74c3c', // Red
  Y: '#3498db', // Blue
  Z: '#27ae60', // Green
} as const;

/**
 * Get color for a given axis
 */
export function getColorForAxis(axis: string): string {
  switch (axis) {
    case 'X':
      return AXIS_COLORS.X;
    case 'Y':
      return AXIS_COLORS.Y;
    case 'Z':
      return AXIS_COLORS.Z;
    default:
      return '#000000';
  }
}

/**
 * Calculate opacity based on distance from active layer
 *
 * Used for rendering blocks at different depths:
 * - Distance 0 (active layer): 100% opaque
 * - Distance 1: 30% opaque
 * - Distance 2: 10% opaque
 * - Distance 3+: invisible (0% opaque)
 */
export function getOpacityForDistance(distance: number): number {
  if (distance === 0) return 1.0;
  if (distance === 1) return 0.3;
  if (distance === 2) return 0.1;
  return 0.0;
}

/**
 * Get layer value for a given axis
 */
export function getLayerForAxis(
  axis: string,
  activeLayers: { x: number; y: number; z: number }
): number {
  switch (axis) {
    case 'X':
      return activeLayers.x;
    case 'Y':
      return activeLayers.y;
    case 'Z':
      return activeLayers.z;
    default:
      return 0;
  }
}
