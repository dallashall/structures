import { EventEmitter } from './EventEmitter';

/**
 * RenderLoop - Shared render coordinator for all views
 *
 * Architecture:
 * - Single requestAnimationFrame loop at 60fps
 * - All views (Canvas2D, Babylon3D) register and render on same tick
 * - Projections check version before rebuilding (instant if no changes)
 *
 * Flow per tick:
 * 1. ensureFresh() on projections (instant if no event log changes)
 * 2. Emit 'tick' event
 * 3. All registered views render synchronously using cached projection state
 *
 * Benefits:
 * - No flickering (consistent frame timing)
 * - All views stay in sync (render together)
 * - No blocking (cached reads when no changes)
 * - Efficient (only rebuild projections when events change)
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

  /**
   * Register a view to participate in the render loop
   * Starts the loop when first view registers
   */
  register(): void {
    this.registeredViewCount++;

    if (this.registeredViewCount === 1 && !this.isRunning) {
      this.start();
    }
  }

  /**
   * Unregister a view from the render loop
   * Stops the loop when last view unregisters
   */
  unregister(): void {
    this.registeredViewCount--;

    if (this.registeredViewCount <= 0) {
      this.registeredViewCount = 0;
      this.stop();
    }
  }

  /**
   * Start the render loop
   */
  private start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    const tick = () => {
      // Just emit tick - projections are kept fresh by event listeners
      // Views read cached state and stack: model → preview → hover
      const startMs = performance.now();
      this.emit('tick');
      this.lastTickMs = performance.now() - startMs;

      // Schedule next frame
      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(tick);
      }
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  /**
   * Stop the render loop
   */
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

  /**
   * Force an immediate tick (for testing or manual refresh)
   */
  forceTick(): void {
    this.emit('tick');
  }
}

export const renderLoop = RenderLoop.getInstance();
