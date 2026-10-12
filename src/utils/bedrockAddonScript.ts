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
import type { Placement, PlayerFacing } from './bedrockExport';
import type { HorizontalDirection } from '../types';

export type BuildSequence = 'rise' | 'rippleOut' | 'rippleIn' | 'instant';

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
  placements: Record<PlayerFacing, Placement>;
  build: AnimatedBuild;
}

const toPaletteLiteral = ({ rotations, color }: AnimatedBuild['palette'][number]): unknown => [rotations, color];

export function toAddonScript(options: AddonScriptOptions): string {
  return `import { system, world, BlockPermutation, EquipmentSlot, MolangVariableMap, Player, StructureRotation } from "@minecraft/server";

const STRUCTURE_ID = ${JSON.stringify(options.structureId)};
/** @type {string} */
const SEQUENCE = ${JSON.stringify(options.sequence)};
const DURATION_TICKS = ${Math.max(1, Math.round(options.seconds * 20))};
const USES = ${Math.max(0, Math.floor(options.uses))};
const META_FACING = ${FACING_INDEX[options.metaFacing]};
const GLOW_PARTICLE = ${JSON.stringify(GLOW_PARTICLE_ID)};
// A cell glows this many ticks before its block lands
const LEAD_TICKS = 16;
// Larger builds glow on a sample of cells, which keeps the particle count bounded
const MAX_GLOWS = 3000;
// Sequence keys spread by up to this much, so blocks of one layer or ring land in shuffled order
const JITTER = 1.6;
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

// A use on a block also raises the plain use event in the same tick
let lastUseOnTick = -1;

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

function toSequenceKey(dx, dy, dz) {
  const jitter = Math.random() * JITTER;
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
    order.push({ x: anchor.x + dx, y: anchor.y + dy, z: anchor.z + dz, paletteIndex: CELLS[i + 3], key: toSequenceKey(dx, dy, dz) });
  }
  function byKey(a, b) {
    return a.key - b.key;
  }
  order.sort(byKey);

  setBlock(dimension, anchor, BlockPermutation.resolve("minecraft:air"));

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

// Item events run before the world may change, so the build starts on the next tick
/** @param {Player} player @param {Vector3} anchor */
function buildAround(player, anchor) {
  function start() {
    wearItem(player);
    if (SEQUENCE === "instant") placeInstantly(player, anchor);
    else animateBuild(player, anchor);
  }
  system.run(start);
}

/** @param {import("@minecraft/server").ItemComponentUseOnEvent} event */
function handleUseOn(event) {
  // Only a player has the facing and inventory the build needs
  if (!(event.source instanceof Player)) return;
  lastUseOnTick = system.currentTick;
  const offset = FACE_OFFSETS[event.blockFace] ?? FACE_OFFSETS.Up;
  const { x, y, z } = event.block.location;
  buildAround(event.source, { x: x + offset[0], y: y + offset[1], z: z + offset[2] });
}

/** @param {import("@minecraft/server").ItemComponentUseEvent} event */
function handleUse(event) {
  if (system.currentTick === lastUseOnTick) return;
  const { x, y, z } = event.source.location;
  buildAround(event.source, { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });
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
