/**
 * RenameProjectCommand tests - renames any stored project and refuses names already held
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventLog } from '../../core/EventLog';
import { storage } from '../../core/Storage';
import { renameProjectCommand, RenameProjectError } from '../RenameProjectCommand';

const createProject = async (id: string, name: string): Promise<void> => {
  await eventLog.append('metadata:created', { id, name }, id);
  await eventLog.append('model:initialized', { dimensions: { width: 4, height: 4, depth: 4 } }, id);
};

const toName = async (projectId: string): Promise<string | undefined> =>
  (await storage.getProject(projectId))?.name;

describe('RenameProjectCommand', () => {
  beforeEach(async () => {
    await eventLog.clear();
    await createProject('a', 'Alpha');
    await createProject('b', 'Beta');
  });

  it('renames a project that is not open, trimming the name', async () => {
    await renameProjectCommand.execute('a', '  Castle  ');

    expect(await toName('a')).toBe('Castle');
  });

  it('announces the rename through Storage', async () => {
    const renames: unknown[] = [];
    const recordRename = (rename: unknown): void => { renames.push(rename); };
    storage.on('project:renamed', recordRename);

    await renameProjectCommand.execute('a', 'Castle');
    storage.off('project:renamed', recordRename);

    expect(renames).toEqual([{ projectId: 'a', newName: 'Castle' }]);
  });

  it('refuses an empty name', async () => {
    await expect(renameProjectCommand.execute('a', '   ')).rejects.toBeInstanceOf(RenameProjectError);
    expect(await toName('a')).toBe('Alpha');
  });

  it('refuses a name another project holds', async () => {
    await expect(renameProjectCommand.execute('a', 'Beta')).rejects.toThrow('Another project already has that name.');
    expect(await toName('a')).toBe('Alpha');
  });

  it('appends nothing when the name is unchanged', async () => {
    const before = (await eventLog.getEvents({ projectId: 'a' })).length;

    await renameProjectCommand.execute('a', 'Alpha');

    expect(await eventLog.getEvents({ projectId: 'a' })).toHaveLength(before);
  });

  it('refuses a project that does not exist', async () => {
    await expect(renameProjectCommand.execute('missing', 'X')).rejects.toThrow('That project no longer exists.');
  });
});
