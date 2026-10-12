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
  // Y of the build's highest block
  top: number;
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
// Share of the path spent easing out of first person, and back into it
const BLEND_IN = 0.12;
const BLEND_OUT = 0.3;
const ORBIT_RADIUS_SCALE = 1.6;
const ORBIT_MIN_RADIUS = 8;
const ORBIT_LIFT = 4;
// How far the look-around view tilts up at its highest, in radians
const LOOK_UP = 0.45;
// Camera key frames per second. The game eases linearly between them.
export const CAMERA_KEYS_PER_SECOND = 4;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });
const smoothstep = (edge0: number, edge1: number, t: number): number => {
  const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
};

/**
 * The camera at progress t (0–1) along the mode's path
 */
export function toCameraPose(mode: CameraMode, scene: CameraScene, t: number): CameraPose {
  const { center, radius, top, eye, forward } = scene;
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
    return {
      location: eye,
      facing: {
        x: eye.x + (forward.x * cos - forward.z * sin) * horizontal,
        y: eye.y + Math.sin(tilt) * LOOK_DISTANCE,
        z: eye.z + (forward.z * cos + forward.x * sin) * horizontal,
      },
    };
  }

  // One full revolution that ends where the player stands, then settles into their eyes
  const startAngle = Math.atan2(eye.z - center.z, eye.x - center.x);
  const angle = startAngle + 2 * Math.PI * (1 - t);
  const orbitRadius = Math.max(radius * ORBIT_RADIUS_SCALE, ORBIT_MIN_RADIUS);
  const orbit: CameraPose = {
    location: {
      x: center.x + Math.cos(angle) * orbitRadius,
      y: Math.max(top, center.y) + ORBIT_LIFT,
      z: center.z + Math.sin(angle) * orbitRadius,
    },
    facing: center,
  };
  const blend = Math.max(1 - smoothstep(0, BLEND_IN, t), smoothstep(1 - BLEND_OUT, 1, t));
  return {
    location: lerpVec(orbit.location, firstPerson.location, blend),
    facing: lerpVec(orbit.facing, firstPerson.facing, blend),
  };
}

/**
 * Center, radius, and top of a set of block cells (each the unit cube from its corner)
 */
export function toCameraBounds(cells: Vec3[]): Pick<CameraScene, 'center' | 'radius' | 'top'> {
  if (cells.length === 0) return { center: { x: 0, y: 0, z: 0 }, radius: 0, top: 0 };
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
    top: maxY,
  };
}
