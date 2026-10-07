/**
 * wheelZoom tests - wheel delta to zoom factor, and wheel device classification
 */

import { describe, it, expect } from 'vitest';
import { classifyWheel, wheelZoomFactor } from '../wheelZoom';

const wheel = (deltaY: number, ctrlKey = false) => ({ deltaY, deltaMode: 0, ctrlKey });

describe('wheelZoomFactor', () => {
  it('caps one mouse notch at a 10% step', () => {
    expect(wheelZoomFactor(wheel(-100))).toBeCloseTo(Math.exp(0.1));
    expect(wheelZoomFactor(wheel(100))).toBeCloseTo(Math.exp(-0.1));
  });

  it('scales small trackpad deltas by distance, not event count', () => {
    const tenSmall = wheelZoomFactor(wheel(-5)) ** 10;
    const oneLarger = wheelZoomFactor(wheel(-50));
    expect(tenSmall).toBeCloseTo(oneLarger);
  });

  it('uses the pinch sensitivity when ctrlKey is set', () => {
    expect(wheelZoomFactor(wheel(-5, true))).toBeCloseTo(Math.exp(0.05));
  });

  it('converts line-mode deltas to pixels', () => {
    expect(wheelZoomFactor({ deltaY: -3, deltaMode: 1, ctrlKey: false })).toBeCloseTo(Math.exp(0.09));
  });
});

describe('classifyWheel', () => {
  const event = (deltaX: number, deltaY: number, ctrlKey = false, deltaMode = 0) => ({ deltaX, deltaY, ctrlKey, deltaMode });

  it('reads ctrlKey as a pinch', () => {
    expect(classifyWheel(event(0, 3.5, true))).toBe('pinch');
  });

  it('reads notch-sized vertical integer deltas and line mode as a mouse', () => {
    expect(classifyWheel(event(0, 100))).toBe('mouse');
    expect(classifyWheel(event(0, 3, false, 1))).toBe('mouse');
  });

  it('reads small, fractional, or two-axis deltas as a trackpad', () => {
    expect(classifyWheel(event(0, 12))).toBe('trackpad');
    expect(classifyWheel(event(0, 60.5))).toBe('trackpad');
    expect(classifyWheel(event(4, 120))).toBe('trackpad');
  });
});
