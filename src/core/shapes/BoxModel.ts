/**
 * BoxModel - Block geometry as a list of boxes, like Minecraft block model elements
 *
 * Coordinates are model axes (x and y horizontal, z up) in 1/16 units, so 0..16 spans the cell.
 * GeometryFactory builds the 3D mesh from the same boxes that project2D outlines for the 2D views.
 */

import type { ClipPath, ClipPolygon } from './BlockShape';
import type { ViewType } from '../../types';

export type Vec3 = [number, number, number];

export interface BoxRotation {
  axis: 'x' | 'y' | 'z';
  // Radians, counterclockwise when looking from the positive end of the axis toward the origin
  angle: number;
  origin: Vec3;
}

export type BoxFace = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

/**
 * One face's texture, as in a Minecraft model element face
 */
export interface BoxFaceTexture {
  // The block ID whose untransformed atlas texture the face shows
  texture: string;
  // u0, v0, u1, v1 in texture pixels, with v growing downward. u0 > u1 mirrors the region.
  uv: [number, number, number, number];
  // Clockwise turn of the texture on the face
  rotation?: 0 | 90 | 180 | 270;
}

export interface ModelBox {
  from: Vec3;
  to: Vec3;
  // Applied after UVs are set, so a turned box keeps the texture region of its unturned position
  rotation?: BoxRotation;
  // Moves the texture region: faces show the texture as if the box sat this far away
  uvShift?: Vec3;
  // Each listed face shows its own texture region, and unlisted faces are not drawn.
  // Without it, every face shows the block's face textures projected from the full cube.
  faces?: Partial<Record<BoxFace, BoxFaceTexture>>;
}

/**
 * Turns a point about the rotation's axis. Model axes are right-handed.
 */
export function rotateModelPoint(point: Vec3, rotation: BoxRotation): Vec3 {
  const cos = Math.cos(rotation.angle);
  const sin = Math.sin(rotation.angle);
  const [ox, oy, oz] = rotation.origin;
  const x = point[0] - ox;
  const y = point[1] - oy;
  const z = point[2] - oz;

  switch (rotation.axis) {
    case 'x':
      return [x + ox, y * cos - z * sin + oy, y * sin + z * cos + oz];
    case 'y':
      return [z * sin + x * cos + ox, y + oy, z * cos - x * sin + oz];
    case 'z':
      return [x * cos - y * sin + ox, x * sin + y * cos + oy, z + oz];
  }
}

/**
 * The eight corners of a box, turned by its rotation
 */
export function boxCorners(box: ModelBox): Vec3[] {
  const corners: Vec3[] = [];
  for (const x of [box.from[0], box.to[0]]) {
    for (const y of [box.from[1], box.to[1]]) {
      for (const z of [box.from[2], box.to[2]]) {
        corners.push([x, y, z]);
      }
    }
  }
  if (!box.rotation) return corners;
  const rotation = box.rotation;
  const turn = (corner: Vec3): Vec3 => rotateModelPoint(corner, rotation);
  return corners.map(turn);
}

// The model axes each view shows as canvas horizontal and canvas vertical (up). See CoordinateConverter.
const VIEW_AXES: Record<ViewType, [number, number]> = {
  front: [0, 2],
  back: [0, 2],
  left: [1, 2],
  right: [1, 2],
  top: [0, 1],
  bottom: [0, 1],
};

/**
 * The silhouette of the boxes in one view, as one convex polygon per box in canvas pixels.
 * Canvas y grows downward, so model 16 maps to py.
 */
export function project2D(
  boxes: ModelBox[],
  viewType: ViewType,
  px: number,
  py: number,
  cellSize: number,
): ClipPath {
  const [hAxis, vAxis] = VIEW_AXES[viewType];
  const scale = cellSize / 16;
  const toCanvas = (corner: Vec3): { x: number; y: number } => ({
    x: px + corner[hAxis] * scale,
    y: py + (16 - corner[vAxis]) * scale,
  });
  const projectBox = (box: ModelBox): ClipPolygon => convexHull(boxCorners(box).map(toCanvas));
  return boxes.map(projectBox);
}

const byXThenY = (a: { x: number; y: number }, b: { x: number; y: number }): number => a.x - b.x || a.y - b.y;

/**
 * Monotone chain hull. Every hull winds the same way, so overlapping hulls clip as a union under the nonzero rule.
 */
function convexHull(points: { x: number; y: number }[]): ClipPolygon {
  const sorted = [...points].sort(byXThenY);
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: ClipPolygon = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: ClipPolygon = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const point = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// One counterclockwise quarter turn about the cell's vertical center line, seen from above
const turnPoint = (point: Vec3): Vec3 => [16 - point[1], point[0], point[2]];
const turnVector = (vector: Vec3): Vec3 => [-vector[1], vector[0], vector[2]];

function turnRotation(rotation: BoxRotation): BoxRotation {
  const origin = turnPoint(rotation.origin);
  if (rotation.axis === 'x') return { axis: 'y', angle: rotation.angle, origin };
  // +y turns to -x, and a turn about -x is the opposite turn about +x
  if (rotation.axis === 'y') return { axis: 'x', angle: -rotation.angle, origin };
  return { ...rotation, origin };
}

function turnBoxOnce(box: ModelBox): ModelBox {
  const a = turnPoint(box.from);
  const b = turnPoint(box.to);
  return {
    from: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])],
    to: [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])],
    ...(box.rotation ? { rotation: turnRotation(box.rotation) } : {}),
    ...(box.uvShift ? { uvShift: turnVector(box.uvShift) } : {}),
  };
}

/**
 * Turns boxes counterclockwise about the cell's vertical center line, seen from above, by quarter turns.
 * One turn takes a box facing x+ to y+. Face textures do not carry over, so a box with faces turns only for its outline.
 */
export function turnBoxesAboutZ(boxes: ModelBox[], quarterTurns: number): ModelBox[] {
  let turned = boxes;
  for (let i = 0; i < ((quarterTurns % 4) + 4) % 4; i++) turned = turned.map(turnBoxOnce);
  return turned;
}
