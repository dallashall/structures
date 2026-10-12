/**
 * Camera paths for the build animation, shared by the add-on script and the editor's preview
 *
 * Both run in Y-up axes where north is -Z: Bedrock world space, and Babylon space through toBabylonVector.
 * A pose is a camera location and a point it looks at. Every path starts and ends at the player's eyes looking
 * forward, so the camera hands the view back without a jump.
 *
 * The add-on script embeds a copy of toCameraPose, and a test checks that copy against this one.
 */

export type CameraMode = 'none' | 'orbit' | 'lookAround';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraScene {
  // Middle of the build's bounding box
  center: Vec3;
  // Horizontal distance from center to the farthest block
  radius: number;
  // Y of the build's lowest and highest block faces
  bottom: number;
  top: number;
  // True when the build rises layer by layer, so the orbit can follow the rising layer
  rising: boolean;
  // Share of the camera path (0–1) at which the last block lands. toCameraTicks sets the path length.
  landedAt: number;
  // Length of the camera path in seconds
  seconds: number;
  eye: Vec3;
  // Horizontal unit vector the player faces
  forward: Vec3;
}

export interface CameraPose {
  location: Vec3;
  facing: Vec3;
}

// Distance from the eye to the point the camera looks at in first person
const LOOK_DISTANCE = 8;
// Share of the build spent easing out of first person
const BLEND_IN = 0.12;
// Ticks the orbit holds on the finished build, then ticks it spends coming back into the player's eyes
const ORBIT_HOLD_TICKS = 30;
const ORBIT_RETURN_TICKS = 30;
const ORBIT_RADIUS_SCALE = 2.2;
const ORBIT_MIN_RADIUS = 12;
// Camera height above the point it looks at, as a share of the orbit radius, with a floor in blocks
const ORBIT_LIFT_SCALE = 0.35;
const ORBIT_MIN_LIFT = 2;
// On a rising build the camera starts this many blocks above the base and climbs RISE_CLIMB of the build's
// height. Its aim climbs RISE_AIM_CLIMB on the square of build progress, so the aim stays below the landed
// layers and the view tilts up only late in the build.
const RISE_START_LIFT = 2;
const RISE_CLIMB = 0.3;
const RISE_AIM_CLIMB = 0.4;
// How far the look-around view tilts up at its highest, in radians
const LOOK_UP = 0.45;
// Camera key frames per second. The game eases linearly between them.
export const CAMERA_KEYS_PER_SECOND = 10;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });
const smoothstep = (edge0: number, edge1: number, t: number): number => {
  const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
};

// Handheld shake in the manner of After Effects' wiggle(freq, amp): a fresh random target WOBBLE_HZ times a
// second, eased toward, plus a second octave at WOBBLE_OCTAVE_HZ times the rate and half the size.
// The aim turns by up to WOBBLE_DEGREES. The camera itself drifts by up to WOBBLE_LOCATION blocks.
const WOBBLE_HZ = 1;
const WOBBLE_OCTAVE_HZ = 2.3;
const WOBBLE_DEGREES = 1.2;
const WOBBLE_LOCATION = 0.12;

// A repeatable 0–1 draw for an integer key, so the game and the preview shake the same way
const toNoise = (key: number, seed: number): number => {
  const x = Math.sin(key * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const toWiggleLayer = (seconds: number, hz: number, seed: number): number => {
  const position = seconds * hz;
  const key = Math.floor(position);
  return lerp(toNoise(key, seed) * 2 - 1, toNoise(key + 1, seed) * 2 - 1, smoothstep(0, 1, position - key));
};

// -1 to 1, with the octave offset in time so the two layers never settle on a key together
const toWiggle = (seconds: number, seed: number): number =>
  (toWiggleLayer(seconds, WOBBLE_HZ, seed) + 0.5 * toWiggleLayer(seconds + 0.37, WOBBLE_HZ * WOBBLE_OCTAVE_HZ, seed + 7)) / 1.5;

// Adds the shake scaled by fade, which is 0 in first person so the path still starts and ends exactly there
const withWobble = (pose: CameraPose, seconds: number, fade: number): CameraPose => {
  const { location, facing } = pose;
  const reach = Math.hypot(facing.x - location.x, facing.y - location.y, facing.z - location.z);
  const aim = reach * Math.tan((WOBBLE_DEGREES * Math.PI) / 180) * fade;
  const drift = WOBBLE_LOCATION * fade;
  return {
    location: {
      x: location.x + drift * toWiggle(seconds, 1),
      y: location.y + drift * toWiggle(seconds, 2),
      z: location.z + drift * toWiggle(seconds, 3),
    },
    facing: {
      x: facing.x + aim * toWiggle(seconds, 4),
      y: facing.y + aim * toWiggle(seconds, 5),
      z: facing.z + aim * toWiggle(seconds, 6),
    },
  };
};

/**
 * Length of the camera path in ticks, for a build whose last block lands after buildTicks
 */
export function toCameraTicks(mode: CameraMode, buildTicks: number): number {
  return mode === 'orbit' ? buildTicks + ORBIT_HOLD_TICKS + ORBIT_RETURN_TICKS : buildTicks;
}

/**
 * The camera at progress t (0–1) along the mode's path
 */
export function toCameraPose(mode: CameraMode, scene: CameraScene, t: number): CameraPose {
  const { center, radius, bottom, top, rising, landedAt, seconds, eye, forward } = scene;
  const time = t * seconds;
  const firstPerson: CameraPose = {
    location: eye,
    facing: { x: eye.x + forward.x * LOOK_DISTANCE, y: eye.y, z: eye.z + forward.z * LOOK_DISTANCE },
  };
  if (mode === 'none') return firstPerson;

  if (mode === 'lookAround') {
    // One full turn, starting and ending on the player's own facing, tilting up while the build rises
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
    const turn = 2 * Math.PI * eased;
    const tilt = Math.sin(Math.PI * t) * LOOK_UP;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const horizontal = Math.cos(tilt) * LOOK_DISTANCE;
    const look: CameraPose = {
      location: eye,
      facing: {
        x: eye.x + (forward.x * cos - forward.z * sin) * horizontal,
        y: eye.y + Math.sin(tilt) * LOOK_DISTANCE,
        z: eye.z + (forward.z * cos + forward.x * sin) * horizontal,
      },
    };
    return withWobble(look, time, Math.sin(Math.PI * t));
  }

  // One full revolution over the whole path that eases in and out, so the camera keeps circling through the
  // hold and is still moving when it turns back into the player's eyes.
  // A rising build pulls the camera down to its base first, then it climbs and tilts up with the layers.
  const build = Math.min(1, t / landedAt);
  const returnsAt = landedAt + ((1 - landedAt) * ORBIT_HOLD_TICKS) / (ORBIT_HOLD_TICKS + ORBIT_RETURN_TICKS);
  const settle = returnsAt < 1 ? smoothstep(returnsAt, 1, t) : 0;
  const sweep = 0.5 - 0.5 * Math.cos(Math.PI * t);
  const startAngle = Math.atan2(eye.z - center.z, eye.x - center.x);
  const angle = startAngle + 2 * Math.PI * (1 - sweep);
  const orbitRadius = Math.max(radius * ORBIT_RADIUS_SCALE, ORBIT_MIN_RADIUS);
  const rise = build * build;
  const focusY = rising ? lerp(bottom, top, rise * RISE_AIM_CLIMB) : center.y;
  const cameraY = rising
    ? bottom + RISE_START_LIFT + (top - bottom) * RISE_CLIMB * rise
    : center.y + Math.max(orbitRadius * ORBIT_LIFT_SCALE, ORBIT_MIN_LIFT);
  const orbit: CameraPose = {
    location: {
      x: center.x + Math.cos(angle) * orbitRadius,
      y: cameraY,
      z: center.z + Math.sin(angle) * orbitRadius,
    },
    facing: { x: center.x, y: focusY, z: center.z },
  };
  const blend = Math.max(1 - smoothstep(0, BLEND_IN, build), settle);
  const pose: CameraPose = {
    location: lerpVec(orbit.location, firstPerson.location, blend),
    facing: lerpVec(orbit.facing, firstPerson.facing, blend),
  };
  return withWobble(pose, time, 1 - blend);
}

/**
 * Center, radius, bottom, and top of a set of block cells (each the unit cube from its corner)
 */
export function toCameraBounds(cells: Vec3[]): Pick<CameraScene, 'center' | 'radius' | 'bottom' | 'top'> {
  if (cells.length === 0) return { center: { x: 0, y: 0, z: 0 }, radius: 0, bottom: 0, top: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const { x, y, z } of cells) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x + 1);
    maxY = Math.max(maxY, y + 1);
    maxZ = Math.max(maxZ, z + 1);
  }
  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
    radius: Math.hypot(maxX - minX, maxZ - minZ) / 2,
    bottom: minY,
    top: maxY,
  };
}
