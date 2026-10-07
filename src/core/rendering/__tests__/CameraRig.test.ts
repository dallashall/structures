/**
 * CameraRig tests - pan and cursor zoom keep the grabbed point under the pointer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Matrix, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { CameraRig } from '../CameraRig';

const WIDTH = 800;
const HEIGHT = 600;

let scene: Scene;
let rig: CameraRig;

const toScreen = (point: Vector3): Vector3 => {
  const camera = rig.getCamera();
  camera.getViewMatrix(true);
  return Vector3.Project(
    point,
    Matrix.Identity(),
    scene.getTransformMatrix(),
    camera.viewport.toGlobal(WIDTH, HEIGHT),
  );
};

const refreshMatrices = (): void => {
  rig.getCamera().getViewMatrix(true);
  scene.updateTransformMatrix(true);
};

describe('CameraRig', () => {
  beforeEach(() => {
    const engine = new NullEngine({ renderWidth: WIDTH, renderHeight: HEIGHT, textureSize: 256, deterministicLockstep: false, lockstepMaxSteps: 1 });
    scene = new Scene(engine);
    rig = new CameraRig(scene, document.createElement('canvas'));
    rig.frameStructure({ width: 16, height: 16, depth: 16 }, false);
    refreshMatrices();
  });

  it('frames the structure center at twice its largest dimension', () => {
    expect(rig.getCamera().target.asArray()).toEqual([8, 8, 8]);
    expect(rig.getCamera().radius).toBe(32);
  });

  it('pans so the pivot follows the pointer', () => {
    const before = toScreen(rig.getCamera().target.clone());
    const pivot = rig.getCamera().target.clone();

    rig.pan(40, -25, HEIGHT);
    refreshMatrices();

    const after = toScreen(pivot);
    expect(after.x - before.x).toBeCloseTo(40, 0);
    expect(after.y - before.y).toBeCloseTo(-25, 0);
  });

  it('zooms toward the cursor without moving the point under it', () => {
    const camera = rig.getCamera();
    const ray = scene.createPickingRay(600, 150, null, camera);
    const normal = camera.target.subtract(camera.position).normalize();
    const distance = Vector3.Dot(camera.target.subtract(ray.origin), normal) / Vector3.Dot(ray.direction, normal);
    const anchor = ray.origin.add(ray.direction.scale(distance));

    rig.zoomAt(1.5, 600, 150);
    refreshMatrices();

    const screen = toScreen(anchor);
    expect(camera.radius).toBeCloseTo(32 / 1.5);
    expect(screen.x).toBeCloseTo(600, 0);
    expect(screen.y).toBeCloseTo(150, 0);
  });

  it('allows orbiting below the horizon down to the pole margin', () => {
    rig.orbitByScroll(0, -10000);
    expect(rig.getCamera().beta).toBeCloseTo(Math.PI - 0.01);
  });

  it('fits a box inside the padded viewport and touches the padding on at least one edge', () => {
    const min = new Vector3(2, 0, 3);
    const max = new Vector3(14, 6, 9);
    rig.getCamera().alpha = 0.6;
    rig.fitBounds(min, max, false);
    refreshMatrices();

    const corners = [];
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) corners.push(toScreen(new Vector3(x, y, z)));
    const toX = (p: Vector3): number => p.x / WIDTH;
    const toY = (p: Vector3): number => p.y / HEIGHT;
    const xs = corners.map(toX);
    const ys = corners.map(toY);
    const lowest = Math.min(...xs, ...ys);
    const highest = Math.max(...xs, ...ys);

    expect(lowest).toBeGreaterThanOrEqual(0.08 - 1e-6);
    expect(highest).toBeLessThanOrEqual(0.92 + 1e-6);
    const touchesPadding = Math.abs(Math.min(lowest, 1 - highest) - 0.08) < 0.01;
    expect(touchesPadding).toBe(true);
  });
});
