/**
 * throttled tests - leading call, held trailing call, and flush
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttled } from '../throttle';

describe('throttled', () => {
  let calls: number[];
  const record = (value: number): void => { calls.push(value); };

  beforeEach(() => {
    vi.useFakeTimers();
    calls = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the first call at once and holds later calls for the trailing edge', () => {
    const throttledRecord = throttled(record, 10);
    throttledRecord(1);
    throttledRecord(2);
    throttledRecord(3);
    expect(calls).toEqual([1]);

    vi.advanceTimersByTime(10);
    expect(calls).toEqual([1, 3]);
  });

  it('flush runs the held call at once and only once', () => {
    const throttledRecord = throttled(record, 10);
    throttledRecord(1);
    throttledRecord(2);

    throttledRecord.flush();
    expect(calls).toEqual([1, 2]);

    vi.advanceTimersByTime(10);
    expect(calls).toEqual([1, 2]);
  });

  it('flush does nothing when no call is held', () => {
    const throttledRecord = throttled(record, 10);
    throttledRecord(1);
    throttledRecord.flush();
    expect(calls).toEqual([1]);
  });

  it('drops a held call that a later immediate call supersedes', () => {
    const throttledRecord = throttled(record, 10);
    throttledRecord(1);
    throttledRecord(2);
    vi.advanceTimersByTime(10);
    vi.advanceTimersByTime(20);
    throttledRecord(3);
    vi.advanceTimersByTime(20);
    expect(calls).toEqual([1, 2, 3]);
  });
});
