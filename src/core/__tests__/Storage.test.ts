/**
 * Storage tests - verify the project list is derived from the EventLog
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventLog } from '../EventLog';
import { storage } from '../Storage';
import type { StorageMetadata } from '../../types';

const toName = (project: StorageMetadata): string => project.name;

const createProject = async (id: string, name: string): Promise<void> => {
  await eventLog.append('metadata:created', { id, name }, id);
  await eventLog.append('model:initialized', { dimensions: { width: 8, height: 4, depth: 8 } }, id);
};

describe('Storage', () => {
  beforeEach(async () => {
    await eventLog.clear();
    await storage.setLastOpenedProjectId(null);
  });

  it('lists one entry per metadata:created event', async () => {
    await createProject('a', 'Alpha');
    await createProject('b', 'Beta');

    const projects = await storage.listProjects();

    expect(projects.map(toName)).toEqual(['Alpha', 'Beta']);
  });

  it('ignores events for projects without metadata:created', async () => {
    await eventLog.append('model:initialized', { dimensions: { width: 1, height: 1, depth: 1 } }, 'orphan');

    expect(await storage.listProjects()).toEqual([]);
  });

  it('applies renames, dimensions, and block count', async () => {
    await createProject('a', 'Alpha');
    await eventLog.append('metadata:renamed', { newName: 'Alpha 2' }, 'a');
    await eventLog.append('model:blocksPlaced', {
      blocks: [
        { position: { x: 0, y: 0, z: 0 }, blockType: 'stone' },
        { position: { x: 1, y: 0, z: 0 }, blockType: 'stone' },
      ],
    }, 'a');
    await eventLog.append('model:blockRemoved', { position: { x: 0, y: 0, z: 0 } }, 'a');

    const project = await storage.getProject('a');

    expect(project?.name).toBe('Alpha 2');
    expect(project?.dimensions).toEqual({ width: 8, height: 4, depth: 8 });
    expect(project?.blockCount).toBe(1);
  });

  it('leaves undone actions out of the block count', async () => {
    await createProject('a', 'Alpha');
    const placeStone = (x: number) => eventLog.appendAction('a', {
      kind: 'paint',
      events: [{ type: 'model:blockPlaced', data: { position: { x, y: 0, z: 0 }, blockType: 'stone' } }],
    });
    await placeStone(0);
    const second = await placeStone(1);
    await eventLog.appendAction('a', { kind: 'undo', target: second, events: [] });

    const [project] = await storage.listProjects();

    expect(project.blockCount).toBe(1);
  });

  it('removes the project and clears last opened on delete', async () => {
    await createProject('a', 'Alpha');
    await storage.setLastOpenedProjectId('a');

    await storage.deleteProject('a');

    expect(await storage.listProjects()).toEqual([]);
    expect(await storage.getLastOpenedProjectId()).toBeNull();
  });
});
