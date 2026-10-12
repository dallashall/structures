/**
 * DirectionMath - Axis direction helpers. Z is vertical, and rotation turns around Z.
 * Viewed from above (+Z), clockwise runs y+ → x+ → y- → x- → y+.
 */

import type { Vector3D, AxisDirection, HorizontalDirection } from '../types';

export function directionToOffset(dir: AxisDirection): Vector3D {
  const axis = dir[0] as 'x' | 'y' | 'z';
  const sign = dir[1] === '+' ? 1 : -1;
  return {
    x: axis === 'x' ? sign : 0,
    y: axis === 'y' ? sign : 0,
    z: axis === 'z' ? sign : 0,
  };
}

export function oppositeDirection(dir: AxisDirection): AxisDirection {
  const axis = dir[0];
  const sign = dir[1] === '+' ? '-' : '+';
  return `${axis}${sign}` as AxisDirection;
}

/**
 * The direction a character facing `dir` faces after turning right: x+ → y+ → x- → y- → x+.
 */
export function rotateRight(dir: HorizontalDirection): HorizontalDirection {
  switch (dir) {
    case 'x+': return 'y+';
    case 'y+': return 'x-';
    case 'x-': return 'y-';
    case 'y-': return 'x+';
  }
}

export function addOffset(pos: Vector3D, offset: Vector3D): Vector3D {
  return { x: pos.x + offset.x, y: pos.y + offset.y, z: pos.z + offset.z };
}
