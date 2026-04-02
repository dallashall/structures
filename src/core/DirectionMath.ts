/**
 * DirectionMath - Pure functions for axis-based direction math
 *
 * Single source of truth for all direction utilities.
 * Works in the app's universal coordinate system:
 *   X = width, Y = depth, Z = height
 *
 * Rotation is around Z (vertical axis), viewed from above (+Z):
 *   CW on screen: y+ → x+ → y- → x- → y+
 */

import type { Vector3D, AxisDirection, HorizontalDirection } from '../types';

/**
 * Convert an axis direction to its position offset vector.
 * 'x+' → {x:1, y:0, z:0}, 'y-' → {x:0, y:-1, z:0}, etc.
 */
export function directionToOffset(dir: AxisDirection): Vector3D {
  const axis = dir[0] as 'x' | 'y' | 'z';
  const sign = dir[1] === '+' ? 1 : -1;
  return {
    x: axis === 'x' ? sign : 0,
    y: axis === 'y' ? sign : 0,
    z: axis === 'z' ? sign : 0,
  };
}

/** Flip the sign of a direction. x+ → x-, y- → y+, etc. */
export function oppositeDirection(dir: AxisDirection): AxisDirection {
  const axis = dir[0];
  const sign = dir[1] === '+' ? '-' : '+';
  return `${axis}${sign}` as AxisDirection;
}

/**
 * Rotate 90° to the character's left.
 * If a character faces dir and turns left, they now face the returned direction.
 *
 * Cycle: x+ → y- → x- → y+ → x+
 * (This is CW when viewed from +Z looking down.)
 */
export function rotateLeft(dir: HorizontalDirection): HorizontalDirection {
  switch (dir) {
    case 'x+': return 'y-';
    case 'y-': return 'x-';
    case 'x-': return 'y+';
    case 'y+': return 'x+';
  }
}

/**
 * Rotate 90° to the character's right.
 * If a character faces dir and turns right, they now face the returned direction.
 *
 * Cycle: x+ → y+ → x- → y- → x+
 * (This is CCW when viewed from +Z looking down.)
 */
export function rotateRight(dir: HorizontalDirection): HorizontalDirection {
  switch (dir) {
    case 'x+': return 'y+';
    case 'y+': return 'x-';
    case 'x-': return 'y-';
    case 'y-': return 'x+';
  }
}

/**
 * Convert facing direction to Y-axis rotation in radians for BabylonJS.
 * Default mesh orientation faces y+ (+Z in Babylon = +Y in our system).
 */
export function directionToYRotation(dir: AxisDirection): number {
  switch (dir) {
    case 'y+': return 0;
    case 'x-': return Math.PI / 2;
    case 'y-': return Math.PI;
    case 'x+': return -Math.PI / 2;
    default: return 0;
  }
}

/** All 4 horizontal neighbor offsets */
export const HORIZONTAL_OFFSETS: Vector3D[] = [
  { x: 1, y: 0, z: 0 },   // x+
  { x: -1, y: 0, z: 0 },  // x-
  { x: 0, y: 1, z: 0 },   // y+
  { x: 0, y: -1, z: 0 },  // y-
];

/** All 6 axis-aligned neighbor offsets */
export const ALL_OFFSETS: Vector3D[] = [
  ...HORIZONTAL_OFFSETS,
  { x: 0, y: 0, z: 1 },   // z+
  { x: 0, y: 0, z: -1 },  // z-
];

/** Add an offset to a position. */
export function addOffset(pos: Vector3D, offset: Vector3D): Vector3D {
  return { x: pos.x + offset.x, y: pos.y + offset.y, z: pos.z + offset.z };
}
