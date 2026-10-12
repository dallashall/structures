import { describe, it, expect, beforeEach } from 'vitest';
import { eventLog } from '../../core/EventLog';
import { editHistory } from '../../core/EditHistory';
import { modelProjection } from '../../projections/ModelProjection';
import { PROJECT_ID, append, startProject } from '../../test/projectFixture';
import { setMetaBlockCommand } from '../SetMetaBlockCommand';

const countActions = async (): Promise<number> =>
  (await eventLog.getEvents({ projectId: PROJECT_ID, types: ['action:started'] })).length;

describe('SetMetaBlockCommand', () => {
  beforeEach(async () => {
    await startProject();
    await append('model:initialized', { projectId: PROJECT_ID, dimensions: { width: 8, height: 6, depth: 4 } });
    await append('model:metaBlockPlaced', { position: { x: 4, y: 3, z: 0 }, direction: 'y-' });
  });

  it('moves the meta block as one undoable action', async () => {
    await setMetaBlockCommand.execute({ x: 1, y: 2, z: 3 }, 'y-');
    expect((await modelProjection.getMetaBlock()).position).toEqual({ x: 1, y: 2, z: 3 });

    await editHistory.undo();
    expect((await modelProjection.getMetaBlock()).position).toEqual({ x: 4, y: 3, z: 0 });
  });

  it('turns right and left around the vertical axis', async () => {
    await setMetaBlockCommand.turn('right');
    expect((await modelProjection.getMetaBlock()).direction).toBe('x+');

    await setMetaBlockCommand.turn('left');
    await setMetaBlockCommand.turn('left');
    expect((await modelProjection.getMetaBlock()).direction).toBe('x-');
  });

  it('ignores a position outside the build volume', async () => {
    await setMetaBlockCommand.execute({ x: 8, y: 0, z: 0 }, 'y-');

    expect((await modelProjection.getMetaBlock()).position).toEqual({ x: 4, y: 3, z: 0 });
    expect(await countActions()).toBe(0);
  });

  it('appends nothing when the position and facing are unchanged', async () => {
    await setMetaBlockCommand.execute({ x: 4, y: 3, z: 0 }, 'y-');

    expect(await countActions()).toBe(0);
  });
});
