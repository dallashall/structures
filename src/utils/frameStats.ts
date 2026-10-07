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
  // Coefficient of variation of per-frame camera steps while moving. 0 means perfectly even.
  // Null when the camera did not move enough frames to judge.
  cameraJitter: number | null;
}

// A frame this many times the median interval shows as a visible hitch
const LONG_FRAME_FACTOR = 1.5;
// Steps below this are rest, not motion (radians or world units, combined)
const MOTION_EPSILON = 1e-4;
// Fewer moving frames than this give a jitter value dominated by noise
const MIN_MOVING_FRAMES = 10;

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

  const isMoving = (step: number): boolean => step > MOTION_EPSILON;
  const moving = cameraSteps.filter(isMoving);
  let cameraJitter: number | null = null;
  if (moving.length >= MIN_MOVING_FRAMES) {
    const meanStep = mean(moving);
    const squaredDeviation = (total: number, step: number): number => total + (step - meanStep) ** 2;
    const deviation = Math.sqrt(moving.reduce(squaredDeviation, 0) / moving.length);
    cameraJitter = deviation / meanStep;
  }

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
