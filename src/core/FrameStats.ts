import { EventEmitter } from './EventEmitter';
import { summarizeFrames } from '../utils/frameStats';

import type { FrameStatsSummary } from '../utils/frameStats';

export interface FrameSample {
  startMs: number;
  renderMs: number;
  // CPU time of the previous whole loop tick
  tickMs: number;
  cameraStep: number;
  bufferWidth: number;
  bufferHeight: number;
}

export interface FrameStatsReport extends FrameStatsSummary {
  // 3D drawing buffer in device pixels. GPU cost scales with its area.
  bufferWidth: number;
  bufferHeight: number;
}

// Rolling window: two seconds at 60fps
const WINDOW_FRAMES = 120;
const SAMPLE_INTERVAL_MS = 500;
// A longer gap is a pause (hidden tab, unmounted view), not a slow frame
const MAX_COUNTED_INTERVAL_MS = 1000;

/**
 * FrameStats - Measures 3D view frame timing and camera smoothness
 *
 * Babylon3D reports every rendered frame. Twice a second this emits
 * framestats:sampled with a summary of the last WINDOW_FRAMES frames.
 *
 * Events:
 * - framestats:sampled (FrameStatsReport)
 */
class FrameStats extends EventEmitter {
  private static instance: FrameStats;
  private intervals: number[] = [];
  private renderTimes: number[] = [];
  private cameraSteps: number[] = [];
  private tickTimes: number[] = [];
  private lastFrameMs: number | null = null;
  private lastSampleMs = 0;
  private latest: FrameStatsReport | null = null;

  private constructor() {
    super();
  }

  static getInstance(): FrameStats {
    if (!FrameStats.instance) {
      FrameStats.instance = new FrameStats();
    }
    return FrameStats.instance;
  }

  /**
   * Record one rendered frame
   */
  recordFrame({ startMs, renderMs, tickMs, cameraStep, bufferWidth, bufferHeight }: FrameSample): void {
    if (this.lastFrameMs !== null) {
      const interval = startMs - this.lastFrameMs;
      if (interval <= MAX_COUNTED_INTERVAL_MS) {
        this.push(this.intervals, interval);
        this.push(this.renderTimes, renderMs);
        this.push(this.cameraSteps, cameraStep);
        this.push(this.tickTimes, tickMs);
      }
    }
    this.lastFrameMs = startMs;

    if (startMs - this.lastSampleMs >= SAMPLE_INTERVAL_MS) {
      this.lastSampleMs = startMs;
      const summary = summarizeFrames(this.intervals, this.renderTimes, this.cameraSteps, this.tickTimes);
      this.latest = { ...summary, bufferWidth, bufferHeight };
      this.emit('framestats:sampled', this.latest);
    }
  }

  getLatest(): FrameStatsReport | null {
    return this.latest;
  }

  private push(window: number[], value: number): void {
    window.push(value);
    if (window.length > WINDOW_FRAMES) window.shift();
  }
}

export const frameStats = FrameStats.getInstance();
