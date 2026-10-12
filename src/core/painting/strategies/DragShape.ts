/**
 * DragShape - Cell geometry for drag-drawn shapes on one 2D plane
 *
 * All math runs in a plane's (u, v) cell coordinates (see ShapeUtils.to2D).
 * A box holds inclusive cell bounds, so a click without movement is a 1×1 box.
 */

export interface PlanePoint {
  u: number;
  v: number;
}

export interface CellBox {
  minU: number;
  maxU: number;
  minV: number;
  maxV: number;
}

export interface DragModifiers {
  // Equal sides: a square box, so the rectangle is a square and the ellipse a circle
  square: boolean;
  // The press point is the box center instead of a corner
  fromCenter: boolean;
}

const toSide = (delta: number, side: number): number => (delta < 0 ? -side : side);

/**
 * The box a drag from `start` to `end` covers under the held modifiers
 */
export function toDragBox(start: PlanePoint, end: PlanePoint, { square, fromCenter }: DragModifiers): CellBox {
  let du = end.u - start.u;
  let dv = end.v - start.v;

  if (square) {
    const side = Math.max(Math.abs(du), Math.abs(dv));
    du = toSide(du, side);
    dv = toSide(dv, side);
  }

  if (fromCenter) {
    return {
      minU: start.u - Math.abs(du),
      maxU: start.u + Math.abs(du),
      minV: start.v - Math.abs(dv),
      maxV: start.v + Math.abs(dv),
    };
  }

  return {
    minU: Math.min(start.u, start.u + du),
    maxU: Math.max(start.u, start.u + du),
    minV: Math.min(start.v, start.v + dv),
    maxV: Math.max(start.v, start.v + dv),
  };
}

export function rectangleCells(box: CellBox, isFilled: boolean): PlanePoint[] {
  const cells: PlanePoint[] = [];
  for (let u = box.minU; u <= box.maxU; u++) {
    for (let v = box.minV; v <= box.maxV; v++) {
      const isEdge = u === box.minU || u === box.maxU || v === box.minV || v === box.maxV;
      if (isFilled || isEdge) cells.push({ u, v });
    }
  }
  return cells;
}

/**
 * Cells of the ellipse inscribed in the box.
 *
 * A cell is inside when its center lies within the ellipse grown by half a cell on each radius.
 * Without that half cell, the extreme rows and columns hold a single cell and the shape reads as a diamond.
 * The outline keeps inside cells with an edge-adjacent outside cell, which gives an unbroken 8-connected ring.
 */
export function ellipseCells(box: CellBox, isFilled: boolean): PlanePoint[] {
  const centerU = (box.minU + box.maxU) / 2;
  const centerV = (box.minV + box.maxV) / 2;
  const radiusU = (box.maxU - box.minU) / 2 + 0.5;
  const radiusV = (box.maxV - box.minV) / 2 + 0.5;

  const isInside = (u: number, v: number): boolean => {
    const nu = (u - centerU) / radiusU;
    const nv = (v - centerV) / radiusV;
    return nu * nu + nv * nv <= 1;
  };
  const isOnEdge = (u: number, v: number): boolean =>
    !isInside(u - 1, v) || !isInside(u + 1, v) || !isInside(u, v - 1) || !isInside(u, v + 1);

  const cells: PlanePoint[] = [];
  for (let u = box.minU; u <= box.maxU; u++) {
    for (let v = box.minV; v <= box.maxV; v++) {
      if (isInside(u, v) && (isFilled || isOnEdge(u, v))) cells.push({ u, v });
    }
  }
  return cells;
}

/**
 * Bresenham line from `from` to `to`, both ends included
 */
export function lineCells(from: PlanePoint, to: PlanePoint): PlanePoint[] {
  const cells: PlanePoint[] = [];
  const du = Math.abs(to.u - from.u);
  const dv = -Math.abs(to.v - from.v);
  const stepU = from.u < to.u ? 1 : -1;
  const stepV = from.v < to.v ? 1 : -1;
  let error = du + dv;
  let { u, v } = from;

  for (;;) {
    cells.push({ u, v });
    if (u === to.u && v === to.v) return cells;
    const doubled = 2 * error;
    if (doubled >= dv) {
      error += dv;
      u += stepU;
    }
    if (doubled <= du) {
      error += du;
      v += stepV;
    }
  }
}
