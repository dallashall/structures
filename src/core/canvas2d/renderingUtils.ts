// The same axis colors appear in Preview3DView and SlicePlaneVisualizer
const AXIS_COLORS = {
  X: '#e74c3c',
  Y: '#3498db',
  Z: '#27ae60',
} as const;

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
 * Blocks one or two layers behind the active layer show faintly for context. Farther ones are hidden.
 */
export function getOpacityForDistance(distance: number): number {
  if (distance === 0) return 1.0;
  if (distance === 1) return 0.3;
  if (distance === 2) return 0.1;
  return 0.0;
}

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
