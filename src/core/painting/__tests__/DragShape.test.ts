import { describe, it, expect } from 'vitest';
import type { CellBox, PlanePoint } from '../strategies/DragShape';
import { toDragBox, rectangleCells, ellipseCells, lineCells } from '../strategies/DragShape';

const NONE = { square: false, fromCenter: false };
const SQUARE = { square: true, fromCenter: false };
const CENTER = { square: false, fromCenter: true };
const BOTH = { square: true, fromCenter: true };

const toKey = ({ u, v }: PlanePoint): string => `${u},${v}`;
const toU = ({ u }: PlanePoint): number => u;
const toV = ({ v }: PlanePoint): number => v;
const toKeySet = (cells: PlanePoint[]): Set<string> => new Set(cells.map(toKey));

const isEightConnectedRing = (cells: PlanePoint[]): boolean => {
  const keys = toKeySet(cells);
  const hasNeighbor = ({ u, v }: PlanePoint): boolean => {
    let neighbors = 0;
    for (let du = -1; du <= 1; du++) {
      for (let dv = -1; dv <= 1; dv++) {
        if ((du || dv) && keys.has(`${u + du},${v + dv}`)) neighbors += 1;
      }
    }
    return neighbors >= 2;
  };
  return cells.every(hasNeighbor);
};

describe('toDragBox', () => {
  it('spans the press and current cells in either drag direction', () => {
    expect(toDragBox({ u: 5, v: 5 }, { u: 2, v: 9 }, NONE)).toEqual({ minU: 2, maxU: 5, minV: 5, maxV: 9 });
  });

  it('squares the box to its longer side and keeps the drag direction with Shift', () => {
    expect(toDragBox({ u: 5, v: 5 }, { u: 2, v: 6 }, SQUARE)).toEqual({ minU: 2, maxU: 5, minV: 5, maxV: 8 });
  });

  it('centers the box on the press cell with Alt', () => {
    expect(toDragBox({ u: 5, v: 5 }, { u: 7, v: 4 }, CENTER)).toEqual({ minU: 3, maxU: 7, minV: 4, maxV: 6 });
  });

  it('squares and centers together', () => {
    expect(toDragBox({ u: 5, v: 5 }, { u: 7, v: 4 }, BOTH)).toEqual({ minU: 3, maxU: 7, minV: 3, maxV: 7 });
  });

  it('covers one cell for a click without movement', () => {
    expect(toDragBox({ u: 3, v: 3 }, { u: 3, v: 3 }, BOTH)).toEqual({ minU: 3, maxU: 3, minV: 3, maxV: 3 });
  });
});

describe('rectangleCells', () => {
  const box: CellBox = { minU: 0, maxU: 3, minV: 0, maxV: 2 };

  it('paints only the border as an outline', () => {
    expect(rectangleCells(box, false)).toHaveLength(10);
  });

  it('paints every cell when filled', () => {
    expect(rectangleCells(box, true)).toHaveLength(12);
  });
});

describe('ellipseCells', () => {
  it('touches all four sides of the box', () => {
    const box: CellBox = { minU: 0, maxU: 10, minV: 0, maxV: 4 };
    const cells = ellipseCells(box, false);
    const us = cells.map(toU);
    const vs = cells.map(toV);

    expect([Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)]).toEqual([0, 10, 0, 4]);
  });

  it('draws a circle that looks the same after a quarter turn in a square box', () => {
    const box: CellBox = { minU: 0, maxU: 8, minV: 0, maxV: 8 };
    const cells = toKeySet(ellipseCells(box, false));
    const rotate = ({ u, v }: PlanePoint): string => `${8 - v},${u}`;

    const isPreserved = (cell: PlanePoint): boolean => cells.has(rotate(cell));
    expect(ellipseCells(box, false).every(isPreserved)).toBe(true);
  });

  it('draws an unbroken outline for even and odd boxes', () => {
    expect(isEightConnectedRing(ellipseCells({ minU: 0, maxU: 9, minV: 0, maxV: 5 }, false))).toBe(true);
    expect(isEightConnectedRing(ellipseCells({ minU: 0, maxU: 12, minV: 0, maxV: 12 }, false))).toBe(true);
  });

  it('fills the outline and its interior', () => {
    const box: CellBox = { minU: 0, maxU: 6, minV: 0, maxV: 6 };
    const filled = toKeySet(ellipseCells(box, true));
    const isFilled = (cell: PlanePoint): boolean => filled.has(toKey(cell));

    expect(ellipseCells(box, false).every(isFilled)).toBe(true);
    expect(filled.has('3,3')).toBe(true);
  });

  it('paints one cell for a one-cell box', () => {
    expect(ellipseCells({ minU: 2, maxU: 2, minV: 2, maxV: 2 }, false)).toEqual([{ u: 2, v: 2 }]);
  });
});

describe('lineCells', () => {
  it('includes both ends and steps one cell at a time', () => {
    const cells = lineCells({ u: 0, v: 0 }, { u: 6, v: -3 });
    const isAdjacent = (cell: PlanePoint, index: number): boolean =>
      index === 0 || (Math.abs(cell.u - cells[index - 1].u) <= 1 && Math.abs(cell.v - cells[index - 1].v) <= 1);

    expect(cells[0]).toEqual({ u: 0, v: 0 });
    expect(cells[cells.length - 1]).toEqual({ u: 6, v: -3 });
    expect(cells).toHaveLength(7);
    expect(cells.every(isAdjacent)).toBe(true);
  });

  it('is a single cell when both ends match', () => {
    expect(lineCells({ u: 4, v: 4 }, { u: 4, v: 4 })).toEqual([{ u: 4, v: 4 }]);
  });
});
