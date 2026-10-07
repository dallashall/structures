/**
 * EventLog tests - IndexedDB event storage and queries
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventLog, type Event } from '../EventLog';

const toType = (event: Event): string => event.type;
const toId = (event: Event): number => event.id!;

describe('EventLog', () => {
  beforeEach(async () => {
    await eventLog.clear();
  });

  describe('append()', () => {
    it('returns consecutive ids', async () => {
      const first = await eventLog.append('test:first', { value: 1 });
      const second = await eventLog.append('test:second', { value: 2 });

      expect(second).toBe(first + 1);
    });

    it('emits event:appended with the stored event', async () => {
      const emitted: Event[] = [];
      const collect = (event: Event): void => { emitted.push(event); };
      eventLog.on('event:appended', collect);

      const before = Date.now();
      const id = await eventLog.append('test:created', { name: 'Test' }, 'project-a');
      eventLog.off('event:appended', collect);

      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toMatchObject({ id, type: 'test:created', data: { name: 'Test' }, projectId: 'project-a' });
      expect(emitted[0].timestamp).toBeGreaterThanOrEqual(before);
    });
  });

  describe('getEvents()', () => {
    let ids: number[];

    beforeEach(async () => {
      ids = [
        await eventLog.append('model:blockPlaced', { x: 0 }, 'project-a'),
        await eventLog.append('metadata:renamed', { newName: 'New' }, 'project-a'),
        await eventLog.append('model:blockPlaced', { x: 1 }, 'project-b'),
        await eventLog.append('metadata:created', { name: 'Test' }, 'project-b'),
      ];
    });

    it('returns every event in id order when no query is given', async () => {
      expect((await eventLog.getEvents()).map(toId)).toEqual(ids);
    });

    it('filters by event type', async () => {
      const events = await eventLog.getEvents({ types: ['model:blockPlaced'] });
      expect(events.map(toId)).toEqual([ids[0], ids[2]]);
    });

    it('filters by project', async () => {
      const events = await eventLog.getEvents({ projectId: 'project-b' });
      expect(events.map(toType)).toEqual(['model:blockPlaced', 'metadata:created']);
    });

    it('treats fromId and toId as inclusive', async () => {
      const events = await eventLog.getEvents({ fromId: ids[1], toId: ids[2] });
      expect(events.map(toId)).toEqual([ids[1], ids[2]]);
    });

    it('combines id range, type, and project filters', async () => {
      const events = await eventLog.getEvents({
        fromId: ids[0],
        toId: ids[3],
        types: ['model:blockPlaced'],
        projectId: 'project-a',
      });
      expect(events.map(toId)).toEqual([ids[0]]);
    });
  });

  describe('getLatestEventId()', () => {
    it('returns 0 for an empty log', async () => {
      expect(await eventLog.getLatestEventId()).toBe(0);
    });

    it('returns the id of the newest event', async () => {
      await eventLog.append('test:first', {});
      const last = await eventLog.append('test:second', {});

      expect(await eventLog.getLatestEventId()).toBe(last);
    });
  });

  describe('deleteProjectEvents()', () => {
    it('removes one project and keeps the others', async () => {
      await eventLog.append('model:blockPlaced', { x: 0 }, 'project-a');
      const kept = await eventLog.append('model:blockPlaced', { x: 1 }, 'project-b');
      await eventLog.append('metadata:renamed', { newName: 'Gone' }, 'project-a');

      await eventLog.deleteProjectEvents('project-a');

      expect((await eventLog.getEvents()).map(toId)).toEqual([kept]);
    });
  });

  describe('clear()', () => {
    it('removes all events', async () => {
      await eventLog.append('test:first', {});
      await eventLog.append('test:second', {});

      await eventLog.clear();

      expect(await eventLog.getEvents()).toHaveLength(0);
    });
  });
});
