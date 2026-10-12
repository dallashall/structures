/**
 * CameraRig - Frames, orbits, pans, and zooms the 3D camera
 *
 * Turntable model: alpha turns around the vertical axis, beta tilts, and the target is the pivot.
 * Pointer and wheel input arrive from CameraGestures. BabylonJS's own pointer, wheel, and
 * keyboard inputs are removed, so these methods are the only path that moves the camera.
 *
 * Gestures move a goal pose. Once per frame the camera eases toward it, so motion is even
 * between frames and still ends exactly where the gesture points. Animated moves (presets,
 * framing) drive the camera directly and hand back to the goal when they finish.
 */

import {
  ArcRotateCamera,
  Observer,
  Plane,
  Ray,
  Scene,
  Vector3,
} from '@babylonjs/core';
import { toBabylonVector } from './babylonUtils';

import type { Dimensions } from '../../types';

// Pixels of pointer drag per radian of orbit
const DRAG_PIXELS_PER_RADIAN = 100;
// Radians of orbit per pixel of trackpad scroll
const SCROLL_ORBIT_SPEED = 0.005;
// Time constant of the per-frame ease toward the goal pose. Input events do not line up
// with frames, so applying them directly moves the camera unevenly from frame to frame.
const FOLLOW_TIME_MS = 60;
// Beta 0 and PI are the poles, where alpha becomes undefined and the view flips
const BETA_MARGIN = 0.01;
const LOWER_RADIUS_LIMIT = 2;
const FRAME_DISTANCE = 2;
// Furthest zoom-out, as a multiple of the largest structure dimension
const MAX_DISTANCE_FACTOR = 6;
const MIN_UPPER_RADIUS_LIMIT = 100;
const ANIMATION_MS = 300;
// Share of each viewport edge kept clear when fitting the model to the view
const FIT_PADDING = 0.08;

export const DEFAULT_ALPHA = Math.PI / 4;
export const DEFAULT_BETA = Math.PI / 3;

const VIEW_ANGLES = {
  left: { alpha: 0, beta: Math.PI / 2 },
  right: { alpha: Math.PI, beta: Math.PI / 2 },
  front: { alpha: -Math.PI / 2, beta: Math.PI / 2 },
  back: { alpha: Math.PI / 2, beta: Math.PI / 2 },
  top: { alpha: -Math.PI / 2, beta: BETA_MARGIN },
  bottom: { alpha: -Math.PI / 2, beta: Math.PI - BETA_MARGIN },
};

export type CameraView = keyof typeof VIEW_ANGLES;

interface CameraGoal {
  alpha: number;
  beta: number;
  radius: number;
  target: Vector3;
}

const structureCenter = (dimensions: Dimensions): Vector3 =>
  toBabylonVector({
    x: dimensions.width / 2,
    y: dimensions.height / 2,
    z: dimensions.depth / 2,
  });

const maxDimension = (dimensions: Dimensions): number =>
  Math.max(dimensions.width, dimensions.height, dimensions.depth);

// Equivalent of `goal` within PI of `current`, so a tween turns the short way around
const nearestAngle = (current: number, goal: number): number =>
  goal + 2 * Math.PI * Math.round((current - goal) / (2 * Math.PI));

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

export class CameraRig {
  private camera: ArcRotateCamera;
  private framedDimensions: Dimensions = { width: 10, height: 10, depth: 10 };
  private tween: Observer<Scene> | null = null;
  private goal: CameraGoal;
  private lastFrameMs = performance.now();
  private follower: Observer<Scene>;
  // Set while the build preview flies the camera. The rig keeps its hands off until the preview ends.
  private drivenFrom: CameraGoal | null = null;

  constructor(private scene: Scene, canvas: HTMLCanvasElement) {
    this.camera = new ArcRotateCamera(
      'camera',
      DEFAULT_ALPHA,
      DEFAULT_BETA,
      20,
      structureCenter(this.framedDimensions),
      scene,
    );

    this.camera.inputs.removeByType('ArcRotateCameraPointersInput');
    this.camera.inputs.removeByType('ArcRotateCameraMouseWheelInput');
    this.camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
    this.camera.attachControl(canvas, true);

    this.camera.lowerRadiusLimit = LOWER_RADIUS_LIMIT;
    this.camera.upperRadiusLimit = MIN_UPPER_RADIUS_LIMIT;
    this.camera.lowerBetaLimit = BETA_MARGIN;
    this.camera.upperBetaLimit = Math.PI - BETA_MARGIN;
    this.camera.inertia = 0;

    this.goal = this.currentPose();
    this.follower = scene.onBeforeRenderObservable.add(this.followGoal);
  }

  getCamera(): ArcRotateCamera {
    return this.camera;
  }

  /**
   * Orbit by a pointer drag, in CSS pixels
   */
  orbitByDrag(dx: number, dy: number): void {
    this.beginGesture();
    this.goal.alpha -= dx / DRAG_PIXELS_PER_RADIAN;
    this.goal.beta = this.clampBeta(this.goal.beta - dy / DRAG_PIXELS_PER_RADIAN);
  }

  /**
   * Orbit by a trackpad scroll, in CSS pixels. The trackpad supplies its own momentum.
   */
  orbitByScroll(dx: number, dy: number): void {
    this.beginGesture();
    this.goal.alpha -= dx * SCROLL_ORBIT_SPEED;
    this.goal.beta = this.clampBeta(this.goal.beta - dy * SCROLL_ORBIT_SPEED);
  }

  /**
   * Move the pivot parallel to the screen so the scene follows the pointer, in CSS pixels
   */
  pan(dx: number, dy: number, viewportHeight: number): void {
    this.beginGesture();
    const worldPerPixel = (2 * this.goal.radius * Math.tan(this.camera.fov / 2)) / viewportHeight;
    const right = this.camera.getDirection(Vector3.Right());
    const up = this.camera.getDirection(Vector3.Up());
    this.goal.target.addInPlace(right.scaleInPlace(-dx * worldPerPixel));
    this.goal.target.addInPlace(up.scaleInPlace(dy * worldPerPixel));
  }

  /**
   * Zoom by a factor (above 1 zooms in), keeping the point under (x, y) fixed on screen.
   * The fixed point lies on the plane through the pivot that faces the camera.
   */
  zoomAt(factor: number, x: number, y: number): void {
    this.beginGesture();
    const oldRadius = this.goal.radius;
    const newRadius = this.clampRadius(oldRadius / factor);
    if (newRadius === oldRadius) return;

    const anchor = this.pointOnPivotPlane(x, y);
    // Scaling the whole rig about the anchor keeps the anchor's screen position
    if (anchor) {
      const offset = this.goal.target.subtract(anchor).scaleInPlace(newRadius / oldRadius);
      this.goal.target.copyFrom(anchor.addInPlace(offset));
    }
    this.goal.radius = newRadius;
  }

  /**
   * Change distance by a fixed amount, toward the pivot
   */
  zoomCamera(delta: number): void {
    this.beginGesture();
    this.goal.radius = this.clampRadius(this.goal.radius + delta);
  }

  /**
   * Jump the camera to the goal pose, skipping the ease and any animation.
   * For callers that read the camera synchronously, such as tests.
   */
  settle(): void {
    this.stopAnimation();
    this.applyPose(this.goal);
  }

  /**
   * Center the pivot on the structure and back off to see all of it. Keeps the viewing angle.
   */
  frameStructure(dimensions: Dimensions, animate: boolean): void {
    this.framedDimensions = dimensions;
    const largest = maxDimension(dimensions);
    this.camera.upperRadiusLimit = Math.max(MIN_UPPER_RADIUS_LIMIT, largest * MAX_DISTANCE_FACTOR);

    this.moveTo(
      {
        alpha: this.goal.alpha,
        beta: this.goal.beta,
        radius: largest * FRAME_DISTANCE,
        target: structureCenter(dimensions),
      },
      animate,
    );
  }

  /**
   * Zoom and pan so an axis-aligned box fills the view, keeping the viewing angle.
   * Every corner of the box lands inside the viewport with FIT_PADDING clear on each edge.
   */
  fitBounds(min: Vector3, max: Vector3, animate = true): void {
    const camera = this.camera;
    const { alpha, beta } = this.goal;
    const center = Vector3.Center(min, max);

    // Basis for the goal angles. Only the axis lengths matter, so the handedness of right and up does not.
    const forward = new Vector3(
      -Math.cos(alpha) * Math.sin(beta),
      -Math.cos(beta),
      -Math.sin(alpha) * Math.sin(beta),
    );
    const right = Vector3.Cross(Vector3.Up(), forward).normalize();
    const up = Vector3.Cross(forward, right).normalize();

    const usable = 1 - 2 * FIT_PADDING;
    const tanVertical = Math.tan(camera.fov / 2) * usable;
    const tanHorizontal = tanVertical * this.scene.getEngine().getAspectRatio(camera);

    // A corner at offset o from the pivot sits at depth (distance + o.forward) from the camera.
    // It stays on screen while |o.right| <= depth * tanHorizontal and |o.up| <= depth * tanVertical.
    let distance = camera.lowerRadiusLimit ?? 0;
    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) {
          const offset = new Vector3(x, y, z).subtractInPlace(center);
          const depthOffset = Vector3.Dot(offset, forward);
          distance = Math.max(
            distance,
            Math.abs(Vector3.Dot(offset, right)) / tanHorizontal - depthOffset,
            Math.abs(Vector3.Dot(offset, up)) / tanVertical - depthOffset,
          );
        }
      }
    }

    camera.upperRadiusLimit = Math.max(camera.upperRadiusLimit ?? 0, distance);
    this.moveTo({ alpha, beta, radius: distance, target: center }, animate);
  }

  /**
   * Re-frame the last framed structure, keeping the viewing angle
   */
  frameLastStructure(): void {
    this.frameStructure(this.framedDimensions, true);
  }

  /**
   * VIEW_ANGLES are in Babylon space, where model Z is up (see toBabylonVector)
   */
  setCameraView(view: CameraView): void {
    const angles = VIEW_ANGLES[view];
    this.moveTo(
      {
        alpha: angles.alpha,
        beta: angles.beta,
        radius: this.goal.radius,
        target: this.goal.target.clone(),
      },
      true,
    );
  }

  /**
   * Return to the default angle, framed on the structure
   */
  resetCamera(): void {
    this.moveTo(
      {
        alpha: DEFAULT_ALPHA,
        beta: DEFAULT_BETA,
        radius: maxDimension(this.framedDimensions) * FRAME_DISTANCE,
        target: structureCenter(this.framedDimensions),
      },
      true,
    );
  }

  destroy(): void {
    this.stopAnimation();
    this.scene.onBeforeRenderObservable.remove(this.follower);
  }

  private clampBeta(beta: number): number {
    return Math.min(Math.PI - BETA_MARGIN, Math.max(BETA_MARGIN, beta));
  }

  private clampRadius(radius: number): number {
    return Math.min(
      this.camera.upperRadiusLimit ?? Infinity,
      Math.max(this.camera.lowerRadiusLimit ?? 0, radius),
    );
  }

  /**
   * Hands the camera to the caller, which then moves it with drive() until endDrive()
   */
  beginDrive(): void {
    this.stopAnimation();
    this.drivenFrom ??= { ...this.goal, target: this.goal.target.clone() };
  }

  /**
   * Puts the camera at `location` looking at `facing`, both in Babylon space, with no easing
   */
  drive(location: Vector3, facing: Vector3): void {
    if (!this.drivenFrom) return;
    this.camera.target.copyFrom(facing);
    this.camera.setPosition(location);
  }

  /**
   * Eases back to the view the camera had before beginDrive()
   */
  endDrive(): void {
    const from = this.drivenFrom;
    if (!from) return;
    this.drivenFrom = null;
    this.goal = this.currentPose();
    this.moveTo(from, true);
  }

  private currentPose(): CameraGoal {
    return {
      alpha: this.camera.alpha,
      beta: this.camera.beta,
      radius: this.camera.radius,
      target: this.camera.target.clone(),
    };
  }

  private applyPose(pose: CameraGoal): void {
    this.camera.alpha = pose.alpha;
    this.camera.beta = pose.beta;
    this.camera.radius = pose.radius;
    this.camera.target.copyFrom(pose.target);
  }

  /**
   * A gesture interrupts an animated move and continues from where the camera is now
   */
  private beginGesture(): void {
    if (!this.tween) return;
    this.stopAnimation();
    this.goal = this.currentPose();
  }

  private followGoal = (): void => {
    // Wall-clock time: the shared RenderLoop calls scene.render() directly, so engine.getDeltaTime() stays 0
    const now = performance.now();
    const elapsed = now - this.lastFrameMs;
    this.lastFrameMs = now;
    if (this.tween || this.drivenFrom) return;

    const k = 1 - Math.exp(-elapsed / FOLLOW_TIME_MS);
    const camera = this.camera;
    camera.alpha += (this.goal.alpha - camera.alpha) * k;
    camera.beta += (this.goal.beta - camera.beta) * k;
    camera.radius += (this.goal.radius - camera.radius) * k;
    Vector3.LerpToRef(camera.target, this.goal.target, k, camera.target);
  };

  private pointOnPivotPlane(x: number, y: number): Vector3 | null {
    const ray: Ray = this.scene.createPickingRay(x, y, null, this.camera);
    const normal = this.camera.target.subtract(this.camera.position).normalize();
    const plane = Plane.FromPositionAndNormal(this.camera.target, normal);
    const distance = ray.intersectsPlane(plane);
    if (distance === null) return null;
    return ray.origin.add(ray.direction.scale(distance));
  }

  private moveTo(goal: CameraGoal, animate: boolean): void {
    this.stopAnimation();
    const camera = this.camera;
    const end: CameraGoal = {
      alpha: nearestAngle(camera.alpha, goal.alpha),
      beta: this.clampBeta(goal.beta),
      radius: this.clampRadius(goal.radius),
      target: goal.target.clone(),
    };
    this.goal = end;

    if (!animate) {
      this.applyPose(end);
      return;
    }

    const start = this.currentPose();
    const startMs = performance.now();

    const step = (): void => {
      const t = Math.min(1, (performance.now() - startMs) / ANIMATION_MS);
      const k = easeOutCubic(t);
      camera.alpha = start.alpha + (end.alpha - start.alpha) * k;
      camera.beta = start.beta + (end.beta - start.beta) * k;
      camera.radius = start.radius + (end.radius - start.radius) * k;
      Vector3.LerpToRef(start.target, end.target, k, camera.target);
      if (t >= 1) this.stopAnimation();
    };

    this.tween = this.scene.onBeforeRenderObservable.add(step);
  }

  private stopAnimation(): void {
    if (!this.tween) return;
    this.scene.onBeforeRenderObservable.remove(this.tween);
    this.tween = null;
  }
}
