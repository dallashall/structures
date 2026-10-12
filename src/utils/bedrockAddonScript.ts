/**
 * The behavior pack's script: the item's use handlers and the scripted build animation
 *
 * Used on a block, the item anchors the build in the cell next to the clicked face. Used in the air, it
 * anchors at the player's feet. The build turns so the player faces the meta block's arrow.
 *
 * Sequences place blocks one per cell from the exported list, ordered by the sequence's key with some
 * randomness. A block-colored glow marks each cell LEAD_TICKS before its block lands, so the outline
 * sweeps ahead of the build. "instant" places the whole .mcstructure at once instead.
 */

import type { AnimatedBuild } from './bedrockAnimation';
import type { AnimatedSequence } from './buildSequence';
import { JITTER, LEAD_TICKS, MAX_GLOWS, toDurationTicks } from './buildSequence';
import type { Placement, PlayerFacing } from './bedrockExport';
import type { HorizontalDirection } from '../types';
import type { CameraMode } from './cameraPath';
import { CAMERA_KEYS_PER_SECOND } from './cameraPath';

export type BuildSequence = AnimatedSequence | 'instant';

export const GLOW_PARTICLE_ID = 'structures:build_glow';

const FACING_INDEX: Record<HorizontalDirection, number> = { 'y-': 0, 'x+': 1, 'y+': 2, 'x-': 3 };

export interface AddonScriptOptions {
  structureId: string;
  componentId: string;
  sequence: BuildSequence;
  seconds: number;
  // 0 means unlimited
  uses: number;
  metaFacing: HorizontalDirection;
  camera: CameraMode;
  placements: Record<PlayerFacing, Placement>;
  build: AnimatedBuild;
}

const toPaletteLiteral = ({ rotations, color }: AnimatedBuild['palette'][number]): unknown => [rotations, color];

export function toAddonScript(options: AddonScriptOptions): string {
  return `import { system, world, BlockPermutation, EasingType, EquipmentSlot, InputPermissionCategory, MolangVariableMap, Player, StructureRotation } from "@minecraft/server";

const STRUCTURE_ID = ${JSON.stringify(options.structureId)};
/** @type {string} */
const CAMERA_MODE = ${JSON.stringify(options.camera)};
const CAMERA_KEYS_PER_SECOND = ${CAMERA_KEYS_PER_SECOND};
/** @type {string} */
const SEQUENCE = ${JSON.stringify(options.sequence)};
const DURATION_TICKS = ${toDurationTicks(options.seconds)};
const USES = ${Math.max(0, Math.floor(options.uses))};
const META_FACING = ${FACING_INDEX[options.metaFacing]};
const GLOW_PARTICLE = ${JSON.stringify(GLOW_PARTICLE_ID)};
// Order and timing constants come from src/utils/buildSequence.ts, which the editor preview also uses
const LEAD_TICKS = ${LEAD_TICKS};
const MAX_GLOWS = ${MAX_GLOWS};
const JITTER = ${JITTER};
// Rotation and minimum-corner offset of the whole structure, for "instant"
const PLACEMENTS = ${JSON.stringify(options.placements)};
// Per palette entry: [[name, states] for 0-3 clockwise quarter turns, [r, g, b]]
/** @type {Array<[Array<[string, Record<string, string | number | boolean>]>, [number, number, number]]>} */
const PALETTE = ${JSON.stringify(options.build.palette.map(toPaletteLiteral))};
// Flat [dx, dy, dz, paletteIndex] per block, relative to the meta block, unturned
/** @type {number[]} */
const CELLS = ${JSON.stringify(options.build.cells)};
const FACINGS = ["north", "east", "south", "west"];
/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {import("@minecraft/server").Vector3} Vector3 */

const FACE_OFFSETS = { Up: [0, 1, 0], Down: [0, -1, 0], North: [0, 0, -1], South: [0, 0, 1], East: [1, 0, 0], West: [-1, 0, 0] };

// A use on a block also raises the in-air use event, in either order. Both record a request, and the next
// tick builds once from it, preferring the block anchor. Player ID -> { player, anchor, isOnBlock }
const pendingBuilds = new Map();
// Ignores repeat requests while the use button stays held. Player ID -> tick of the last build.
const lastBuildTicks = new Map();
const REPEAT_COOLDOWN_TICKS = 10;

// Bedrock yaw: 0 faces south, 90 west, 180 north, -90 east
/** @param {Player} player */
function toFacingIndex(player) {
  const yaw = player.getRotation().y;
  return Math.round(((((yaw + 180) % 360) + 360) % 360) / 90) % 4;
}

// Clockwise seen from above: north (-z) turns to east (+x)
function turnOffset(dx, dz, turns) {
  switch (turns) {
    case 1: return [-dz, dx];
    case 2: return [-dx, -dz];
    case 3: return [dz, -dx];
    default: return [dx, dz];
  }
}

// The same formula as toSequenceKey in src/utils/buildSequence.ts
function toSequenceKey(dx, dy, dz, random) {
  const jitter = random * JITTER;
  if (SEQUENCE === "rise") return dy + jitter;
  const distance = Math.sqrt(dx * dx + dz * dz) + Math.abs(dy) * 0.5;
  return SEQUENCE === "rippleIn" ? -distance + jitter : distance + jitter;
}

/** @param {Player} player @param {Vector3} anchor */
function placeInstantly(player, anchor) {
  const placement = PLACEMENTS[FACINGS[toFacingIndex(player)]];
  const location = { x: anchor.x + placement.offset.x, y: anchor.y + placement.offset.y, z: anchor.z + placement.offset.z };
  try {
    world.structureManager.place(STRUCTURE_ID, player.dimension, location, {
      rotation: StructureRotation[placement.rotation],
      includeEntities: false,
    });
  } catch (error) {
    player.sendMessage("The build could not be placed here: " + error);
  }
}

/** @param {Dimension} dimension @param {Vector3} location @param {import("@minecraft/server").BlockPermutation} permutation */
function setBlock(dimension, location, permutation) {
  try {
    const block = dimension.getBlock(location);
    if (block) block.setPermutation(permutation);
  } catch {
    // Outside the world's height or in an unloaded chunk
  }
}

// CAMERA PATH START: a copy of toCameraPose and toCameraBounds in src/utils/cameraPath.ts
const LOOK_DISTANCE = 8;
const BLEND_IN = 0.12;
const ORBIT_HOLD_TICKS = 30;
const ORBIT_RETURN_TICKS = 30;
const ORBIT_RADIUS_SCALE = 2.2;
const ORBIT_MIN_RADIUS = 12;
const ORBIT_LIFT_SCALE = 0.35;
const ORBIT_MIN_LIFT = 2;
const RISE_START_LIFT = 2;
const RISE_CLIMB = 0.3;
const RISE_AIM_CLIMB = 0.4;
const LOOK_UP = 0.45;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpVec(a, b, t) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
}

function smoothstep(edge0, edge1, t) {
  const x = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

function toCameraTicks(mode, buildTicks) {
  return mode === "orbit" ? buildTicks + ORBIT_HOLD_TICKS + ORBIT_RETURN_TICKS : buildTicks;
}

function toCameraPose(mode, scene, t) {
  const { center, radius, bottom, top, rising, landedAt, eye, forward } = scene;
  const firstPerson = {
    location: eye,
    facing: { x: eye.x + forward.x * LOOK_DISTANCE, y: eye.y, z: eye.z + forward.z * LOOK_DISTANCE },
  };
  if (mode === "none") return firstPerson;

  if (mode === "lookAround") {
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

  const build = Math.min(1, t / landedAt);
  const returnsAt = landedAt + ((1 - landedAt) * ORBIT_HOLD_TICKS) / (ORBIT_HOLD_TICKS + ORBIT_RETURN_TICKS);
  const settle = returnsAt < 1 ? smoothstep(returnsAt, 1, t) : 0;
  const sweep = 0.5 - 0.5 * Math.cos(Math.PI * build);
  const startAngle = Math.atan2(eye.z - center.z, eye.x - center.x);
  const angle = startAngle + 2 * Math.PI * (1 - sweep);
  const orbitRadius = Math.max(radius * ORBIT_RADIUS_SCALE, ORBIT_MIN_RADIUS);
  const rise = build * build;
  const focusY = rising ? lerp(bottom, top, rise * RISE_AIM_CLIMB) : center.y;
  const cameraY = rising
    ? bottom + RISE_START_LIFT + (top - bottom) * RISE_CLIMB * rise
    : center.y + Math.max(orbitRadius * ORBIT_LIFT_SCALE, ORBIT_MIN_LIFT);
  const orbit = {
    location: {
      x: center.x + Math.cos(angle) * orbitRadius,
      y: cameraY,
      z: center.z + Math.sin(angle) * orbitRadius,
    },
    facing: { x: center.x, y: focusY, z: center.z },
  };
  const blend = Math.max(1 - smoothstep(0, BLEND_IN, build), settle);
  return {
    location: lerpVec(orbit.location, firstPerson.location, blend),
    facing: lerpVec(orbit.facing, firstPerson.facing, blend),
  };
}

function toCameraBounds(cells) {
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
// CAMERA PATH END

// Flies the camera along the mode's path while the build lands, then hands the view back to the player.
// Movement and look input stay off for the shot, so the path ends exactly where the player stands.
/** @param {Player} player @param {Vector3[]} cells @param {number} buildTicks */
function runCamera(player, cells, buildTicks) {
  if (CAMERA_MODE === "none") return;
  const totalTicks = toCameraTicks(CAMERA_MODE, buildTicks);
  const view = player.getViewDirection();
  const length = Math.hypot(view.x, view.z) || 1;
  const scene = {
    ...toCameraBounds(cells),
    rising: SEQUENCE === "rise",
    landedAt: buildTicks / totalTicks,
    eye: player.getHeadLocation(),
    forward: { x: view.x / length, y: 0, z: view.z / length },
  };
  const keyTicks = Math.max(1, Math.round(20 / CAMERA_KEYS_PER_SECOND));
  const keyCount = Math.max(1, Math.ceil(totalTicks / keyTicks));
  const permissions = player.inputPermissions;
  permissions.setPermissionCategory(InputPermissionCategory.Camera, false);
  permissions.setPermissionCategory(InputPermissionCategory.Movement, false);

  /** @param {number} t @param {number} easeSeconds */
  function setPose(t, easeSeconds) {
    const pose = toCameraPose(CAMERA_MODE, scene, t);
    const options = { location: pose.location, facingLocation: pose.facing };
    if (easeSeconds > 0) options.easeOptions = { easeTime: easeSeconds, easeType: EasingType.Linear };
    player.camera.setCamera("minecraft:free", options);
  }

  function release() {
    if (!player.isValid) return;
    player.camera.clear();
    permissions.setPermissionCategory(InputPermissionCategory.Camera, true);
    permissions.setPermissionCategory(InputPermissionCategory.Movement, true);
  }

  let key = 0;
  function nextKey() {
    if (!player.isValid) {
      system.clearRun(keys);
      return;
    }
    key++;
    setPose(key / keyCount, keyTicks / 20);
    if (key >= keyCount) {
      system.clearRun(keys);
      system.runTimeout(release, keyTicks);
    }
  }

  setPose(0, 0);
  const keys = system.runInterval(nextKey, keyTicks);
}

/** @param {Player} player @param {Vector3} anchor */
function animateBuild(player, anchor) {
  const dimension = player.dimension;
  const turns = (toFacingIndex(player) - META_FACING + 4) % 4;
  const permutations = new Map();
  function toPermutation(paletteIndex) {
    if (!permutations.has(paletteIndex)) {
      const [name, states] = PALETTE[paletteIndex][0][turns];
      let permutation = null;
      try {
        permutation = BlockPermutation.resolve(name, states);
      } catch {
        permutation = null;
      }
      permutations.set(paletteIndex, permutation);
    }
    return permutations.get(paletteIndex);
  }

  const order = [];
  for (let i = 0; i < CELLS.length; i += 4) {
    const [dx, dz] = turnOffset(CELLS[i], CELLS[i + 2], turns);
    const dy = CELLS[i + 1];
    order.push({ x: anchor.x + dx, y: anchor.y + dy, z: anchor.z + dz, paletteIndex: CELLS[i + 3], key: toSequenceKey(dx, dy, dz, Math.random()) });
  }
  function byKey(a, b) {
    return a.key - b.key;
  }
  order.sort(byKey);

  setBlock(dimension, anchor, BlockPermutation.resolve("minecraft:air"));
  runCamera(player, order, DURATION_TICKS + LEAD_TICKS);

  const count = order.length;
  const glowEvery = Math.max(1, Math.ceil(count / MAX_GLOWS));
  function markTick(rank) {
    return Math.floor((rank * DURATION_TICKS) / Math.max(1, count));
  }
  let tick = 0;
  let glowCursor = 0;
  let blockCursor = 0;

  function glow(cell) {
    const [red, green, blue] = PALETTE[cell.paletteIndex][1];
    const variables = new MolangVariableMap();
    variables.setColorRGB("variable.color", { red, green, blue });
    try {
      dimension.spawnParticle(GLOW_PARTICLE, { x: cell.x + 0.5, y: cell.y + 0.5, z: cell.z + 0.5 }, variables);
    } catch {
      // Unloaded chunk
    }
  }

  function land(cell) {
    const permutation = toPermutation(cell.paletteIndex);
    if (permutation) setBlock(dimension, cell, permutation);
  }

  function step() {
    while (glowCursor < count && markTick(glowCursor) <= tick) {
      if (glowCursor % glowEvery === 0) glow(order[glowCursor]);
      glowCursor++;
    }
    let landed = 0;
    while (blockCursor < count && markTick(blockCursor) + LEAD_TICKS <= tick) {
      land(order[blockCursor]);
      blockCursor++;
      landed++;
    }
    if (landed > 0 && tick % 3 === 0) {
      dimension.playSound("random.pop", anchor, { volume: 0.5, pitch: 0.7 + Math.random() * 0.6 });
    }
    if (blockCursor >= count) {
      system.clearRun(run);
      dimension.playSound("random.levelup", anchor, { volume: 0.8 });
    }
    tick++;
  }
  const run = system.runInterval(step, 1);
}

// The use that breaks the item still builds
/** @param {Player} player */
function wearItem(player) {
  if (USES <= 0) return;
  const equippable = player.getComponent("minecraft:equippable");
  const item = equippable?.getEquipment(EquipmentSlot.Mainhand);
  const durability = item?.getComponent("minecraft:durability");
  if (!equippable || !item || !durability) return;
  durability.damage = Math.min(durability.maxDurability, durability.damage + 1);
  if (durability.damage >= durability.maxDurability) {
    equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
    player.dimension.playSound("random.break", player.location);
    return;
  }
  equippable.setEquipment(EquipmentSlot.Mainhand, item);
}

/** @param {string} playerId */
function runPendingBuild(playerId) {
  const pending = pendingBuilds.get(playerId);
  pendingBuilds.delete(playerId);
  if (!pending || !pending.player.isValid) return;
  lastBuildTicks.set(playerId, system.currentTick);
  wearItem(pending.player);
  if (SEQUENCE === "instant") placeInstantly(pending.player, pending.anchor);
  else animateBuild(pending.player, pending.anchor);
}

// Item events run before the world may change, so the build starts on the next tick
/** @param {Player} player @param {Vector3} anchor @param {boolean} isOnBlock */
function requestBuild(player, anchor, isOnBlock) {
  const lastBuildTick = lastBuildTicks.get(player.id);
  if (lastBuildTick !== undefined && system.currentTick - lastBuildTick < REPEAT_COOLDOWN_TICKS) return;

  const pending = pendingBuilds.get(player.id);
  if (pending && (pending.isOnBlock || !isOnBlock)) return;
  pendingBuilds.set(player.id, { player, anchor, isOnBlock });
  if (!pending) {
    function run() {
      runPendingBuild(player.id);
    }
    system.run(run);
  }
}

/** @param {import("@minecraft/server").ItemComponentUseOnEvent} event */
function handleUseOn(event) {
  // Only a player has the facing and inventory the build needs
  if (!(event.source instanceof Player)) return;
  const offset = FACE_OFFSETS[event.blockFace] ?? FACE_OFFSETS.Up;
  const { x, y, z } = event.block.location;
  requestBuild(event.source, { x: x + offset[0], y: y + offset[1], z: z + offset[2] }, true);
}

/** @param {import("@minecraft/server").ItemComponentUseEvent} event */
function handleUse(event) {
  const { x, y, z } = event.source.location;
  requestBuild(event.source, { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) }, false);
}

/** @param {import("@minecraft/server").StartupEvent} startup */
function registerComponent(startup) {
  startup.itemComponentRegistry.registerCustomComponent(${JSON.stringify(options.componentId)}, {
    onUse: handleUse,
    onUseOn: handleUseOn,
  });
}

system.beforeEvents.startup.subscribe(registerComponent);
`;
}

/**
 * Resource pack particle: a short burst of soft puffs tinted with variable.color, drawn with the game's own
 * particle sprite sheet. It renders unlit, so it glows in dark spots too.
 */
export function toGlowParticle(): unknown {
  const fade = '1 - v.particle_age / v.particle_lifetime';
  return {
    format_version: '1.10.0',
    particle_effect: {
      description: {
        identifier: GLOW_PARTICLE_ID,
        basic_render_parameters: { material: 'particles_blend', texture: 'textures/particle/particles' },
      },
      components: {
        'minecraft:emitter_rate_instant': { num_particles: 5 },
        'minecraft:emitter_lifetime_once': { active_time: 0.05 },
        'minecraft:emitter_shape_box': { half_dimensions: [0.45, 0.45, 0.45], direction: [0, 1, 0] },
        'minecraft:particle_lifetime_expression': { max_lifetime: 'math.random(0.9, 1.5)' },
        'minecraft:particle_initial_speed': 0.15,
        'minecraft:particle_motion_dynamic': { linear_acceleration: [0, 0.35, 0], linear_drag_coefficient: 1.2 },
        'minecraft:particle_appearance_billboard': {
          size: [`0.16 * (${fade})`, `0.16 * (${fade})`],
          facing_camera_mode: 'lookat_xyz',
          uv: { texture_width: 128, texture_height: 128, uv: [0, 0], uv_size: [8, 8] },
        },
        'minecraft:particle_appearance_tinting': {
          color: ['v.color.r', 'v.color.g', 'v.color.b', fade],
        },
      },
    },
  };
}
