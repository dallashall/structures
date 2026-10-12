import { describe, it, expect } from 'vitest';
import type { CameraMode, CameraScene } from '../cameraPath';
import { toCameraBounds, toCameraPose } from '../cameraPath';

const SCENE: CameraScene = {
  center: { x: 0, y: 4, z: -10 },
  radius: 6,
  top: 8,
  eye: { x: 0, y: 1.62, z: 0 },
  forward: { x: 0, y: 0, z: -1 },
};

const distance = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);

describe('toCameraPose', () => {
  const firstPerson = toCameraPose('none', SCENE, 0.5);

  it.each(['orbit', 'lookAround'] as CameraMode[])('%s starts and ends in the player\'s first-person view', (mode) => {
    for (const t of [0, 1]) {
      const pose = toCameraPose(mode, SCENE, t);
      expect(pose.location.x).toBeCloseTo(firstPerson.location.x, 6);
      expect(pose.location.y).toBeCloseTo(firstPerson.location.y, 6);
      expect(pose.location.z).toBeCloseTo(firstPerson.location.z, 6);
      expect(pose.facing.x).toBeCloseTo(firstPerson.facing.x, 6);
      expect(pose.facing.z).toBeCloseTo(firstPerson.facing.z, 6);
    }
  });

  it('orbits above the build and looks at its center mid-path', () => {
    const pose = toCameraPose('orbit', SCENE, 0.5);
    expect(distance(pose.location, SCENE.center)).toBeCloseTo(9.6, 1);
    expect(pose.location.y).toBeGreaterThan(SCENE.top);
    expect(pose.facing).toEqual(SCENE.center);
  });

  it('looks around from the eye, tilting up halfway through', () => {
    const pose = toCameraPose('lookAround', SCENE, 0.5);
    expect(pose.location).toEqual(SCENE.eye);
    expect(pose.facing.y).toBeGreaterThan(SCENE.eye.y);
  });
});

describe('toCameraBounds', () => {
  it('spans the unit cubes of every cell', () => {
    expect(toCameraBounds([{ x: 0, y: 0, z: 0 }, { x: 3, y: 2, z: 4 }])).toEqual({
      center: { x: 2, y: 1.5, z: 2.5 },
      radius: Math.hypot(4, 5) / 2,
      top: 3,
    });
  });
});
