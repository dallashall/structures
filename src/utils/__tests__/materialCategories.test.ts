import { describe, it, expect } from 'vitest';
import { filterMaterials } from '../materialCategories';

import type { Block } from '../../types';

const block = (name: string) => ({ id: `minecraft:${name}`, name }) as Block;
const BLOCKS = [block('Stone Bricks'), block('Grass Block'), block('White Wool'), block('Oak Planks')];
const toName = (b: Block): string => b.name;

describe('filterMaterials', () => {
  it('returns every block for the All category and an empty query', () => {
    expect(filterMaterials(BLOCKS, '', 0).map(toName)).toEqual(BLOCKS.map(toName));
  });

  it('keeps only blocks in the selected category', () => {
    expect(filterMaterials(BLOCKS, '', 1).map(toName)).toEqual(['Stone Bricks']);
    expect(filterMaterials(BLOCKS, '', 3).map(toName)).toEqual(['White Wool']);
  });

  it('matches the query case-insensitively within the category', () => {
    expect(filterMaterials(BLOCKS, 'GRASS', 0).map(toName)).toEqual(['Grass Block']);
    expect(filterMaterials(BLOCKS, 'grass', 1)).toEqual([]);
  });
});
