/**
 * DraftingService tests - finalize is the single path from a drawing operation to the event log
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { draftingService } from '../DraftingService';
import { editorState } from '../EditorState';
import { eventLog, type Event } from '../EventLog';
import { startProject, PROJECT_ID } from '../../test/projectFixture';

const stone = (x: number) => ({ position: { x, y: 0, z: 0 }, blockType: 'stone' });
const erase = (x: number) => ({ position: { x, y: 0, z: 0 }, blockType: null });
const toTypeAndData = (event: Event) => [event.type, event.data];

describe('DraftingService.finalize', () => {
  beforeEach(async () => {
    await startProject();
    editorState.setPaintBehavior('normal');
    draftingService.cancel();
  });

  it('appends removals before placements for the current project', async () => {
    await draftingService.finalize([stone(1), erase(2), stone(3)]);

    const events = await eventLog.getEvents({ projectId: PROJECT_ID });
    expect(events.map(toTypeAndData)).toEqual([
      ['model:blocksRemoved', { positions: [{ x: 2, y: 0, z: 0 }] }],
      ['model:blocksPlaced', { blocks: [{ ...stone(1), blockState: undefined }, { ...stone(3), blockState: undefined }] }],
    ]);
  });

  it('removes every position in delete mode, typed or not', async () => {
    editorState.setPaintBehavior('delete');
    await draftingService.finalize([stone(1), erase(2)]);

    const events = await eventLog.getEvents({ projectId: PROJECT_ID });
    expect(events.map(toTypeAndData)).toEqual([
      ['model:blocksRemoved', { positions: [{ x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }] }],
    ]);
  });

  it('clears the preview and emits draft:finalized', async () => {
    const emitted: string[] = [];
    const recordFinalized = (): void => { emitted.push('finalized'); };
    draftingService.on('draft:finalized', recordFinalized);

    draftingService.set([stone(1)]);
    await draftingService.finalize([stone(1)]);
    draftingService.off('draft:finalized', recordFinalized);

    expect(draftingService.getPreview()).toEqual([]);
    expect(emitted).toEqual(['finalized']);
  });

  it('appends nothing for an empty operation list', async () => {
    await draftingService.finalize([]);
    expect(await eventLog.getEvents()).toHaveLength(0);
  });

  it('cancels instead of persisting when no project is open', async () => {
    editorState.setCurrentProjectId(null);
    draftingService.set([stone(1)]);

    await draftingService.finalize([stone(1)]);

    expect(await eventLog.getEvents()).toHaveLength(0);
    expect(draftingService.getPreview()).toEqual([]);
  });
});
