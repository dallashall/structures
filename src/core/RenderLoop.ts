import { EventEmitter } from './EventEmitter';

/**
 * RenderLoop - One requestAnimationFrame loop shared by every view, so the 2D canvases and the 3D view
 * draw the same state on the same frame. It runs only while at least one view is registered.
 *
 * Views draw from cached projection state on each tick. Projections stay current through
 * event:appended, so a tick never waits on IndexedDB.
 *
 * Events:
 * - tick - draw now
 */
class RenderLoop extends EventEmitter {
  private static instance: RenderLoop;

  private animationFrameId: number | null = null;
  private isRunning = false;
  private registeredViewCount = 0;
  // CPU time of the previous tick across every view. GPU work runs after the tick returns.
  private lastTickMs = 0;

  private constructor() {
    super();
  }

  static getInstance(): RenderLoop {
    if (!RenderLoop.instance) {
      RenderLoop.instance = new RenderLoop();
    }
    return RenderLoop.instance;
  }

  register(): void {
    this.registeredViewCount++;

    if (this.registeredViewCount === 1 && !this.isRunning) {
      this.start();
    }
  }

  unregister(): void {
    this.registeredViewCount--;

    if (this.registeredViewCount <= 0) {
      this.registeredViewCount = 0;
      this.stop();
    }
  }

  private start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    const tick = () => {
      const startMs = performance.now();
      this.emit('tick');
      this.lastTickMs = performance.now() - startMs;

      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(tick);
      }
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  private stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    console.log('RenderLoop: Stopped');
  }

  getLastTickMs(): number {
    return this.lastTickMs;
  }

  forceTick(): void {
    this.emit('tick');
  }
}

export const renderLoop = RenderLoop.getInstance();
