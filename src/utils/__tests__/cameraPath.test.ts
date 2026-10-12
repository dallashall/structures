import { describe, it, expect } from 'vitest';
import type { CameraMode, CameraPose, CameraScene, Vec3 } from '../cameraPath';
import { CAMERA_KEYS_PER_SECOND, toCameraBounds, toCameraKeys, toCameraSeconds } from '../cameraPath';

const SCENE: CameraScene = {
  center: { x: 0, y: 4, z: -10 },
  radius: 6,
  bottom: 0,
  top: 8,
  rising: false,
  buildSeconds: 6.8,
  eye: { x: 0, y: 1.62, z: 0 },
  forward: { x: 0, y: 0, z: -1 },
};
const RISING: CameraScene = { ...SCENE, rising: true };
// The player stands to one side of the build, still facing north
const SIDE_ON: CameraScene = { ...SCENE, eye: { x: 10, y: 1.62, z: -6 } };
const FIRST_PERSON: CameraPose = { location: SCENE.eye, facing: { x: 0, y: 1.62, z: -8 } };

const distance = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const toDirection = ({ location, facing }: CameraPose): Vec3 => {
  const length = distance(location, facing);
  return { x: (facing.x - location.x) / length, y: (facing.y - location.y) / length, z: (facing.z - location.z) / length };
};
const toTurnDegrees = (a: CameraPose, b: CameraPose): number => {
  const u = toDirection(a);
  const v = toDirection(b);
  return (Math.acos(Math.min(1, u.x * v.x + u.y * v.y + u.z * v.z)) * 180) / Math.PI;
};
// Blocks per second, or degrees per second, from each key to the next
const toSpeeds = (keys: CameraPose[]): number[] => {
  const toSpeed = (key: CameraPose, i: number): number => distance(keys[i].location, key.location) * CAMERA_KEYS_PER_SECOND;
  return keys.slice(1).map(toSpeed);
};
const toTurnRates = (keys: CameraPose[]): number[] => {
  const toTurnRate = (key: CameraPose, i: number): number => toTurnDegrees(keys[i], key) * CAMERA_KEYS_PER_SECOND;
  return keys.slice(1).map(toTurnRate);
};
const keyAt = (seconds: number): number => Math.round(seconds * CAMERA_KEYS_PER_SECOND);
// The orbit's target is back at the eyes 1.5 s of circling plus a 2 s return after the last block lands
const RETURN_ENDS = SCENE.buildSeconds + 3.5;

describe('toCameraKeys', () => {
  it('has no keys when the player keeps control', () => {
    expect(toCameraKeys('none', SCENE)).toEqual([]);
  });

  it.each(['orbit', 'lookAround'] as CameraMode[])('%s starts and ends exactly in the player\'s first-person view', (mode) => {
    const keys = toCameraKeys(mode, SCENE);
    expect(keys).toHaveLength(Math.ceil(toCameraSeconds(mode, SCENE.buildSeconds) * CAMERA_KEYS_PER_SECOND) + 1);
    for (const key of [keys[0], keys[keys.length - 1]]) {
      expect(distance(key.location, FIRST_PERSON.location)).toBeLessThan(1e-9);
      expect(distance(key.facing, FIRST_PERSON.facing)).toBeLessThan(1e-9);
    }
  });

  it('repeats the same keys, shake included, so the game and the preview match', () => {
    expect(toCameraKeys('orbit', RISING)).toEqual(toCameraKeys('orbit', RISING));
  });

  it.each([
    ['orbit', toSpeeds],
    ['lookAround', toTurnRates],
  ] as [CameraMode, (keys: CameraPose[]) => number[]][])('%s is slow to start and slow to stop, like a heavy camera', (mode, toRates) => {
    const rates = toRates(toCameraKeys(mode, SCENE));
    const peak = Math.max(...rates);
    expect(rates[0]).toBeLessThan(0.2 * peak);
    for (let i = 1; i < 5; i++) expect(rates[i]).toBeGreaterThan(rates[i - 1]);
    // The last step is the snap onto the eyes, so the settle is measured before it
    const settle = rates.slice(-6, -1);
    expect(Math.max(...settle)).toBeLessThan(0.05 * peak);
  });

  it('drifts a little past the player\'s facing at the end of a look-around, then settles back', () => {
    const keys = toCameraKeys('lookAround', SCENE);
    const toYawDegrees = ({ location, facing }: CameraPose): number =>
      (Math.atan2(facing.x - location.x, location.z - facing.z) * 180) / Math.PI;
    const yaws = keys.slice(keyAt(SCENE.buildSeconds)).map(toYawDegrees);
    const past = Math.max(...yaws);
    expect(yaws[0]).toBeLessThan(0);
    expect(past).toBeGreaterThan(0.5);
    expect(past).toBeLessThan(5);
    expect(Math.abs(yaws[yaws.length - 2])).toBeLessThan(0.2);
  });

  it('never jolts: speed changes by under a quarter of its peak from one key to the next', () => {
    const speeds = toSpeeds(toCameraKeys('orbit', RISING)).slice(0, -1);
    const peak = Math.max(...speeds);
    for (let i = 1; i < speeds.length; i++) expect(Math.abs(speeds[i] - speeds[i - 1])).toBeLessThan(0.25 * peak);
  });

  it('keeps moving from the pull-out until it is back at the eyes', () => {
    const speeds = toSpeeds(toCameraKeys('orbit', SCENE));
    const peak = Math.max(...speeds);
    const moving = speeds.slice(keyAt(1.5), keyAt(RETURN_ENDS - 0.5));
    expect(Math.min(...moving)).toBeGreaterThan(0.25 * peak);
  });

  it('turns the view toward the player\'s facing without a stall and surge on the way back', () => {
    const keys = toCameraKeys('orbit', SIDE_ON);
    const rates = toTurnRates(keys.slice(keyAt(SCENE.buildSeconds + 1.5), -1));
    const peak = Math.max(...rates);
    const beforePeak = rates.slice(0, rates.indexOf(peak));
    expect(Math.min(...beforePeak, peak)).toBeGreaterThan(0.3 * peak);
  });

  it('circles the build from well back while it lands', () => {
    const keys = toCameraKeys('orbit', SCENE);
    const middle = keys[keyAt(SCENE.buildSeconds / 2)];
    const horizontal = Math.hypot(middle.location.x - SCENE.center.x, middle.location.z - SCENE.center.z);
    expect(horizontal).toBeGreaterThan(SCENE.radius * 1.6);
    expect(middle.location.y).toBeGreaterThan(SCENE.center.y);
  });

  it('starts low on a rising build and tilts up late, keeping its aim below the landed layers', () => {
    const keys = toCameraKeys('orbit', RISING);
    const early = keys[keyAt(1.5)];
    const landed = keys[keyAt(RISING.buildSeconds)];
    expect(early.facing.y).toBeLessThan(RISING.center.y / 2);
    expect(landed.facing.y).toBeGreaterThan(early.facing.y);
    expect(landed.facing.y).toBeLessThan(RISING.center.y);
    expect(early.location.y).toBeLessThan(landed.location.y);
  });

  it('turns the look-around view a full circle from the eyes, tilting up halfway', () => {
    const keys = toCameraKeys('lookAround', SCENE);
    const middle = keys[keyAt(SCENE.buildSeconds / 2)];
    expect(distance(middle.location, SCENE.eye)).toBeLessThan(0.6);
    expect(middle.facing.y).toBeGreaterThan(SCENE.eye.y);
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
