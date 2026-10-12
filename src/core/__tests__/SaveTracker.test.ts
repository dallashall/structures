/**
 * SaveTracker tests - the save state follows real IndexedDB commits
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventLog } from '../EventLog';
import { quickSelectStore } from '../QuickSelectStore';
import { saveTracker } from '../SaveTracker';

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}

const createDeferred = (): Deferred => {
  const deferred = {} as Deferred;
  const capture = (resolve: () => void, reject: (error: Error) => void): void => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  };
  deferred.promise = new Promise(capture);
  return deferred;
};

const ignoreRejection = (): void => undefined;

describe('SaveTracker', () => {
  beforeEach(async () => {
    const write = createDeferred();
    saveTracker.track(write.promise);
    write.resolve();
    await write.promise;
  });

  it('reads saving until every tracked write settles', async () => {
    const first = createDeferred();
    const second = createDeferred();
    saveTracker.track(first.promise);
    saveTracker.track(second.promise);

    first.resolve();
    await first.promise;
    expect(saveTracker.getSaveState()).toBe('saving');

    second.resolve();
    await second.promise;
    expect(saveTracker.getSaveState()).toBe('saved');
  });

  it('reads error after a failed write until a later write commits', async () => {
    const failing = createDeferred();
    saveTracker.track(failing.promise).catch(ignoreRejection);
    failing.reject(new Error('quota'));
    await failing.promise.catch(ignoreRejection);
    expect(saveTracker.getSaveState()).toBe('error');

    const next = createDeferred();
    saveTracker.track(next.promise);
    next.resolve();
    await next.promise;
    expect(saveTracker.getSaveState()).toBe('saved');
  });

  it('reads saving while an event append is in flight', async () => {
    const append = eventLog.append('metadata:created', { id: 'p', name: 'P' }, 'p');
    expect(saveTracker.getSaveState()).toBe('saving');
    await append;
    expect(saveTracker.getSaveState()).toBe('saved');
  });

  it('tracks quick-select writes', async () => {
    const write = quickSelectStore.setSlot('p', 0, 'test:block');
    expect(saveTracker.getSaveState()).toBe('saving');
    await write;
    expect(saveTracker.getSaveState()).toBe('saved');
  });
});
