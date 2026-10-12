import type { Vector3D } from '../../../types';

export interface ControlPointHandle {
  position: Vector3D;
  label: string;
  // placed = a committed click. cursor = the point that follows the pointer.
  style: 'placed' | 'cursor';
}

export interface GuideLine {
  from: Vector3D;
  to: Vector3D;
  style: 'baseline' | 'control' | 'tangent';
  // baseline = solid (anchor-to-anchor, e.g. start→end)
  // control  = dashed (anchor-to-control-point)
  // tangent  = dotted (hint lines, e.g. mirrored CP preview)
}

/**
 * Positions are model coordinates. GuideGeometryRenderer converts them to pixels.
 */
export interface GuideGeometry {
  handles: ControlPointHandle[];
  lines: GuideLine[];
}
