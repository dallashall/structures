import { describe, it, expect } from 'vitest';
import type { BedrockBlockTable, BedrockTableEntry } from '../bedrockBlocks';
import type { BlockData } from '../../types';
import { rotateBlockState, toAnimatedBuild } from '../animatedBuild';
import { findBedrockBlock } from '../bedrockExport';

const TABLE: BedrockBlockTable = {
  source: 'test',
  bedrockVersion: [1, 26, 30],
  blocks: {
    'minecraft:stone': { '': ['minecraft:stone', {}] },
    'minecraft:oak_stairs': {
      'facing=north,half=bottom,shape=straight': ['minecraft:oak_stairs', { weirdo_direction: 3 }],
      'facing=east,half=bottom,shape=straight': ['minecraft:oak_stairs', { weirdo_direction: 0 }],
      'facing=south,half=bottom,shape=straight': ['minecraft:oak_stairs', { weirdo_direction: 2 }],
      'facing=west,half=bottom,shape=straight': ['minecraft:oak_stairs', { weirdo_direction: 1 }],
    },
  },
};

const findEntry = (blockId: string, properties: Record<string, string>): BedrockTableEntry | null => findBedrockBlock(TABLE, blockId, properties);
const gray = (): [number, number, number] => [0.5, 0.5, 0.5];

describe('rotateBlockState', () => {
  it('turns facings and stair corners clockwise seen from above', () => {
    expect(rotateBlockState({ facing: 'y-' }, 1)).toEqual({ facing: 'x+' });
    expect(rotateBlockState({ facing: 'y-', shape: 'inner_y-_x+' }, 2)).toEqual({ facing: 'y+', shape: 'inner_y+_x-' });
    expect(rotateBlockState({ facing: 'z+' }, 1)).toEqual({ facing: 'z+' });
  });

  it('swaps horizontal log axes on quarter turns and turns sign rotation', () => {
    expect(rotateBlockState({ axis: 'x' }, 1)).toEqual({ axis: 'y' });
    expect(rotateBlockState({ axis: 'z' }, 3)).toEqual({ axis: 'z' });
    expect(rotateBlockState({ rotation: 14 }, 1)).toEqual({ rotation: 2 });
  });

  it('turns wall sides and connections', () => {
    expect(rotateBlockState({ connections: { 'y-': true, 'x-': false } }, 1)).toEqual({ connections: { 'x+': true, 'y-': false } });
    expect(rotateBlockState({ north: 'low' } as never, 1)).toEqual({ east: 'low' });
  });
});

describe('toAnimatedBuild', () => {
  const metaBlock = { position: { x: 2, y: 3, z: 0 }, direction: 'y-' as const };
  const blocks: BlockData[] = [
    { position: { x: 3, y: 1, z: 2 }, blockType: 'minecraft:stone' },
    { position: { x: 2, y: 3, z: 0 }, blockType: 'minecraft:stone' },
    { position: { x: 0, y: 3, z: 0 }, blockType: 'minecraft:oak_stairs', blockState: { facing: 'y-', half: 'bottom', shape: 'straight_y-' } },
    { position: { x: 1, y: 1, z: 0 }, blockType: 'minecraft:copper_sink' },
  ];
  const build = toAnimatedBuild(metaBlock, blocks, findEntry, gray);

  it('stores offsets from the meta block in Bedrock axes and leaves out its own cell', () => {
    expect(build.cells).toEqual([1, 2, -2, 0, -2, 0, 0, 1]);
  });

  it('stores each palette entry turned four ways', () => {
    const toDirection = ([, states]: [string, Record<string, unknown>]): unknown => states.weirdo_direction;
    expect(build.palette[1].rotations.map(toDirection)).toEqual([3, 0, 2, 1]);
  });

  it('counts blocks Bedrock does not have', () => {
    expect(build.skipped.get('minecraft:copper_sink')).toBe(1);
  });
});
