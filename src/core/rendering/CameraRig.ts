/**
 * CameraRig - Frames, orbits, pans, and zooms the 3D camera
 *
 * Turntable model: alpha turns around the vertical axis, beta tilts, and the target is the pivot.
 * Pointer and wheel input arrive from CameraGestures. BabylonJS's own pointer and wheel inputs
 * are removed, so these methods are the only path that moves the camera.
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

// Pixels of drag per radian of orbit, before inertia.
// Inertia 0.6 multiplies each offset by 1 / (1 - 0.6) = 2.5, so 250 gives 100px per radian in total.
const ANGULAR_SENSIBILITY = 250;
const INERTIA = 0.6;
// Radians of orbit per pixel of trackpad scroll. Applied directly, without inertia.
const SCROLL_ORBIT_SPEED = 0.005;
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

const DEFAULT_ALPHA = Math.PI / 4;
const DEFAULT_BETA = Math.PI / 3;

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
    y: dimensions.depth / 2,
    z: dimensions.height / 2,
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
    this.camera.attachControl(canvas, true);

    this.camera.lowerRadiusLimit = LOWER_RADIUS_LIMIT;
    this.camera.upperRadiusLimit = MIN_UPPER_RADIUS_LIMIT;
    this.camera.lowerBetaLimit = BETA_MARGIN;
    this.camera.upperBetaLimit = Math.PI - BETA_MARGIN;
    this.camera.inertia = INERTIA;
  }

  getCamera(): ArcRotateCamera {
    return this.camera;
  }

  /**
   * Orbit by a pointer drag, in CSS pixels. Inertia carries the motion after release.
   */
  orbitByDrag(dx: number, dy: number): void {
    this.stopAnimation();
    this.camera.inertialAlphaOffset -= dx / ANGULAR_SENSIBILITY;
    this.camera.inertialBetaOffset -= dy / ANGULAR_SENSIBILITY;
  }

  /**
   * Orbit by a trackpad scroll, in CSS pixels. The trackpad supplies its own momentum.
   */
  orbitByScroll(dx: number, dy: number): void {
    this.stopAnimation();
    this.camera.alpha -= dx * SCROLL_ORBIT_SPEED;
    this.camera.beta = this.clampBeta(this.camera.beta - dy * SCROLL_ORBIT_SPEED);
  }

  /**
   * Move the pivot parallel to the screen so the scene follows the pointer, in CSS pixels
   */
  pan(dx: number, dy: number, viewportHeight: number): void {
    this.stopAnimation();
    const worldPerPixel = (2 * this.camera.radius * Math.tan(this.camera.fov / 2)) / viewportHeight;
    const right = this.camera.getDirection(Vector3.Right());
    const up = this.camera.getDirection(Vector3.Up());
    this.camera.target.addInPlace(right.scaleInPlace(-dx * worldPerPixel));
    this.camera.target.addInPlace(up.scaleInPlace(dy * worldPerPixel));
  }

  /**
   * Zoom by a factor (above 1 zooms in), keeping the point under (x, y) fixed on screen.
   * The fixed point lies on the plane through the pivot that faces the camera.
   */
  zoomAt(factor: number, x: number, y: number): void {
    this.stopAnimation();
    const camera = this.camera;
    const oldRadius = camera.radius;
    const newRadius = Math.min(
      camera.upperRadiusLimit ?? Infinity,
      Math.max(camera.lowerRadiusLimit ?? 0, oldRadius / factor),
    );
    if (newRadius === oldRadius) return;

    const anchor = this.pointOnPivotPlane(x, y);
    const scale = newRadius / oldRadius;
    // Scaling the whole rig about the anchor keeps the anchor's screen position
    if (anchor) {
      const offset = camera.target.subtract(anchor).scaleInPlace(scale);
      camera.target.copyFrom(anchor.addInPlace(offset));
    }
    camera.radius = newRadius;
  }

  /**
   * Change distance by a fixed amount, toward the pivot
   */
  zoomCamera(delta: number): void {
    this.stopAnimation();
    this.camera.radius = Math.max(
      this.camera.lowerRadiusLimit ?? 0,
      Math.min(this.camera.upperRadiusLimit ?? Infinity, this.camera.radius + delta),
    );
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
        alpha: this.camera.alpha,
        beta: this.camera.beta,
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
    const center = Vector3.Center(min, max);

    // Basis for the current angles. Only the axis lengths matter, so the handedness of right and up does not.
    const forward = new Vector3(
      -Math.cos(camera.alpha) * Math.sin(camera.beta),
      -Math.cos(camera.beta),
      -Math.sin(camera.alpha) * Math.sin(camera.beta),
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
    this.moveTo({ alpha: camera.alpha, beta: camera.beta, radius: distance, target: center }, animate);
  }

  /**
   * Re-frame the last framed structure, keeping the viewing angle
   */
  frameLastStructure(): void {
    this.frameStructure(this.framedDimensions, true);
  }

  /**
   * Set camera to a preset view
   *
   * Our coordinate system: X=width, Y=depth, Z=height (Z-up, right-handed)
   * Babylon system: X, Z, Y (Y-up, left-handed)
   */
  setCameraView(view: CameraView): void {
    const angles = VIEW_ANGLES[view];
    this.moveTo(
      {
        alpha: angles.alpha,
        beta: angles.beta,
        radius: this.camera.radius,
        target: this.camera.target.clone(),
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
  }

  private clampBeta(beta: number): number {
    return Math.min(Math.PI - BETA_MARGIN, Math.max(BETA_MARGIN, beta));
  }

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
    camera.inertialAlphaOffset = 0;
    camera.inertialBetaOffset = 0;

    const goalAlpha = nearestAngle(camera.alpha, goal.alpha);
    const goalBeta = this.clampBeta(goal.beta);

    if (!animate) {
      camera.alpha = goalAlpha;
      camera.beta = goalBeta;
      camera.radius = goal.radius;
      camera.target.copyFrom(goal.target);
      return;
    }

    const start = {
      alpha: camera.alpha,
      beta: camera.beta,
      radius: camera.radius,
      target: camera.target.clone(),
    };
    // Wall-clock time: the shared RenderLoop calls scene.render() directly, so engine.getDeltaTime() stays 0
    const startMs = performance.now();

    const step = (): void => {
      const t = Math.min(1, (performance.now() - startMs) / ANIMATION_MS);
      const k = easeOutCubic(t);
      camera.alpha = start.alpha + (goalAlpha - start.alpha) * k;
      camera.beta = start.beta + (goalBeta - start.beta) * k;
      camera.radius = start.radius + (goal.radius - start.radius) * k;
      Vector3.LerpToRef(start.target, goal.target, k, camera.target);
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
