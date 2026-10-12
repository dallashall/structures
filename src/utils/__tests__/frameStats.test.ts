import { describe, it, expect } from 'vitest';
import { summarizeFrames } from '../frameStats';

const repeat = (value: number, count: number): number[] => {
  const constant = (): number => value;
  return Array.from({ length: count }, constant);
};
const decayingStep = (_: unknown, i: number): number => 0.1 * Math.exp((-33 / 60) * i);
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

  it('reports near-zero jitter for even steps and for a smooth ease-out', () => {
    expect(summarizeFrames([], [], repeat(0.02, 30)).cameraJitter).toBeCloseTo(0);

    // Each 30fps frame keeps exp(-33/60) of the remaining distance, as CameraRig's ease does
    const easeOut = Array.from({ length: 12 }, decayingStep);
    expect(summarizeFrames([], [], easeOut).cameraJitter).toBeLessThan(0.2);
  });

  it('reports high jitter when steps alternate between big and small', () => {
    const uneven = Array.from({ length: 30 }, alternateSteps);
    expect(summarizeFrames([], [], uneven).cameraJitter).toBeGreaterThan(0.9);
  });

  it('only counts runs of consecutive moving frames', () => {
    const withRests = [...repeat(0, 20), ...repeat(0.02, 4), ...repeat(0, 20)];
    expect(summarizeFrames([], [], withRests).cameraJitter).toBeNull();
    expect(summarizeFrames([], [], [...repeat(0, 20), ...repeat(0.02, 20)]).cameraJitter).toBeCloseTo(0);
  });

  it('summarizes whole-tick times separately from 3D render times', () => {
    const ticks = [...repeat(8, 19), 20];
    const summary = summarizeFrames(repeat(16, 20), repeat(3, 20), [], ticks);
    expect(summary.tickMean).toBeCloseTo(8.6);
    expect(summary.tickP95).toBe(20);
    expect(summary.renderMean).toBeCloseTo(3);
  });
});
