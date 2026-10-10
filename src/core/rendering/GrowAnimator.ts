/**
 * GrowAnimator - Scales block instances in and out on a stagger
 *
 * One onBeforeRender observer drives every tween, so a fill of thousands of blocks costs
 * one loop per frame instead of one Babylon Animatable per block.
 * Scaling is uniform about the instance's center, which is the center of its cell.
 */

import type { AbstractMesh, Observer, Scene } from '@babylonjs/core';

// Every block of one update finishes within this window
export const SEQUENCE_MS = 500;
// Time one block takes to grow or shrink
export const STEP_MS = 150;
// Larger updates appear at once. Per-frame cost grows with the number of live tweens.
export const MAX_ANIMATED = 2000;

export interface StepTiming {
  delayMs: number;
  durationMs: number;
}

/**
 * Timing for the block at `index` of `count`, so the last block finishes at SEQUENCE_MS.
 * Returns null when the update is too large to animate.
 */
export function staggerTiming(index: number, count: number): StepTiming | null {
  if (count > MAX_ANIMATED) return null;
  const spread = count > 1 ? (SEQUENCE_MS - STEP_MS) / (count - 1) : 0;
  return { delayMs: index * spread, durationMs: STEP_MS };
}

// Overshoots to about 1.1 before it settles, so a block reads as popping into place
const easeOutBack = (t: number): number => {
  const overshoot = 1.70158;
  const shifted = t - 1;
  return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2;
};

const easeInCubic = (t: number): number => t ** 3;

interface Tween {
  mesh: AbstractMesh;
  startMs: number;
  durationMs: number;
  from: number;
  to: number;
  ease: (t: number) => number;
  onDone: (() => void) | null;
}

export class GrowAnimator {
  private scene: Scene;
  private tweens = new Map<AbstractMesh, Tween>();
  private observer: Observer<Scene> | null = null;
  private onSettled: (() => void) | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Run once each time the last live tween finishes
   */
  setSettledCallback(onSettled: () => void): void {
    this.onSettled = onSettled;
  }

  /**
   * Scale from 0 to full size. The mesh stays invisible (scale 0) until its delay passes.
   */
  grow(mesh: AbstractMesh, timing: StepTiming): void {
    mesh.scaling.setAll(0);
    this.start({ mesh, from: 0, to: 1, ease: easeOutBack, onDone: null }, timing);
  }

  /**
   * Scale from the current size to 0, then call onDone. A mesh mid-grow shrinks from where it is.
   */
  shrink(mesh: AbstractMesh, timing: StepTiming, onDone: () => void): void {
    this.start({ mesh, from: mesh.scaling.x, to: 0, ease: easeInCubic, onDone }, timing);
  }

  /**
   * Stop a mesh's tween and leave it at full size
   */
  cancel(mesh: AbstractMesh): void {
    if (this.tweens.delete(mesh)) {
      mesh.scaling.setAll(1);
    }
  }

  /**
   * Stop every tween without running onDone. Callers dispose the meshes themselves.
   */
  clear(): void {
    this.tweens.clear();
    this.detach();
  }

  dispose(): void {
    this.clear();
  }

  private start(
    tween: Omit<Tween, 'startMs' | 'durationMs'>,
    { delayMs, durationMs }: StepTiming,
  ): void {
    this.tweens.set(tween.mesh, { ...tween, startMs: performance.now() + delayMs, durationMs });
    if (!this.observer) {
      this.observer = this.scene.onBeforeRenderObservable.add(this.step);
    }
  }

  private step = (): void => {
    const now = performance.now();
    const finished: Tween[] = [];

    for (const tween of this.tweens.values()) {
      const t = Math.min(1, Math.max(0, (now - tween.startMs) / tween.durationMs));
      tween.mesh.scaling.setAll(tween.from + (tween.to - tween.from) * tween.ease(t));
      if (t >= 1) finished.push(tween);
    }

    // Shrinks finish by disposing their mesh. Each dispose would otherwise free the active-mesh lists.
    this.scene.blockfreeActiveMeshesAndRenderingGroups = true;
    for (const tween of finished) {
      this.tweens.delete(tween.mesh);
      tween.mesh.scaling.setAll(tween.to);
      tween.onDone?.();
    }
    this.scene.blockfreeActiveMeshesAndRenderingGroups = false;

    if (finished.length > 0 && this.tweens.size === 0) {
      this.detach();
      this.onSettled?.();
    }
  };

  private detach(): void {
    if (this.observer) {
      this.scene.onBeforeRenderObservable.remove(this.observer);
      this.observer = null;
    }
  }
}
