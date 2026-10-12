/**
 * Camera moves for the build animation, shared by the add-on script and the editor's preview
 *
 * Both run in Y-up axes where north is -Z: Bedrock world space, and Babylon space through toBabylonVector.
 * A pose is a camera location and a point it looks at.
 *
 * A move is a list of key poses, CAMERA_KEYS_PER_SECOND apart. The game eases linearly from key to key, and the
 * preview does the same, so both show the same motion. Each mode only says where the camera is pointed. A heavy
 * camera follows that target on a critically damped spring stepped once per key, which is what makes it slow to
 * start and slow to stop. The handheld shake is random targets on a lighter spring.
 *
 * Every move starts at the player's eyes and its last key is exactly the player's eyes, looking forward.
 *
 * The add-on script embeds a copy of this file's functions, and a test checks that copy against this one.
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
  // Seconds until the last block lands
  buildSeconds: number;
  eye: Vec3;
  // Horizontal unit vector the player faces
  forward: Vec3;
}

export interface CameraPose {
  location: Vec3;
  facing: Vec3;
}

// The game eases linearly between keys. The spring is stepped once per key.
export const CAMERA_KEYS_PER_SECOND = 10;
const KEY_SECONDS = 1 / CAMERA_KEYS_PER_SECOND;

// Seconds the camera takes to catch up with its target. Larger is heavier.
const CAMERA_LAG = 0.6;
// Damping ratio of every spring. 0.76 overshoots a stopped target by about 2.5%.
const SPRING_DAMPING = 0.76;
// Seconds after the target comes to rest at the eyes, for the spring to settle there
const SETTLE_SECONDS = 2;

// Distance from the eye to the point the camera looks at in first person
const LOOK_DISTANCE = 8;
// The orbit's target leaves the eyes over PULL_OUT_SECONDS and circles the build while it lands. It keeps
// circling for HOLD_SECONDS, then closes in on the eyes over RETURN_SECONDS as the circle finishes.
const PULL_OUT_SECONDS = 1;
const HOLD_SECONDS = 1.5;
const RETURN_SECONDS = 2;
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

// Handheld shake in the manner of After Effects' wiggle(freq, amp): a fresh random target SHAKE_HZ times a
// second, which a light spring chases. The aim turns by up to SHAKE_DEGREES. The camera drifts by up to
// SHAKE_LOCATION blocks.
const SHAKE_HZ = 1.5;
const SHAKE_LAG = 0.3;
const SHAKE_DEGREES = 1.2;
const SHAKE_LOCATION = 0.12;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

interface Spring {
  value: Vec3;
  velocity: Vec3;
}

/**
 * Moves a spring one key toward target with the exact solution of a damped spring, so it stays stable at any
 * key spacing. Below 1, SPRING_DAMPING lets the camera drift a little past its mark and settle back.
 */
function stepSpring(spring: Spring, target: Vec3, lag: number): void {
  const omega = 2 / lag;
  const decay = SPRING_DAMPING * omega;
  const wobble = omega * Math.sqrt(1 - SPRING_DAMPING * SPRING_DAMPING);
  const fade = Math.exp(-decay * KEY_SECONDS);
  const cos = Math.cos(wobble * KEY_SECONDS) * fade;
  const sin = (Math.sin(wobble * KEY_SECONDS) * fade) / wobble;
  for (const axis of ['x', 'y', 'z'] as const) {
    const offset = spring.value[axis] - target[axis];
    const velocity = spring.velocity[axis];
    spring.value[axis] = target[axis] + offset * cos + (velocity + decay * offset) * sin;
    spring.velocity[axis] = velocity * cos - (decay * velocity + omega * omega * offset) * sin;
  }
}

// A repeatable 0–1 draw for an integer key, so the game and the preview shake the same way
const toNoise = (key: number, seed: number): number => {
  const x = Math.sin(key * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const toShakeTarget = (seconds: number, seed: number): Vec3 => {
  const key = Math.floor(seconds * SHAKE_HZ);
  return { x: toNoise(key, seed) * 2 - 1, y: toNoise(key, seed + 1) * 2 - 1, z: toNoise(key, seed + 2) * 2 - 1 };
};

/**
 * Seconds a mode's move lasts, for a build whose last block lands after buildSeconds
 */
export function toCameraSeconds(mode: CameraMode, buildSeconds: number): number {
  if (mode === 'orbit') return buildSeconds + HOLD_SECONDS + RETURN_SECONDS + SETTLE_SECONDS;
  if (mode === 'lookAround') return buildSeconds + SETTLE_SECONDS;
  return 0;
}

/**
 * Where the mode points the camera at a time, and how far it is from first person (0–1), which scales the shake
 */
function toCameraTarget(mode: CameraMode, scene: CameraScene, seconds: number): { pose: CameraPose; away: number } {
  const { center, radius, bottom, top, rising, buildSeconds, eye, forward } = scene;
  const firstPerson: CameraPose = {
    location: eye,
    facing: { x: eye.x + forward.x * LOOK_DISTANCE, y: eye.y, z: eye.z + forward.z * LOOK_DISTANCE },
  };
  const build = clamp01(seconds / buildSeconds);

  if (mode === 'lookAround') {
    // One full turn from the player's own facing, tilting up while the build rises
    const turn = 2 * Math.PI * build;
    const tilt = Math.sin(Math.PI * build) * LOOK_UP;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const horizontal = Math.cos(tilt) * LOOK_DISTANCE;
    const facing = {
      x: eye.x + (forward.x * cos - forward.z * sin) * horizontal,
      y: eye.y + Math.sin(tilt) * LOOK_DISTANCE,
      z: eye.z + (forward.z * cos + forward.x * sin) * horizontal,
    };
    return { pose: { location: eye, facing }, away: Math.sin(Math.PI * build) };
  }

  // One revolution that starts and ends straight behind the player, aimed along their facing, so the way back
  // is a dolly in. A rising build pulls the camera down to its base, then it climbs and tilts up with the layers.
  const returnsAt = buildSeconds + HOLD_SECONDS;
  const angle = Math.atan2(-forward.z, -forward.x) - 2 * Math.PI * clamp01(seconds / (returnsAt + RETURN_SECONDS));
  const orbitRadius = Math.max(radius * ORBIT_RADIUS_SCALE, ORBIT_MIN_RADIUS);
  const rise = build * build;
  const aimY = rising ? lerp(bottom, top, rise * RISE_AIM_CLIMB) : center.y;
  const cameraY = rising
    ? bottom + RISE_START_LIFT + (top - bottom) * RISE_CLIMB * rise
    : center.y + Math.max(orbitRadius * ORBIT_LIFT_SCALE, ORBIT_MIN_LIFT);
  const orbit: CameraPose = {
    location: { x: center.x + Math.cos(angle) * orbitRadius, y: cameraY, z: center.z + Math.sin(angle) * orbitRadius },
    facing: { x: center.x, y: aimY, z: center.z },
  };
  const away = Math.min(clamp01(seconds / PULL_OUT_SECONDS), 1 - clamp01((seconds - returnsAt) / RETURN_SECONDS));
  return {
    pose: { location: lerpVec(firstPerson.location, orbit.location, away), facing: lerpVec(firstPerson.facing, orbit.facing, away) },
    away,
  };
}

/**
 * The key poses of a mode's move, one every 1 / CAMERA_KEYS_PER_SECOND seconds. Empty for 'none'.
 */
export function toCameraKeys(mode: CameraMode, scene: CameraScene): CameraPose[] {
  if (mode === 'none') return [];
  const keyCount = Math.ceil(toCameraSeconds(mode, scene.buildSeconds) * CAMERA_KEYS_PER_SECOND) + 1;
  const start = toCameraTarget(mode, scene, 0).pose;
  const still = (): Vec3 => ({ x: 0, y: 0, z: 0 });
  const location: Spring = { value: { ...start.location }, velocity: still() };
  const facing: Spring = { value: { ...start.facing }, velocity: still() };
  const drift: Spring = { value: still(), velocity: still() };
  const aim: Spring = { value: still(), velocity: still() };

  const keys: CameraPose[] = [];
  for (let key = 0; key < keyCount; key++) {
    const seconds = key * KEY_SECONDS;
    const { pose, away } = toCameraTarget(mode, scene, seconds);
    if (key > 0) {
      stepSpring(location, pose.location, CAMERA_LAG);
      stepSpring(facing, pose.facing, CAMERA_LAG);
      stepSpring(drift, toShakeTarget(seconds, 1), SHAKE_LAG);
      stepSpring(aim, toShakeTarget(seconds, 4), SHAKE_LAG);
    }
    const reach = Math.hypot(
      facing.value.x - location.value.x,
      facing.value.y - location.value.y,
      facing.value.z - location.value.z,
    );
    const turn = reach * Math.tan((SHAKE_DEGREES * Math.PI) / 180) * away;
    const shift = SHAKE_LOCATION * away;
    keys.push({
      location: {
        x: location.value.x + drift.value.x * shift,
        y: location.value.y + drift.value.y * shift,
        z: location.value.z + drift.value.z * shift,
      },
      facing: {
        x: facing.value.x + aim.value.x * turn,
        y: facing.value.y + aim.value.y * turn,
        z: facing.value.z + aim.value.z * turn,
      },
    });
  }
  // The spring has settled to within a hair of the eyes. The last key lands on them exactly.
  keys[keys.length - 1] = toCameraTarget(mode, scene, toCameraSeconds(mode, scene.buildSeconds)).pose;
  return keys;
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
