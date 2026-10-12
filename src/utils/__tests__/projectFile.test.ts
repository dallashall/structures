/**
 * Project file codec tests - format checks and ID rewriting on load
 */

import { describe, it, expect } from 'vitest';
import type { Event } from '../../core/EventLog';
import {
  ProjectFileError,
  parseProjectFile,
  serializeProjectFile,
  toLoadedEvents,
  toProjectFile,
  toProjectFileName,
  toProjectName,
  toUnusedName,
} from '../projectFile';

const SOURCE_ID = 'source-project';

const sourceEvents: Event[] = [
  { id: 1, type: 'metadata:created', data: { id: SOURCE_ID, name: 'Castle' }, timestamp: 100, projectId: SOURCE_ID },
  { id: 2, type: 'model:initialized', data: { projectId: SOURCE_ID, dimensions: { width: 4, height: 4, depth: 4 } }, timestamp: 101, projectId: SOURCE_ID },
  { id: 3, type: 'action:started', data: { kind: 'paint', tool: 'point' }, timestamp: 102, projectId: SOURCE_ID, actionId: 'paint-1' },
  { id: 4, type: 'model:blocksPlaced', data: { blocks: [] }, timestamp: 102, projectId: SOURCE_ID, actionId: 'paint-1' },
  { id: 5, type: 'action:ended', data: {}, timestamp: 102, projectId: SOURCE_ID, actionId: 'paint-1' },
  { id: 6, type: 'action:started', data: { kind: 'undo', target: 'paint-1' }, timestamp: 103, projectId: SOURCE_ID, actionId: 'undo-1' },
  { id: 7, type: 'action:ended', data: {}, timestamp: 103, projectId: SOURCE_ID, actionId: 'undo-1' },
];

const roundTrip = (): ReturnType<typeof parseProjectFile> =>
  parseProjectFile(serializeProjectFile(toProjectFile('Castle', sourceEvents, 200)));

const toActionId = (event: Event): string | undefined => event.actionId;

const counter = (): (() => string) => {
  let next = 0;
  const nextId = (): string => `new-${++next}`;
  return nextId;
};

const parsing = (text: string) => (): ReturnType<typeof parseProjectFile> => parseProjectFile(text);

describe('projectFile', () => {
  it('drops log IDs and project IDs from saved rows', () => {
    const file = roundTrip();

    expect(file.events).toHaveLength(sourceEvents.length);
    expect(file.events[0]).toEqual({ type: 'metadata:created', data: { id: SOURCE_ID, name: 'Castle' }, timestamp: 100 });
    expect(file.events[2]).toEqual({ type: 'action:started', data: { kind: 'paint', tool: 'point' }, timestamp: 102, actionId: 'paint-1' });
  });

  it('rewrites project IDs, action IDs, and undo targets on load', () => {
    const loaded = toLoadedEvents(roundTrip(), 'loaded-project', counter());

    const hasLoadedProject = (event: Event): boolean => event.projectId === 'loaded-project';
    expect(loaded.every(hasLoadedProject)).toBe(true);
    expect(loaded[0].data).toEqual({ id: 'loaded-project', name: 'Castle' });
    expect(loaded[1].data).toMatchObject({ projectId: 'loaded-project' });

    const paintIds = loaded.slice(2, 5).map(toActionId);
    expect(paintIds).toEqual(['new-1', 'new-1', 'new-1']);
    expect(loaded[5].actionId).toBe('new-2');
    expect(loaded[5].data).toEqual({ kind: 'undo', target: 'new-1' });
  });

  it('rejects text that is not JSON', () => {
    expect(parsing('not json')).toThrow(ProjectFileError);
  });

  it('rejects JSON from another format', () => {
    expect(parsing('{"format":"other","version":1,"events":[]}')).toThrow(/not a Structures project/);
  });

  it('rejects a newer file version', () => {
    const file = { ...toProjectFile('Castle', sourceEvents, 200), version: 99 };
    expect(parsing(JSON.stringify(file))).toThrow(/newer version/);
  });

  it('rejects a file whose first event does not create the project', () => {
    const file = toProjectFile('Castle', sourceEvents.slice(1), 200);
    expect(parsing(JSON.stringify(file))).toThrow(/no project creation event/);
  });

  it('rejects a damaged event row', () => {
    const file = { ...toProjectFile('Castle', sourceEvents, 200), events: [{ type: 'metadata:created' }] };
    expect(parsing(JSON.stringify(file))).toThrow(/damaged event list/);
  });

  it('reads the project name through renames', () => {
    const renamed: Event = { type: 'metadata:renamed', data: { previousName: 'Castle', newName: 'Keep' }, timestamp: 104 };
    expect(toProjectName(toProjectFile('Castle', [...sourceEvents, renamed], 200))).toBe('Keep');
  });

  it('suffixes a taken name with the first free variant', () => {
    expect(toUnusedName('Castle', new Set(['Tower']))).toBe('Castle');
    expect(toUnusedName('Castle', new Set(['Castle']))).toBe('Castle (from file)');
    expect(toUnusedName('Castle', new Set(['Castle', 'Castle (from file)']))).toBe('Castle (from file 2)');
  });

  it('builds a safe file name', () => {
    expect(toProjectFileName('My: Castle/2')).toBe('My Castle2.mcblueprint');
    expect(toProjectFileName('  ')).toBe('project.mcblueprint');
  });
});
