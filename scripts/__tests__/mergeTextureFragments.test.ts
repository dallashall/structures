import { describe, it, expect } from 'vitest';
import { mergeTextureFragments } from '../mergeTextureFragments';

import type { CanonicalBlocks } from '../../src/types/canonical';

const cube = (texture: string) => ({
  displayName: texture,
  category: 'misc',
  color: '#808080',
  textures: { all: texture },
  hasBlockState: false,
  isCube: true,
  isTransparent: false,
});

const catalog = (...names: string[]): CanonicalBlocks => {
  const blocks: CanonicalBlocks = {};
  for (const name of names) blocks[`minecraft:${name}`] = cube(name);
  return blocks;
};

describe('mergeTextureFragments', () => {
  it('hides face, state, and counter textures of an existing block', () => {
    const { blocks, hidden } = mergeTextureFragments(catalog('target', 'target11', 'stone', 'stone_side', 'furnace_front_on', 'furnace'));

    expect(hidden).toEqual(['furnace_front_on', 'stone_side', 'target11']);
    expect(blocks['minecraft:stone'].hidden).toBeUndefined();
    expect(blocks['minecraft:target11'].hidden).toBe(true);
  });

  it('adds a block built from its faces when only the faces exist', () => {
    const { blocks, merged } = mergeTextureFragments(catalog('barrel_top', 'barrel_side', 'barrel_bottom'));

    expect(merged).toEqual(['barrel']);
    expect(blocks['minecraft:barrel'].textures).toEqual({ top: 'barrel_top', bottom: 'barrel_bottom', side: 'barrel_side' });
    expect(blocks['minecraft:barrel_top'].hidden).toBe(true);
  });

  it('uses the end texture for a missing top and bottom, and the front texture for north', () => {
    const { blocks } = mergeTextureFragments(catalog('observer_side', 'observer_end', 'observer_front'));

    expect(blocks['minecraft:observer'].textures).toEqual({
      top: 'observer_end',
      bottom: 'observer_end',
      side: 'observer_side',
      north: 'observer_front',
    });
  });

  it('builds no block for a group without a side face', () => {
    const { blocks, merged } = mergeTextureFragments(catalog('wheat_stage0', 'wheat_stage1'));

    expect(merged).toEqual([]);
    expect(blocks['minecraft:wheat']).toBeUndefined();
    expect(blocks['minecraft:wheat_stage0'].hidden).toBe(true);
  });

  it('skips groups whose block exists under another name', () => {
    const { blocks, merged } = mergeTextureFragments(catalog('bee_hive_side', 'bee_hive_top', 'dried_kelp_side', 'dried_kelp_top'));

    expect(merged).toEqual(['dried_kelp_block']);
    expect(blocks['minecraft:bee_hive']).toBeUndefined();
  });
});
