/**
 * GrowAnimator tests - stagger timing for one scene update
 */

import { describe, it, expect } from 'vitest';
import { staggerTiming, MAX_ANIMATED, SEQUENCE_MS, STEP_MS } from '../GrowAnimator';

const finishMs = (index: number, count: number): number => {
  const timing = staggerTiming(index, count)!;
  return timing.delayMs + timing.durationMs;
};

describe('staggerTiming', () => {
  it('starts a lone block at once', () => {
    expect(staggerTiming(0, 1)).toEqual({ delayMs: 0, durationMs: STEP_MS });
  });

  it('spreads start times so the last block finishes at the end of the sequence', () => {
    expect(staggerTiming(0, 5)!.delayMs).toBe(0);
    expect(finishMs(4, 5)).toBeCloseTo(SEQUENCE_MS);
    expect(staggerTiming(2, 5)!.delayMs).toBeCloseTo((SEQUENCE_MS - STEP_MS) / 2);
  });

  it('skips the animation past the block limit', () => {
    expect(staggerTiming(0, MAX_ANIMATED)).not.toBeNull();
    expect(staggerTiming(0, MAX_ANIMATED + 1)).toBeNull();
  });
});
