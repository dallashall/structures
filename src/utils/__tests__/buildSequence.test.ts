import { describe, it, expect } from 'vitest';
import { LEAD_TICKS, MAX_GLOWS, toDurationTicks, toGlowEvery, toGlowTint, toMarkTick, toSequenceKey } from '../buildSequence';

describe('toSequenceKey', () => {
  it('orders rise by layer, with jitter that never reaches two layers down', () => {
    expect(toSequenceKey('rise', 5, 0, 5, 0.99)).toBeLessThan(toSequenceKey('rise', 0, 2, 0, 0));
  });

  it('orders ripple out by distance from the anchor and ripple in the other way', () => {
    expect(toSequenceKey('rippleOut', 1, 0, 0, 0)).toBeLessThan(toSequenceKey('rippleOut', 6, 0, 0, 0));
    expect(toSequenceKey('rippleIn', 6, 0, 0, 0)).toBeLessThan(toSequenceKey('rippleIn', 1, 0, 0, 0));
  });
});

describe('timing', () => {
  it('spreads glow ticks across the duration, and blocks land LEAD_TICKS after their glow', () => {
    const duration = toDurationTicks(6);
    expect(duration).toBe(120);
    expect(toMarkTick(0, 10, duration)).toBe(0);
    expect(toMarkTick(9, 10, duration)).toBe(108);
    expect(LEAD_TICKS).toBeGreaterThan(0);
  });

  it('samples glows on large builds so no more than MAX_GLOWS play', () => {
    expect(toGlowEvery(100)).toBe(1);
    expect(Math.ceil(9000 / toGlowEvery(9000))).toBeLessThanOrEqual(MAX_GLOWS);
  });
});

describe('toGlowTint', () => {
  it('lightens toward white and keeps white white', () => {
    expect(toGlowTint([0, 0, 0])).toEqual([0.4, 0.4, 0.4]);
    expect(toGlowTint([1, 1, 1])).toEqual([1, 1, 1]);
  });
});
