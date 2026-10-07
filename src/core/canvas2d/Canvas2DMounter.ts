import { Canvas2D } from './Canvas2D';

import type { ViewType } from '../../types';

type CanvasRef = (canvas: HTMLCanvasElement | null) => void;

/**
 * Canvas2DMounter - Stable ref callbacks that create and destroy one Canvas2D per mounted canvas
 *
 * React 18 calls a ref callback with the element on mount and with null on unmount,
 * as long as the callback keeps the same identity across renders. Handing out one callback
 * per view type, created once, ties each Canvas2D to exactly its canvas's mounted lifetime
 * without effects. Canvas2DView keys its canvas by view type, so a view type change remounts it.
 *
 * Constraint: at most one mounted canvas per view type. Both layouts satisfy this.
 */
class Canvas2DMounter {
  private static instance: Canvas2DMounter;
  private refs = new Map<ViewType, CanvasRef>();

  private constructor() {}

  static getInstance(): Canvas2DMounter {
    if (!Canvas2DMounter.instance) {
      Canvas2DMounter.instance = new Canvas2DMounter();
    }
    return Canvas2DMounter.instance;
  }

  refFor(viewType: ViewType): CanvasRef {
    const existing = this.refs.get(viewType);
    if (existing) return existing;

    let mounted: Canvas2D | null = null;
    const mountCanvas: CanvasRef = (canvas) => {
      mounted?.destroy();
      mounted = canvas ? new Canvas2D(canvas, viewType) : null;
    };

    this.refs.set(viewType, mountCanvas);
    return mountCanvas;
  }
}

export const canvas2DMounter = Canvas2DMounter.getInstance();
