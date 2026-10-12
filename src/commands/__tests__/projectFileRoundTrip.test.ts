/**
 * Save then load - a project read back from its file matches the original and keeps its history
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventLog } from '../../core/EventLog';
import { editHistory } from '../../core/EditHistory';
import { storage } from '../../core/Storage';
import { loadProjectFileCommand } from '../LoadProjectFileCommand';
import { serializeProjectFile, toProjectFile } from '../../utils/projectFile';
import type { StorageMetadata } from '../../types';

const SOURCE_ID = 'source-project';

const placeStone = (x: number): Promise<string> => eventLog.appendAction(SOURCE_ID, {
  kind: 'paint',
  tool: 'point',
  events: [{ type: 'model:blocksPlaced', data: { blocks: [{ position: { x, y: 0, z: 0 }, blockType: 'stone' }] } }],
});

const saveSource = async (): Promise<string> => {
  const events = await eventLog.getEvents({ projectId: SOURCE_ID });
  return serializeProjectFile(toProjectFile('Castle', events, Date.now()));
};

const toSummary = ({ name, blockCount, dimensions }: StorageMetadata) => ({ name, blockCount, dimensions });

describe('project file round trip', () => {
  beforeEach(async () => {
    await eventLog.clear();
    await eventLog.append('metadata:created', { id: SOURCE_ID, name: 'Castle' }, SOURCE_ID);
    await eventLog.append('model:initialized', { projectId: SOURCE_ID, dimensions: { width: 8, height: 4, depth: 8 } }, SOURCE_ID);
    await placeStone(0);
    const second = await placeStone(1);
    await eventLog.appendAction(SOURCE_ID, { kind: 'undo', target: second, events: [] });
  });

  it('adds a second project with the same name, dimensions, and blocks', async () => {
    const loadedId = await loadProjectFileCommand.load(await saveSource());

    const projects = await storage.listProjects();
    expect(projects).toHaveLength(2);
    const isLoaded = (project: StorageMetadata): boolean => project.id === loadedId;
    const loaded = projects.find(isLoaded)!;
    expect(toSummary(loaded)).toEqual({ name: 'Castle (from file)', blockCount: 1, dimensions: { width: 8, height: 4, depth: 8 } });
  });

  it('keeps the file name when no project has it', async () => {
    const text = await saveSource();
    await eventLog.clear();

    const loadedId = await loadProjectFileCommand.load(text);

    expect((await storage.getProject(loadedId))?.name).toBe('Castle');
  });

  it('suffixes a second load of the same file with a count', async () => {
    const text = await saveSource();
    await loadProjectFileCommand.load(text);
    const secondId = await loadProjectFileCommand.load(text);

    expect((await storage.getProject(secondId))?.name).toBe('Castle (from file 2)');
  });

  it('keeps undo and redo history', async () => {
    const loadedId = await loadProjectFileCommand.load(await saveSource());
    await editHistory.replay(loadedId);

    expect(editHistory.canUndo()).toBe(true);
    expect(editHistory.canRedo()).toBe(true);
  });

  it('loads the same file twice without sharing action IDs', async () => {
    const text = await saveSource();
    const firstId = await loadProjectFileCommand.load(text);
    const secondId = await loadProjectFileCommand.load(text);

    const [first, second] = await Promise.all([
      eventLog.getEvents({ projectId: firstId }),
      eventLog.getEvents({ projectId: secondId }),
    ]);
    const toActionId = (event: { actionId?: string }) => event.actionId;
    const firstActionIds = new Set(first.map(toActionId).filter(Boolean));
    const isShared = (actionId: string | undefined): boolean => actionId !== undefined && firstActionIds.has(actionId);
    expect(second.map(toActionId).some(isShared)).toBe(false);
  });
});
