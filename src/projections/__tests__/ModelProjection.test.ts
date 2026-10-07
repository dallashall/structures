/**
 * ModelProjection tests - model state replayed from the event log
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { modelProjection } from '../ModelProjection';
import { startProject, append, appendToOtherProject } from '../../test/projectFixture';

const DIMENSIONS = { width: 16, height: 16, depth: 16 };

const blockAt = async (x: number, y: number, z: number) =>
  (await modelProjection.getModel()).blocks.get({ x, y, z });

describe('ModelProjection', () => {
  beforeEach(async () => {
    await startProject();
    await append('model:initialized', { dimensions: DIMENSIONS });
  });

  it('takes dimensions from model:initialized', async () => {
    const model = await modelProjection.getModel();
    expect(model.dimensions).toEqual(DIMENSIONS);
    expect(model.blocks.size).toBe(0);
  });

  it('places and removes single blocks', async () => {
    await append('model:blockPlaced', { position: { x: 5, y: 10, z: 3 }, blockType: 'stone' });
    expect((await blockAt(5, 10, 3))?.blockType).toBe('stone');

    await append('model:blockRemoved', { position: { x: 5, y: 10, z: 3 } });
    expect(await blockAt(5, 10, 3)).toBeNull();
  });

  it('places and removes batches of blocks', async () => {
    await append('model:blocksPlaced', {
      blocks: [
        { position: { x: 0, y: 0, z: 0 }, blockType: 'stone' },
        { position: { x: 1, y: 0, z: 0 }, blockType: 'dirt' },
        { position: { x: 2, y: 0, z: 0 }, blockType: 'oak_planks' },
      ],
    });
    await append('model:blocksRemoved', { positions: [{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }] });

    const model = await modelProjection.getModel();
    expect(model.blocks.size).toBe(1);
    expect(model.blocks.get({ x: 1, y: 0, z: 0 })?.blockType).toBe('dirt');
  });

  it('shifts blocks and the meta block when dimensions expand', async () => {
    await append('model:blockPlaced', { position: { x: 0, y: 0, z: 0 }, blockType: 'stone' });
    await append('model:metaBlockPlaced', { position: { x: 1, y: 1, z: 1 } });
    await append('model:dimensionExpanded', {
      newDimensions: { width: 24, height: 16, depth: 16 },
      shift: { x: 8, y: 0, z: 0 },
    });

    const model = await modelProjection.getModel();
    expect(model.dimensions).toEqual({ width: 24, height: 16, depth: 16 });
    expect(model.blocks.get({ x: 0, y: 0, z: 0 })).toBeNull();
    expect(model.blocks.get({ x: 8, y: 0, z: 0 })?.blockType).toBe('stone');
    expect(model.metaBlock.position).toEqual({ x: 9, y: 1, z: 1 });
  });

  it('drops blocks that fall outside the bounds when dimensions shrink', async () => {
    await append('model:blocksPlaced', {
      blocks: [
        { position: { x: 2, y: 0, z: 0 }, blockType: 'stone' },
        { position: { x: 12, y: 0, z: 0 }, blockType: 'dirt' },
      ],
    });
    await append('model:dimensionShrunk', {
      newDimensions: { width: 8, height: 16, depth: 16 },
      shift: { x: -2, y: 0, z: 0 },
    });

    const model = await modelProjection.getModel();
    expect(model.dimensions.width).toBe(8);
    expect(model.blocks.size).toBe(1);
    expect(model.blocks.get({ x: 0, y: 0, z: 0 })?.blockType).toBe('stone');
  });

  it('places and confirms the meta block', async () => {
    await append('model:metaBlockPlaced', { position: { x: 5, y: 5, z: 5 } });
    await append('model:metaBlockConfirmed', {});

    const { metaBlock } = await modelProjection.getModel();
    expect(metaBlock.position).toEqual({ x: 5, y: 5, z: 5 });
    expect(metaBlock.isConfirmed).toBe(true);
  });

  it('ignores events for other projects', async () => {
    await appendToOtherProject('model:blockPlaced', { position: { x: 0, y: 0, z: 0 }, blockType: 'stone' });
    await appendToOtherProject('model:initialized', { dimensions: { width: 4, height: 4, depth: 4 } });

    const model = await modelProjection.getModel();
    expect(model.dimensions).toEqual(DIMENSIONS);
    expect(model.blocks.size).toBe(0);
  });

  it('emits model:rebuilt for model events only', async () => {
    let count = 0;
    const countRebuilds = (): void => { count++; };
    modelProjection.on('model:rebuilt', countRebuilds);

    await append('model:blockPlaced', { position: { x: 0, y: 0, z: 0 }, blockType: 'stone' });
    await append('metadata:renamed', { newName: 'Renamed' });

    modelProjection.off('model:rebuilt', countRebuilds);
    expect(count).toBe(1);
  });

  it('replays the log after a reset, as when a project is reopened', async () => {
    await append('model:blocksPlaced', {
      blocks: [
        { position: { x: 0, y: 0, z: 0 }, blockType: 'stone' },
        { position: { x: 1, y: 0, z: 0 }, blockType: 'dirt' },
      ],
    });
    await append('model:metaBlockConfirmed', {});

    modelProjection.reset();
    const model = await modelProjection.getModel();

    expect(model.dimensions).toEqual(DIMENSIONS);
    expect(model.blocks.size).toBe(2);
    expect(model.metaBlock.isConfirmed).toBe(true);
  });
});
