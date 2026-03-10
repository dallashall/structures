/**
 * EventLog tests - verify IndexedDB event storage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventLog, type Event } from '../EventLog';

describe('EventLog', () => {
  beforeEach(async () => {
    // Clear events between tests
    await eventLog.clear();
  });

  describe('append()', () => {
    it('should append event and return sequential ID', async () => {
      const id1 = await eventLog.append('test:event1', { value: 1 });
      const id2 = await eventLog.append('test:event2', { value: 2 });

      expect(id1).toBeGreaterThan(0);
      expect(id2).toBeGreaterThan(id1);
      expect(id2).toBe(id1 + 1);
    });

    it('should emit event:appended with complete event', async () => {
      let emittedEvent: Event | null = null;

      eventLog.on('event:appended', (event: Event) => {
        emittedEvent = event;
      });

      await eventLog.append('test:created', { name: 'Test' });

      expect(emittedEvent).toBeDefined();
      expect(emittedEvent!.id).toBeGreaterThan(0);
      expect(emittedEvent!.type).toBe('test:created');
      expect(emittedEvent!.data).toEqual({ name: 'Test' });
      expect(emittedEvent!.timestamp).toBeGreaterThan(0);
    });
  });

  describe('getEvents()', () => {
    beforeEach(async () => {
      // Setup test data
      await eventLog.append('model:blockPlaced', { x: 0, y: 0, z: 0 });
      await eventLog.append('metadata:renamed', { name: 'New' });
      await eventLog.append('model:blockPlaced', { x: 1, y: 1, z: 1 });
      await eventLog.append('metadata:created', { name: 'Test' });
    });

    it('should return all events when no query provided', async () => {
      const events = await eventLog.getEvents();
      expect(events.length).toBeGreaterThanOrEqual(4);
    });

    it('should filter by event types', async () => {
      const events = await eventLog.getEvents({
        types: ['model:blockPlaced'],
      });

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events.every(e => e.type === 'model:blockPlaced')).toBe(true);
    });

    it('should filter by fromId (inclusive)', async () => {
      const allEvents = await eventLog.getEvents();
      const thirdEventId = allEvents[allEvents.length - 2].id!;

      const events = await eventLog.getEvents({
        fromId: thirdEventId,
      });

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].id).toBe(thirdEventId);
    });

    it('should filter by toId (inclusive)', async () => {
      const allEvents = await eventLog.getEvents();
      const secondEventId = allEvents[1].id!;

      const events = await eventLog.getEvents({
        toId: secondEventId,
      });

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[events.length - 1].id).toBeLessThanOrEqual(secondEventId);
    });

    it('should combine filters', async () => {
      const allEvents = await eventLog.getEvents();
      const firstId = allEvents[0].id!;
      const lastId = allEvents[allEvents.length - 1].id!;

      const events = await eventLog.getEvents({
        fromId: firstId,
        toId: lastId,
        types: ['model:blockPlaced'],
      });

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.every(e => e.type === 'model:blockPlaced')).toBe(true);
      expect(events.every(e => e.id! >= firstId && e.id! <= lastId)).toBe(true);
    });
  });

  describe('getLatestEventId()', () => {
    it('should return latest event ID', async () => {
      const id1 = await eventLog.append('test:event1', {});
      const id2 = await eventLog.append('test:event2', {});
      const id3 = await eventLog.append('test:event3', {});

      const latestId = await eventLog.getLatestEventId();
      expect(latestId).toBe(id3);
      expect(latestId).toBeGreaterThan(id2);
      expect(latestId).toBeGreaterThan(id1);
    });
  });

  describe('clear()', () => {
    it('should remove all events', async () => {
      await eventLog.append('test:event1', {});
      await eventLog.append('test:event2', {});

      await eventLog.clear();

      const events = await eventLog.getEvents();
      expect(events).toHaveLength(0);
    });
  });
});
