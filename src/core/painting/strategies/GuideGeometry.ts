import type { Vector3D } from '../../../types';

/**
 * ControlPointHandle - A placed or prospective control point
 */
export interface ControlPointHandle {
  position: Vector3D;
  label: string;                   // e.g., "Base Start", "Apex", "CP1"
  style: 'placed' | 'cursor';     // placed = committed click, cursor = follows mouse
}

/**
 * GuideLine - A line segment connecting control points
 */
export interface GuideLine {
  from: Vector3D;
  to: Vector3D;
  style: 'baseline' | 'control' | 'tangent';
  // baseline = solid (anchor-to-anchor, e.g. start→end)
  // control  = dashed (anchor-to-control-point)
  // tangent  = dotted (hint lines, e.g. mirrored CP preview)
}

/**
 * GuideGeometry - Complete set of visual guides for a multi-click strategy
 *
 * Returned by strategies that implement GuideGeometryProvider.
 * All positions are in 3D world space; the renderer converts to pixel space.
 */
export interface GuideGeometry {
  handles: ControlPointHandle[];
  lines: GuideLine[];
}
