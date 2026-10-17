import { describe, it, expect } from 'vitest';
import { shapeCatalog } from '../ShapeCatalog';
import { toJavaProperties } from '../../../utils/bedrockExport';
import type { BlockStateProperties } from '../../../types';

// The catalog's default states hold strings and compass names
const catalogState = (state: Record<string, string>): BlockStateProperties => state as unknown as BlockStateProperties;

const campfire = shapeCatalog.resolve('minecraft:campfire');

describe('CampfireShape', () => {
  it('covers both campfires and none of their texture entries', () => {
    expect(campfire.shapeId).toBe('campfire');
    expect(shapeCatalog.resolve('minecraft:soul_campfire').shapeId).toBe('campfire');
    expect(shapeCatalog.resolve('minecraft:campfire_log').shapeId).toBe('cube');
  });

  it('draws the fire planes only when lit', () => {
    expect(campfire.get2DClip({ lit: true }, 'top', 0, 0, 16)).toHaveLength(7);
    expect(campfire.get2DClip(catalogState({ lit: 'false' }), 'top', 0, 0, 16)).toHaveLength(5);
  });

  it('keys the base mesh by facing and lit state', () => {
    expect(campfire.getGeometryKey(catalogState({ facing: 'east', lit: 'true' }))).toBe('campfire_x+_lit');
    expect(campfire.getGeometryKey({ facing: 'y-', lit: false })).toBe('campfire_y-_unlit');
  });

  it('turns from the south-facing vanilla model', () => {
    expect(campfire.getRotation(catalogState({ facing: 'south' }))).toBe(0);
    expect(campfire.getRotation({ facing: 'y-' })).toBeCloseTo(Math.PI);
  });

  it('lays the logs across the bottom of the cell', () => {
    const toY = (point: { x: number; y: number }): number => point.y;
    const toTop = (polygon: { x: number; y: number }[]): number => Math.min(...polygon.map(toY));
    const front = campfire.get2DClip({ lit: false, facing: 'y+' }, 'front', 0, 0, 16)!;
    const tops = front.map(toTop);
    // Canvas y grows downward, so the highest log top (model z 7) sits at canvas y 9
    expect(Math.min(...tops)).toBeCloseTo(9);
  });

  it('exports facing and lit as Java properties', () => {
    expect(toJavaProperties({ facing: 'x+', lit: true })).toMatchObject({ facing: 'east', lit: 'true' });
  });
});
