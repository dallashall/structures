import type { AxisColors } from '../../config/colorSchemes';
import type { ClipPath } from '../shapes/BlockShape';

export function getColorForAxis(axis: string, colors: AxisColors): string {
  switch (axis) {
    case 'X':
      return colors.x;
    case 'Y':
      return colors.y;
    case 'Z':
      return colors.z;
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

/**
 * Adds each clip polygon as a subpath. The polygons share one winding, so clip() keeps their union.
 */
export function traceClipPath(ctx: CanvasRenderingContext2D, clip: ClipPath): void {
  ctx.beginPath();
  for (const polygon of clip) {
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) ctx.lineTo(polygon[i].x, polygon[i].y);
    ctx.closePath();
  }
}
