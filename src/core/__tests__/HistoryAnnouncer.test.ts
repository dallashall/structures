import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { historyAnnouncer, type HistoryToast } from '../HistoryAnnouncer';
import { editHistory } from '../EditHistory';
import { startProject, append, paintStone } from '../../test/projectFixture';

const toText = (toast: HistoryToast): string => toast.text;
const isLeaving = (toast: HistoryToast): boolean => toast.leaving;
const removeToast = (toast: HistoryToast): void => historyAnnouncer.remove(toast.key);

const toastCount = (count: number) => (): void => {
  expect(historyAnnouncer.getToasts()).toHaveLength(count);
};

describe('HistoryAnnouncer', () => {
  beforeEach(async () => {
    // Only the expiry timer is faked. fake-indexeddb schedules its work with setImmediate.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    historyAnnouncer.getToasts().forEach(removeToast);
    await startProject();
    await append('model:initialized', { dimensions: { width: 16, height: 16, depth: 16 } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds one toast per step, oldest first', async () => {
    await paintStone(0);
    await editHistory.undo();
    await editHistory.redo();
    await vi.waitFor(toastCount(2));

    expect(historyAnnouncer.getToasts().map(toText)).toEqual(['Undid Point (1 block)', 'Redid Point (1 block)']);
  });

  it('marks a toast leaving after it times out, and drops it on remove', async () => {
    await paintStone(0);
    await editHistory.undo();
    await vi.waitFor(toastCount(1));
    vi.advanceTimersByTime(2500);

    const [toast] = historyAnnouncer.getToasts();
    expect(toast.leaving).toBe(true);

    historyAnnouncer.remove(toast.key);
    expect(historyAnnouncer.getToasts()).toEqual([]);
  });

  it('pushes the oldest toast out past four', async () => {
    for (let x = 0; x < 5; x++) {
      await paintStone(x);
    }
    for (let step = 0; step < 5; step++) {
      await editHistory.undo();
    }
    await vi.waitFor(toastCount(5));

    expect(historyAnnouncer.getToasts().map(isLeaving)).toEqual([true, false, false, false, false]);
  });
});
