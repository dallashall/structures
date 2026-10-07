/**
 * BlockProjection tests - block index and block state replayed from the event log
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { blockProjection } from '../BlockProjection';
import { startProject, append, appendToOtherProject } from '../../test/projectFixture';

import type { BlockData } from '../../types';

const toType = (block: BlockData): string => block.blockType;
const typesAtLayer = async (axis: 'x' | 'y' | 'z', layer: number): Promise<string[]> =>
  (await blockProjection.getBlocksAtLayer(axis, layer)).map(toType).sort();

describe('BlockProjection', () => {
  beforeEach(async () => {
    await startProject();
  });

  it('places and removes single blocks', async () => {
    await append('model:blockPlaced', { position: { x: 5, y: 10, z: 3 }, blockType: 'stone' });
    expect((await blockProjection.getBlock({ x: 5, y: 10, z: 3 }))?.blockType).toBe('stone');

    await append('model:blockRemoved', { position: { x: 5, y: 10, z: 3 } });
    expect(await blockProjection.getBlock({ x: 5, y: 10, z: 3 })).toBeNull();
  });

  it('places and removes batches of blocks', async () => {
    await append('model:blocksPlaced', {
      blocks: [
        { position: { x: 0, y: 0, z: 0 }, blockType: 'stone' },
        { position: { x: 1, y: 0, z: 0 }, blockType: 'dirt' },
      ],
    });
    await append('model:blocksRemoved', { positions: [{ x: 0, y: 0, z: 0 }] });

    const blocks = await blockProjection.getBlocks();
    expect(blocks.size).toBe(1);
    expect(blocks.get({ x: 1, y: 0, z: 0 })?.blockType).toBe('dirt');
  });

  it('replaces the block at an occupied position', async () => {
    await append('model:blockPlaced', { position: { x: 0, y: 0, z: 0 }, blockType: 'stone' });
    await append('model:blockPlaced', { position: { x: 0, y: 0, z: 0 }, blockType: 'dirt' });

    const blocks = await blockProjection.getBlocks();
    expect(blocks.size).toBe(1);
    expect(blocks.get({ x: 0, y: 0, z: 0 })?.blockType).toBe('dirt');
  });

  it('indexes blocks by layer on every axis', async () => {
    await append('model:blocksPlaced', {
      blocks: [
        { position: { x: 0, y: 0, z: 0 }, blockType: 'stone' },
        { position: { x: 1, y: 0, z: 0 }, blockType: 'dirt' },
        { position: { x: 0, y: 1, z: 0 }, blockType: 'oak_planks' },
        { position: { x: 0, y: 0, z: 1 }, blockType: 'glass' },
      ],
    });

    expect(await typesAtLayer('x', 0)).toEqual(['glass', 'oak_planks', 'stone']);
    expect(await typesAtLayer('x', 1)).toEqual(['dirt']);
    expect(await typesAtLayer('y', 0)).toEqual(['dirt', 'glass', 'stone']);
    expect(await typesAtLayer('y', 1)).toEqual(['oak_planks']);
    expect(await typesAtLayer('z', 0)).toEqual(['dirt', 'oak_planks', 'stone']);
    expect(await typesAtLayer('z', 1)).toEqual(['glass']);
  });

  it('keeps block state and converts legacy facing names to axis directions', async () => {
    await append('model:blockPlaced', {
      position: { x: 0, y: 0, z: 0 },
      blockType: 'oak_stairs',
      blockState: { facing: 'front', half: 'top' },
    });
    await append('model:blocksPlaced', {
      blocks: [{ position: { x: 1, y: 0, z: 0 }, blockType: 'oak_stairs', blockState: { facing: 'x+' } }],
    });

    expect((await blockProjection.getBlock({ x: 0, y: 0, z: 0 }))?.blockState).toEqual({ facing: 'y-', half: 'top' });
    expect((await blockProjection.getBlock({ x: 1, y: 0, z: 0 }))?.blockState).toEqual({ facing: 'x+' });
  });

  it('ignores events for other projects', async () => {
    await appendToOtherProject('model:blockPlaced', { position: { x: 0, y: 0, z: 0 }, blockType: 'stone' });

    expect((await blockProjection.getBlocks()).size).toBe(0);
  });

  it('emits blocks:rebuilt for block events only', async () => {
    let count = 0;
    const countRebuilds = (): void => { count++; };
    blockProjection.on('blocks:rebuilt', countRebuilds);

    await append('model:blockPlaced', { position: { x: 0, y: 0, z: 0 }, blockType: 'stone' });
    await append('model:metaBlockConfirmed', {});
    await append('metadata:renamed', { newName: 'Renamed' });

    blockProjection.off('blocks:rebuilt', countRebuilds);
    expect(count).toBe(1);
  });

  it('replays the log after a reset, as when a project is reopened', async () => {
    await append('model:blocksPlaced', {
      blocks: [
        { position: { x: 0, y: 0, z: 0 }, blockType: 'stone' },
        { position: { x: 1, y: 0, z: 0 }, blockType: 'dirt' },
      ],
    });
    await append('model:blockRemoved', { position: { x: 0, y: 0, z: 0 } });

    blockProjection.reset();
    const blocks = await blockProjection.getBlocks();

    expect(blocks.size).toBe(1);
    expect(blocks.get({ x: 1, y: 0, z: 0 })?.blockType).toBe('dirt');
  });
});
