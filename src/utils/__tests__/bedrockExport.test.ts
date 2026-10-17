import { describe, it, expect } from 'vitest';
import type { BedrockBlockTable } from '../bedrockBlocks';
import type { BlockData, MetaBlock } from '../../types';
import { findBedrockBlock, toBedrockStructure, toJavaProperties, toPlacements } from '../bedrockExport';

const TABLE: BedrockBlockTable = {
  source: 'test',
  bedrockVersion: [1, 26, 30],
  blocks: {
    'minecraft:stone': { '': ['minecraft:stone', {}] },
    'minecraft:oak_stairs': {
      'facing=north,half=bottom,shape=straight': ['minecraft:oak_stairs', { upside_down_bit: false, weirdo_direction: 3 }],
      'facing=north,half=bottom,shape=inner_left': ['minecraft:oak_stairs', { upside_down_bit: false, weirdo_direction: 3 }],
      'facing=east,half=top,shape=straight': ['minecraft:oak_stairs', { upside_down_bit: true, weirdo_direction: 0 }],
    },
    'minecraft:oak_log': { 'axis=y': ['minecraft:oak_log', { pillar_axis: 'y' }] },
  },
};

const identity = (blockId: string): string => blockId;

describe('toJavaProperties', () => {
  it('writes wall sides and the wall post with cardinal names', () => {
    expect(toJavaProperties({ wallSides: { 'y-': 'low', 'x+': 'tall', 'y+': 'none', 'x-': 'none' }, connections: { 'z+': true } }))
      .toEqual({ north: 'low', east: 'tall', south: 'none', west: 'none', up: 'true' });
  });

  it('names axis directions the way Java does and turns values into strings', () => {
    expect(toJavaProperties({ facing: 'y-', half: 'bottom', open: true })).toEqual({ facing: 'north', half: 'bottom', open: 'true' });
  });

  it('turns absolute stair corners into Java left and right shapes', () => {
    expect(toJavaProperties({ facing: 'y-', shape: 'inner_y-_x-' }).shape).toBe('inner_left');
    expect(toJavaProperties({ facing: 'y-', shape: 'outer_y-_x+' }).shape).toBe('outer_right');
    expect(toJavaProperties({ facing: 'y-', shape: 'straight_y-' }).shape).toBe('straight');
  });
});

describe('findBedrockBlock', () => {
  it('finds the exact Java state', () => {
    expect(findBedrockBlock(TABLE, 'minecraft:oak_stairs', { facing: 'east', half: 'top', shape: 'straight' }))
      .toEqual(['minecraft:oak_stairs', { upside_down_bit: true, weirdo_direction: 0 }]);
  });

  it('fills properties the app does not track with the first state that agrees', () => {
    expect(findBedrockBlock(TABLE, 'minecraft:oak_stairs', { facing: 'north' }))
      .toEqual(['minecraft:oak_stairs', { upside_down_bit: false, weirdo_direction: 3 }]);
    expect(findBedrockBlock(TABLE, 'minecraft:oak_log', {})).toEqual(['minecraft:oak_log', { pillar_axis: 'y' }]);
  });

  it('returns null for blocks Bedrock does not have', () => {
    expect(findBedrockBlock(TABLE, 'minecraft:copper_sink', {})).toBeNull();
  });
});

describe('toPlacements', () => {
  const size = { x: 5, y: 3, z: 4 };
  const anchor = { x: 1, y: 0, z: 3 };

  it('needs no turn when the player faces the meta block arrow', () => {
    expect(toPlacements(anchor, size, 'y-').north).toEqual({ rotation: 'None', offset: { x: -1, y: 0, z: -3 } });
  });

  it('turns clockwise as the player turns right, keeping the anchor under the player', () => {
    const placements = toPlacements(anchor, size, 'y-');
    expect(placements.east).toEqual({ rotation: 'Rotate90', offset: { x: 0, y: 0, z: -1 } });
    expect(placements.south).toEqual({ rotation: 'Rotate180', offset: { x: -3, y: 0, z: 0 } });
    expect(placements.west).toEqual({ rotation: 'Rotate270', offset: { x: -3, y: 0, z: -3 } });
  });

  it('counts turns from the meta block facing', () => {
    expect(toPlacements(anchor, size, 'x+').east.rotation).toBe('None');
    expect(toPlacements(anchor, size, 'x+').north.rotation).toBe('Rotate270');
  });
});

describe('toBedrockStructure', () => {
  const metaBlock: MetaBlock = { position: { x: 1, y: 2, z: 0 }, direction: 'y-' };
  const blocks: BlockData[] = [
    { position: { x: 0, y: 2, z: 1 }, blockType: 'minecraft:stone' },
    { position: { x: 1, y: 2, z: 0 }, blockType: 'minecraft:stone' },
    { position: { x: 2, y: 0, z: 0 }, blockType: 'minecraft:copper_sink' },
    { position: { x: 2, y: 1, z: 0 }, blockType: 'minecraft:copper_sink' },
  ];
  const structure = toBedrockStructure({ width: 3, height: 4, depth: 2 }, metaBlock, blocks, TABLE, identity);

  it('sizes the structure Y-up and swaps the app Y and Z axes', () => {
    expect(structure.size).toEqual({ x: 3, y: 2, z: 4 });
    expect(structure.cells[0]).toEqual({ x: 0, y: 1, z: 2, block: { name: 'minecraft:stone', states: {} } });
  });

  it('clears the anchor cell to air in place of any painted block', () => {
    const isAnchorCell = (cell: { x: number; y: number; z: number }): boolean => cell.x === 1 && cell.y === 0 && cell.z === 2;
    const anchorCells = structure.cells.filter(isAnchorCell);
    expect(anchorCells).toHaveLength(1);
    expect(anchorCells[0].block.name).toBe('minecraft:air');
  });

  it('counts blocks it cannot export', () => {
    expect(structure.skipped.get('minecraft:copper_sink')).toBe(2);
  });
});
