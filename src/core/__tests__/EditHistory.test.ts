/**
 * EditHistory tests - undo and redo revert whole actions through the projections
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { editHistory, type HistoryStepNotice } from '../EditHistory';
import { eventLog } from '../EventLog';
import { modelProjection } from '../../projections/ModelProjection';
import { blockProjection } from '../../projections/BlockProjection';
import { startProject, append, appendAction, paintStone, PROJECT_ID } from '../../test/projectFixture';
import { toolRegistry } from '../tools/ToolRegistry';

const DIMENSIONS = { width: 16, height: 16, depth: 16 };

const stoneXs = async (): Promise<number[]> => {
  const toX = (block: { position: { x: number } }): number => block.position.x;
  const byNumber = (a: number, b: number): number => a - b;
  return (await blockProjection.getBlocks()).toArray().map(toX).sort(byNumber);
};

const nextNotice = (name: string): Promise<HistoryStepNotice> =>
  new Promise((resolve) => {
    const receive = (notice: HistoryStepNotice): void => {
      editHistory.off(name, receive);
      resolve(notice);
    };
    editHistory.on(name, receive);
  });

describe('EditHistory', () => {
  beforeEach(async () => {
    await startProject();
    await append('model:initialized', { dimensions: DIMENSIONS });
  });

  it('has nothing to undo or redo in an empty project', () => {
    expect(editHistory.canUndo()).toBe(false);
    expect(editHistory.canRedo()).toBe(false);
  });

  it('undoes the newest action and redoes it', async () => {
    await paintStone(0);
    await paintStone(1, 2);
    expect(await stoneXs()).toEqual([0, 1, 2]);

    await editHistory.undo();
    expect(await stoneXs()).toEqual([0]);
    expect(editHistory.canRedo()).toBe(true);

    await editHistory.redo();
    expect(await stoneXs()).toEqual([0, 1, 2]);
    expect(editHistory.canRedo()).toBe(false);
  });

  it('undoes successive actions in reverse order', async () => {
    await paintStone(0);
    await paintStone(1);

    await Promise.all([editHistory.undo(), editHistory.undo()]);

    expect(await stoneXs()).toEqual([]);
    expect(editHistory.canUndo()).toBe(false);
  });

  it('restores the block an undone action overwrote', async () => {
    await paintStone(0);
    await appendAction({
      kind: 'paint',
      events: [{ type: 'model:blockPlaced', data: { position: { x: 0, y: 0, z: 0 }, blockType: 'dirt' } }],
    });

    await editHistory.undo();

    expect((await blockProjection.getBlock({ x: 0, y: 0, z: 0 }))?.blockType).toBe('stone');
  });

  it('reverts a dimension expansion and its block shift', async () => {
    await paintStone(0);
    await appendAction({
      kind: 'dimension-expand',
      events: [{
        type: 'model:dimensionExpanded',
        data: { direction: 'x-', newDimensions: { ...DIMENSIONS, width: 17 }, shift: { x: 1, y: 0, z: 0 } },
      }],
    });
    expect(await stoneXs()).toEqual([1]);

    await editHistory.undo();

    expect((await modelProjection.getModel()).dimensions).toEqual(DIMENSIONS);
    expect(await stoneXs()).toEqual([0]);
  });

  it('clears the redo stack on a new edit', async () => {
    await paintStone(0);
    await editHistory.undo();
    await paintStone(5);

    expect(editHistory.canRedo()).toBe(false);
    expect(await stoneXs()).toEqual([5]);
  });

  it('leaves events outside any action in place', async () => {
    await append('model:blockPlaced', { position: { x: 9, y: 0, z: 0 }, blockType: 'stone' });

    await editHistory.undo();

    expect(await stoneXs()).toEqual([9]);
  });

  it('rebuilds the stacks and the undone state from the log', async () => {
    await paintStone(0);
    await paintStone(1);
    await editHistory.undo();

    modelProjection.reset();
    blockProjection.reset();
    await editHistory.replay(PROJECT_ID);

    expect(await stoneXs()).toEqual([0]);
    expect(editHistory.canUndo()).toBe(true);
    expect(editHistory.canRedo()).toBe(true);
  });

  it('names the reverted action in history:step-undone and history:step-redone', async () => {
    toolRegistry.register({ name: 'test-fill', hotkey: '', label: 'Fill', create: () => { throw new Error('unused'); } });
    await appendAction({
      kind: 'paint',
      tool: 'test-fill',
      events: [
        { type: 'model:blocksRemoved', data: { positions: [{ x: 3, y: 0, z: 0 }] } },
        { type: 'model:blocksPlaced', data: { blocks: [{ position: { x: 0, y: 0, z: 0 }, blockType: 'stone' }, { position: { x: 1, y: 0, z: 0 }, blockType: 'stone' }] } },
      ],
    });

    const undone = nextNotice('history:step-undone');
    await editHistory.undo();
    expect((await undone).label).toBe('Fill (2 blocks, 1 removed)');

    const redone = nextNotice('history:step-redone');
    await editHistory.redo();
    expect((await redone).label).toBe('Fill (2 blocks, 1 removed)');
    toolRegistry.unregister('test-fill');
  });

  it('writes one empty undo action that names its target', async () => {
    const target = await paintStone(0);
    await editHistory.undo();

    const undoMarkers = await eventLog.getEvents({ projectId: PROJECT_ID, types: ['action:started'] });
    expect(undoMarkers[undoMarkers.length - 1].data).toEqual({ kind: 'undo', target });
  });
});
