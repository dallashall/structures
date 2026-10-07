/**
 * frameStats tests - frame timing and camera jitter summaries
 */

import { describe, it, expect } from 'vitest';
import { summarizeFrames } from '../frameStats';

const repeat = (value: number, count: number): number[] => {
  const constant = (): number => value;
  return Array.from({ length: count }, constant);
};
// Alternating double and empty frames, as when input events miss frames
const alternateSteps = (_: unknown, i: number): number => (i % 2 === 0 ? 0.04 : 0.01);

describe('summarizeFrames', () => {
  it('reports 60fps and no long frames for steady 16.67ms frames', () => {
    const summary = summarizeFrames(repeat(1000 / 60, 120), repeat(4, 120), []);
    expect(summary.fps).toBeCloseTo(60);
    expect(summary.intervalP95).toBeCloseTo(1000 / 60);
    expect(summary.longFrames).toBe(0);
    expect(summary.renderMean).toBeCloseTo(4);
  });

  it('counts frames over 1.5x the median as long and reports the worst', () => {
    const intervals = [...repeat(16, 100), 40, 50];
    const summary = summarizeFrames(intervals, [], []);
    expect(summary.longFrames).toBe(2);
    expect(summary.intervalMax).toBe(50);
  });

  it('reports zero jitter for even camera steps and positive jitter for uneven ones', () => {
    expect(summarizeFrames([], [], repeat(0.02, 30)).cameraJitter).toBeCloseTo(0);

    const uneven = Array.from({ length: 30 }, alternateSteps);
    expect(summarizeFrames([], [], uneven).cameraJitter).toBeCloseTo(0.6);
  });

  it('ignores frames where the camera rests and needs enough moving frames', () => {
    expect(summarizeFrames([], [], [...repeat(0, 50), ...repeat(0.02, 5)]).cameraJitter).toBeNull();
    expect(summarizeFrames([], [], [...repeat(0, 50), ...repeat(0.02, 20)]).cameraJitter).toBeCloseTo(0);
  });
});
