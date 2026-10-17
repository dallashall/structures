import { describe, it, expect } from 'vitest';
import { project2D, rotateModelPoint, turnBoxesAboutZ, boxCorners } from '../BoxModel';
import type { ModelBox } from '../BoxModel';

const POST: ModelBox = { from: [6, 4, 0], to: [10, 12, 16] };

const xsOf = (polygon: { x: number; y: number }[]): number[] => polygon.map(toX);
const ysOf = (polygon: { x: number; y: number }[]): number[] => polygon.map(toY);
const toX = (point: { x: number; y: number }): number => point.x;
const toY = (point: { x: number; y: number }): number => point.y;

describe('project2D', () => {
  it('maps model x and z to canvas x and inverted y in the front view', () => {
    const [polygon] = project2D([POST], 'front', 100, 200, 16);
    expect(Math.min(...xsOf(polygon))).toBe(106);
    expect(Math.max(...xsOf(polygon))).toBe(110);
    expect(Math.min(...ysOf(polygon))).toBe(200);
    expect(Math.max(...ysOf(polygon))).toBe(216);
  });

  it('maps model y to canvas x in the side views', () => {
    const [polygon] = project2D([POST], 'left', 0, 0, 32);
    expect(Math.min(...xsOf(polygon))).toBe(8);
    expect(Math.max(...xsOf(polygon))).toBe(24);
  });

  it('maps model y up to canvas y down in the top view', () => {
    const [polygon] = project2D([POST], 'top', 0, 0, 16);
    expect(Math.min(...ysOf(polygon))).toBe(4);
    expect(Math.max(...ysOf(polygon))).toBe(12);
  });

  it('returns one polygon per box', () => {
    expect(project2D([POST, POST], 'top', 0, 0, 16)).toHaveLength(2);
  });
});

describe('rotateModelPoint', () => {
  it('turns +x toward +y about z', () => {
    const turned = rotateModelPoint([1, 0, 0], { axis: 'z', angle: Math.PI / 2, origin: [0, 0, 0] });
    expect(turned[0]).toBeCloseTo(0);
    expect(turned[1]).toBeCloseTo(1);
  });

  it('turns +y toward +z about x', () => {
    const turned = rotateModelPoint([0, 1, 0], { axis: 'x', angle: Math.PI / 2, origin: [0, 0, 0] });
    expect(turned[2]).toBeCloseTo(1);
  });

  it('turns +z toward +x about y', () => {
    const turned = rotateModelPoint([0, 0, 1], { axis: 'y', angle: Math.PI / 2, origin: [0, 0, 0] });
    expect(turned[0]).toBeCloseTo(1);
  });
});

describe('turnBoxesAboutZ', () => {
  const TILTED: ModelBox = {
    from: [-1, 7, 3.5],
    to: [1, 9, 13.5],
    rotation: { axis: 'y', angle: Math.PI / 8, origin: [0, 8, 3.5] },
  };
  const turnCorner = (corner: number[]): number[] => [16 - corner[1], corner[0], corner[2]];
  const toKey = (corner: number[]): string => corner.map(roundCoordinate).join(',');
  const roundCoordinate = (value: number): number => Math.round(value * 1000) / 1000;

  it('turns a tilted box the same as turning its corners', () => {
    const [turned] = turnBoxesAboutZ([TILTED], 1);
    const expected = boxCorners(TILTED).map(turnCorner).map(toKey).sort();
    expect(boxCorners(turned).map(toKey).sort()).toEqual(expected);
  });

  it('returns to the start after four turns', () => {
    const [turned] = turnBoxesAboutZ([TILTED], 4);
    expect(boxCorners(turned).map(toKey).sort()).toEqual(boxCorners(TILTED).map(toKey).sort());
  });
});
