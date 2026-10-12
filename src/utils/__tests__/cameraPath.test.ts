import { describe, it, expect } from 'vitest';
import type { CameraMode, CameraPose, CameraScene, Vec3 } from '../cameraPath';
import { toCameraBounds, toCameraPose, toCameraTicks } from '../cameraPath';

const SCENE: CameraScene = {
  center: { x: 0, y: 4, z: -10 },
  radius: 6,
  bottom: 0,
  top: 8,
  rising: false,
  landedAt: 0.8,
  seconds: 10,
  eye: { x: 0, y: 1.62, z: 0 },
  forward: { x: 0, y: 0, z: -1 },
};

const RISING: CameraScene = { ...SCENE, rising: true };

const angleAround = (scene: CameraScene, t: number): number => {
  const { location } = toCameraPose('orbit', scene, t);
  return Math.atan2(location.z - scene.center.z, location.x - scene.center.x);
};

// Largest shake in the test, with headroom over the path's WOBBLE_DEGREES and WOBBLE_LOCATION
const WOBBLE_BOUND_DEGREES = 2;
const WOBBLE_BOUND = 0.3;
const toAimTurn = (pose: CameraPose, other: CameraPose): number => {
  const a = { x: pose.facing.x - pose.location.x, y: pose.facing.y - pose.location.y, z: pose.facing.z - pose.location.z };
  const b = { x: other.facing.x - other.location.x, y: other.facing.y - other.location.y, z: other.facing.z - other.location.z };
  const cos = (a.x * b.x + a.y * b.y + a.z * b.z) / (Math.hypot(a.x, a.y, a.z) * Math.hypot(b.x, b.y, b.z));
  return (Math.acos(Math.min(1, cos)) * 180) / Math.PI;
};
const distance3 = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

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
    expect(distance(pose.location, SCENE.center)).toBeCloseTo(13.2, 0);
    expect(pose.location.y).toBeGreaterThan(SCENE.center.y);
    expect(distance3(pose.facing, SCENE.center)).toBeLessThan(WOBBLE_BOUND);
  });

  it.each(['orbit', 'lookAround'] as CameraMode[])('%s wobbles faintly mid-path', (mode) => {
    const still = toCameraPose(mode, { ...SCENE, seconds: 0 }, 0.5);
    const moving = toCameraPose(mode, SCENE, 0.5);
    expect(toAimTurn(moving, still)).toBeGreaterThan(0);
    expect(toAimTurn(moving, still)).toBeLessThan(WOBBLE_BOUND_DEGREES);
    expect(distance3(moving.location, still.location)).toBeLessThan(WOBBLE_BOUND);
  });

  it('keeps circling after the last block lands, then comes back into the player\'s eyes', () => {
    const angleOf = (t: number): number => angleAround({ ...SCENE, seconds: 0 }, t);
    const landed = toCameraPose('orbit', { ...SCENE, seconds: 0 }, SCENE.landedAt);
    expect(distance(landed.location, SCENE.center)).toBeCloseTo(13.2, 0);
    const holdEnd = SCENE.landedAt + (1 - SCENE.landedAt) * 0.5;
    expect(Math.abs(angleOf(holdEnd) - angleOf(holdEnd - 0.01))).toBeGreaterThan(0.01);
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
    expect(distance3(pose.location, SCENE.eye)).toBeLessThan(WOBBLE_BOUND);
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
