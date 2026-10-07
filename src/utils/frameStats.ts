export interface FrameStatsSummary {
  frames: number;
  fps: number;
  intervalP50: number;
  intervalP95: number;
  intervalMax: number;
  renderMean: number;
  renderP95: number;
  // CPU time of the whole shared frame loop: every 2D view plus the 3D view
  tickMean: number;
  tickP95: number;
  // Frames whose interval exceeded LONG_FRAME_FACTOR times the median
  longFrames: number;
  // How far each per-frame camera step strays from the average of its two neighbors,
  // relative to the step size, while moving. Smooth motion, including a steady ease-out,
  // scores near 0. Stutter (big, small, big) scores near 1 or above.
  // Null when the camera did not move enough frames to judge.
  cameraJitter: number | null;
}

// A frame this many times the median interval shows as a visible hitch
const LONG_FRAME_FACTOR = 1.5;
// Steps below this are rest, not motion (radians or world units, combined)
const MOTION_EPSILON = 1e-4;
// Fewer moving step triples than this give a jitter value dominated by noise
const MIN_MOVING_TRIPLES = 8;

const ascending = (a: number, b: number): number => a - b;
const sum = (total: number, value: number): number => total + value;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[index];
}

/**
 * Summarize recent frames.
 * intervals: ms between consecutive frames. renderTimes: ms spent in scene.render().
 * cameraSteps: how far the camera moved each frame. tickTimes: ms spent in each whole loop tick.
 */
export function summarizeFrames(
  intervals: number[],
  renderTimes: number[],
  cameraSteps: number[],
  tickTimes: number[] = [],
): FrameStatsSummary {
  const sortedIntervals = [...intervals].sort(ascending);
  const sortedRender = [...renderTimes].sort(ascending);
  const sortedTicks = [...tickTimes].sort(ascending);
  const mean = (values: number[]): number => (values.length ? values.reduce(sum, 0) / values.length : 0);
  const meanInterval = intervals.length ? intervals.reduce(sum, 0) / intervals.length : 0;
  const median = percentile(sortedIntervals, 0.5);
  const isLong = (interval: number): boolean => interval > median * LONG_FRAME_FACTOR;

  // Compare each step with the straight line between its neighbors. Only runs of three
  // consecutive moving frames count, so rest frames never pair with moving ones.
  let residualTotal = 0;
  let stepTotal = 0;
  let triples = 0;
  for (let i = 1; i < cameraSteps.length - 1; i++) {
    const [before, step, after] = [cameraSteps[i - 1], cameraSteps[i], cameraSteps[i + 1]];
    if (before <= MOTION_EPSILON || step <= MOTION_EPSILON || after <= MOTION_EPSILON) continue;
    residualTotal += Math.abs(step - (before + after) / 2);
    stepTotal += step;
    triples++;
  }
  const cameraJitter = triples >= MIN_MOVING_TRIPLES ? residualTotal / stepTotal : null;

  return {
    frames: intervals.length,
    fps: meanInterval > 0 ? 1000 / meanInterval : 0,
    intervalP50: median,
    intervalP95: percentile(sortedIntervals, 0.95),
    intervalMax: sortedIntervals[sortedIntervals.length - 1] ?? 0,
    renderMean: mean(renderTimes),
    renderP95: percentile(sortedRender, 0.95),
    tickMean: mean(tickTimes),
    tickP95: percentile(sortedTicks, 0.95),
    longFrames: intervals.filter(isLong).length,
    cameraJitter,
  };
}
