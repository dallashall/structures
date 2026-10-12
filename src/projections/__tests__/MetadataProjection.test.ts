import { describe, it, expect, beforeEach } from 'vitest';
import { eventLog } from '../../core/EventLog';
import { metadataProjection } from '../MetadataProjection';
import { startProject, append, appendToOtherProject, PROJECT_ID } from '../../test/projectFixture';

const eventTimestamp = async (eventId: number): Promise<number> => {
  const [event] = await eventLog.getEvents({ fromId: eventId, toId: eventId });
  return event.timestamp;
};

describe('MetadataProjection', () => {
  beforeEach(async () => {
    await startProject();
  });

  it('has no metadata before metadata:created', async () => {
    expect(await metadataProjection.getMetadata()).toBeNull();
  });

  it('takes id, name, and both timestamps from metadata:created', async () => {
    const createdId = await append('metadata:created', { id: PROJECT_ID, name: 'My Project' });
    const createdAt = await eventTimestamp(createdId);

    const metadata = await metadataProjection.getMetadata();
    expect(metadata?.id).toBe(PROJECT_ID);
    expect(metadata?.name).toBe('My Project');
    expect(metadata?.created.getTime()).toBe(createdAt);
    expect(metadata?.modified.getTime()).toBe(createdAt);
  });

  it('applies the newest name and its timestamp on metadata:renamed', async () => {
    const createdId = await append('metadata:created', { id: PROJECT_ID, name: 'First' });
    await append('metadata:renamed', { newName: 'Second' });
    const renamedId = await append('metadata:renamed', { newName: 'Third' });

    const metadata = await metadataProjection.getMetadata();
    expect(metadata?.name).toBe('Third');
    expect(metadata?.created.getTime()).toBe(await eventTimestamp(createdId));
    expect(metadata?.modified.getTime()).toBe(await eventTimestamp(renamedId));
  });

  it('exposes id and name through the convenience getters', async () => {
    await append('metadata:created', { id: PROJECT_ID, name: 'My Project' });

    expect(await metadataProjection.getId()).toBe(PROJECT_ID);
    expect(await metadataProjection.getName()).toBe('My Project');
  });

  it('ignores events for other projects', async () => {
    await append('metadata:created', { id: PROJECT_ID, name: 'Mine' });
    await appendToOtherProject('metadata:renamed', { newName: 'Not mine' });

    expect(await metadataProjection.getName()).toBe('Mine');
  });

  it('emits metadata:rebuilt for metadata events only', async () => {
    let count = 0;
    const countRebuilds = (): void => { count++; };
    metadataProjection.on('metadata:rebuilt', countRebuilds);

    await append('metadata:created', { id: PROJECT_ID, name: 'My Project' });
    await append('model:blockPlaced', { position: { x: 0, y: 0, z: 0 }, blockType: 'stone' });

    metadataProjection.off('metadata:rebuilt', countRebuilds);
    expect(count).toBe(1);
  });

  it('replays the log after a reset, as when a project is reopened', async () => {
    await append('metadata:created', { id: PROJECT_ID, name: 'First' });
    await append('metadata:renamed', { newName: 'Second' });

    metadataProjection.reset();

    expect(await metadataProjection.getName()).toBe('Second');
  });
});
