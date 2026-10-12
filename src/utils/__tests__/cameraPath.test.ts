import { describe, it, expect } from 'vitest';
import type { CameraMode, CameraPose, CameraScene } from '../cameraPath';
import { toCameraBounds, toCameraPose, toCameraTicks } from '../cameraPath';

const SCENE: CameraScene = {
  center: { x: 0, y: 4, z: -10 },
  radius: 6,
  bottom: 0,
  top: 8,
  rising: false,
  landedAt: 0.8,
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
    expect(distance(pose.location, SCENE.center)).toBeCloseTo(13.2, 1);
    expect(pose.location.y).toBeGreaterThan(SCENE.center.y);
    expect(pose.facing).toEqual(SCENE.center);
  });

  it('stops behind the player when the last block lands, holds, then comes back into their eyes', () => {
    const landed = toCameraPose('orbit', SCENE, SCENE.landedAt);
    expect(distance(landed.location, SCENE.center)).toBeCloseTo(13.2, 1);
    expect(Math.atan2(landed.location.z - SCENE.center.z, landed.location.x - SCENE.center.x)).toBeCloseTo(
      Math.atan2(SCENE.eye.z - SCENE.center.z, SCENE.eye.x - SCENE.center.x),
      6,
    );
    const holding = toCameraPose('orbit', SCENE, SCENE.landedAt + (1 - SCENE.landedAt) * 0.45);
    expect(holding).toEqual(landed);
    const returning = toCameraPose('orbit', SCENE, SCENE.landedAt + (1 - SCENE.landedAt) * 0.75);
    expect(distance(returning.location, SCENE.eye)).toBeLessThan(distance(landed.location, SCENE.eye));
  });

  it('adds a return to the orbit path only', () => {
    expect(toCameraTicks('orbit', 136)).toBeGreaterThan(136);
    expect(toCameraTicks('lookAround', 136)).toBe(136);
  });

  it('orbits slower near its ends than in its middle', () => {
    const turn = (from: number, to: number): number => Math.abs(angleAround(SCENE, to) - angleAround(SCENE, from));
    expect(turn(0.45, 0.5)).toBeGreaterThan(turn(0.15, 0.2) * 1.5);
  });

  it('starts low on a rising build and climbs with its layers', () => {
    const atBuild = (share: number): number => share * RISING.landedAt;
    const early = toCameraPose('orbit', RISING, atBuild(0.15));
    const middle = toCameraPose('orbit', RISING, atBuild(0.5));
    const late = toCameraPose('orbit', RISING, atBuild(0.65));
    const pitch = ({ location, facing }: CameraPose): number =>
      Math.atan2(facing.y - location.y, Math.hypot(facing.x - location.x, facing.z - location.z));
    expect(early.facing.y).toBeLessThan(RISING.center.y / 2);
    expect(late.facing.y).toBeGreaterThan(middle.facing.y);
    expect(late.facing.y).toBeLessThan(RISING.center.y);
    expect(early.location.y).toBeLessThan(middle.location.y);
    expect(pitch(middle)).toBeGreaterThan(pitch(early));
    expect(pitch(late)).toBeGreaterThan(pitch(middle));
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
