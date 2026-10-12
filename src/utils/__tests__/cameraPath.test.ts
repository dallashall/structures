import { describe, it, expect } from 'vitest';
import type { CameraMode, CameraScene } from '../cameraPath';
import { toCameraBounds, toCameraPose } from '../cameraPath';

const SCENE: CameraScene = {
  center: { x: 0, y: 4, z: -10 },
  radius: 6,
  bottom: 0,
  top: 8,
  rising: false,
  eye: { x: 0, y: 1.62, z: 0 },
  forward: { x: 0, y: 0, z: -1 },
};

const RISING: CameraScene = { ...SCENE, rising: true };

const angleAround = (scene: CameraScene, t: number): number => {
  const { location } = toCameraPose('orbit', scene, t);
  return Math.atan2(location.z - scene.center.z, location.x - scene.center.x);
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
    expect(pose.location.y).toBeGreaterThan(SCENE.center.y);
    expect(pose.facing).toEqual(SCENE.center);
  });

  it('orbits slower near its ends than in its middle', () => {
    const turn = (from: number, to: number): number => Math.abs(angleAround(SCENE, to) - angleAround(SCENE, from));
    expect(turn(0.45, 0.5)).toBeGreaterThan(turn(0.15, 0.2) * 1.5);
  });

  it('starts low on a rising build and climbs with its layers', () => {
    const early = toCameraPose('orbit', RISING, 0.15);
    const middle = toCameraPose('orbit', RISING, 0.5);
    const late = toCameraPose('orbit', RISING, 0.65);
    expect(early.facing.y).toBeLessThan(RISING.center.y / 2);
    expect(middle.facing.y).toBeCloseTo(RISING.center.y, 6);
    expect(late.facing.y).toBeGreaterThan(middle.facing.y);
    expect(early.location.y).toBeLessThan(middle.location.y);
    expect(early.location.y).toBeGreaterThan(early.facing.y);
    expect(late.location.y).toBeLessThan(late.facing.y);
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
      bottom: 0,
      top: 3,
    });
  });
});
