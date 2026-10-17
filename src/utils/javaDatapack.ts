/**
 * Java data pack: a wand item that builds the project around the player, frame by frame
 *
 * The pack targets one Java release. Java changes the data pack format with nearly every release, and
 * npm run check:datapack loads the pack in that release's server to catch anything it rejects.
 *
 * How a use runs:
 * 1. A hidden using_item advancement fires every tick the wand is held in use. Its function revokes it, and
 *    the held score lets only a fresh press start a build.
 * 2. start summons a marker at the player's block. The marker stores the quarter turns that make the player
 *    face the meta block's arrow.
 * 3. tick steps every marker one frame. A frame is one function per tick per turn, with the glow particles
 *    and setblock lines for that tick, at offsets from the marker. The marker removes itself after the last frame.
 * 4. A wand with limited uses carries Java's own durability. Each use adds one damage, and the last use breaks it.
 *
 * A bow or snowball activator replaces steps 1 and 2. Java has no projectile hit event, so:
 * 1. tick checks each new arrow or snowball once for the export's custom data, on the bow it came from or on the
 *    snowball's own item. A match gets a follower marker, turned to the yaw its shooter faced when it flew.
 * 2. Each tick the follower moves to its projectile. When the projectile is gone or an arrow sticks, the follower
 *    steps along the projectile's last motion from its last position. The build anchors at the feet of the first
 *    mob it meets, or in the last open cell before a solid block.
 * The bow wears through vanilla durability, or through the pack's wear function for a creative shooter. Each
 * snowball is used up by its throw outside creative mode. A projectile build fills the meta block's cell.
 *
 * Offsets are in game axes relative to the meta block: x east, y up, z south.
 */

import { strToU8, zipSync } from 'fflate';

import type { HorizontalDirection } from '../types';
import type { AnimatedBuild } from './animatedBuild';
import type { Activator, ItemIcon } from './bedrockAddon';
import type { BuildSequence } from './bedrockAddonScript';
import type { BedrockBlockTable } from './bedrockBlocks';
import { toAddonNames, toSnowballCount } from './bedrockAddon';
import { findJavaStateKey } from './bedrockExport';
import { POP_BLOCKS_PER_TICK, toBuildTicks, toDurationTicks, toGlowEvery, toGlowTick, toLandTick, toSequenceKey } from './buildSequence';

export const JAVA_VERSION = '26.3';
// [major, minor] data pack format of JAVA_VERSION. npm run check:datapack reads the server's own value.
export const DATA_PACK_FORMAT: [number, number] = [121, 0];

// A landing sound plays at most once every this many ticks
const POP_EVERY = 3;

// Java yaw: 0 faces south, -90 east, 90 west, ±180 north. Index order matches FACING_INDEX.
const FACING_INDEX: Record<HorizontalDirection, number> = { 'y-': 0, 'x+': 1, 'y+': 2, 'x-': 3 };
const YAW_RANGES = [['135..180', '-180..-135'], ['-135..-45'], ['-45..45'], ['45..135']];

// Shapeless recipes: the icon item plus one cost item. 'none' leaves the wand to /function <namespace>:give.
export const WAND_RECIPES = {
  none: null,
  gold: 'minecraft:gold_ingot',
  diamond: 'minecraft:diamond',
  netherStar: 'minecraft:nether_star',
} as const;

export type WandRecipe = keyof typeof WAND_RECIPES;

export interface DatapackOptions {
  projectId: string;
  // The pack's name. Its slug names the file and the namespace, the same as the Bedrock add-on.
  packName: string;
  itemName: string;
  icon: ItemIcon;
  activator: Activator;
  sequence: BuildSequence;
  seconds: number;
  // 0 means unlimited
  uses: number;
  recipe: WandRecipe;
  metaFacing: HorizontalDirection;
  // Palette entries are full Java block states, such as minecraft:oak_stairs[facing=east,half=bottom]
  build: AnimatedBuild<string>;
  // A 0–1 draw for each block's place in its layer or ring. The order is fixed when the pack is made.
  random?: () => number;
}

interface Frame {
  glows: number[];
  lands: number[];
}

/**
 * A complete Java block state, such as minecraft:oak_stairs[facing=east,half=bottom,shape=straight].
 * The block table's keys are Java states, so it fills properties the app does not track. Null when the
 * table has no such block.
 */
export function findJavaBlockState(table: BedrockBlockTable, javaId: string, properties: Record<string, string>): string | null {
  const key = findJavaStateKey(table, javaId, properties);
  if (key === null) return null;
  return key ? `${javaId}[${key}]` : javaId;
}

const turnOffset = (dx: number, dz: number, turns: number): [number, number] => {
  switch (turns) {
    case 1: return [-dz, dx];
    case 2: return [-dx, -dz];
    case 3: return [dz, -dx];
    default: return [dx, dz];
  }
};

// SNBT double-quoted string
const toSnbtString = (text: string): string => `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const toFixed = (value: number): string => String(Math.round(value * 1000) / 1000);

/**
 * Which cells glow and which land on each tick. Cell indexes point into build.cells, four numbers per cell.
 */
export function toFrames(options: Pick<DatapackOptions, 'sequence' | 'seconds' | 'build' | 'random'>): Frame[] {
  const { sequence, seconds, build, random = Math.random } = options;
  const count = build.cells.length / 4;
  const frames: Frame[] = [];
  const frameAt = (tick: number): Frame => {
    while (frames.length <= tick) frames.push({ glows: [], lands: [] });
    return frames[tick];
  };

  if (sequence === 'instant') {
    frameAt(0);
    for (let cell = 0; cell < count; cell++) frameAt(Math.floor(cell / POP_BLOCKS_PER_TICK)).lands.push(cell);
    return frames;
  }

  const toKeyed = (_: unknown, cell: number): { cell: number; key: number } => {
    const [dx, dy, dz] = build.cells.slice(cell * 4, cell * 4 + 3);
    return { cell, key: toSequenceKey(sequence, dx, dy, dz, random()) };
  };
  const byKey = (a: { key: number }, b: { key: number }): number => a.key - b.key;
  const order = Array.from({ length: count }, toKeyed).sort(byKey);
  const durationTicks = toDurationTicks(seconds);
  const glowEvery = toGlowEvery(count);
  frameAt(toBuildTicks(sequence, count, durationTicks));
  const addCell = ({ cell }: { cell: number }, rank: number): void => {
    if (rank % glowEvery === 0) frameAt(toGlowTick(sequence, rank, count, durationTicks)).glows.push(cell);
    frameAt(toLandTick(sequence, rank, count, durationTicks)).lands.push(cell);
  };
  order.forEach(addCell);
  return frames;
}

/**
 * The commands for one frame, for a build turned clockwise by `turns`
 */
function toFrameFunction(frame: Frame, tick: number, lastTick: number, turns: number, build: AnimatedBuild<string>): string {
  const lines: string[] = [];
  if (tick === 0) lines.push('setblock ~ ~ ~ minecraft:air');
  for (const cell of frame.glows) {
    const [x, y, z, paletteIndex] = build.cells.slice(cell * 4, cell * 4 + 4);
    const [dx, dz] = turnOffset(x, z, turns);
    const [red, green, blue] = build.palette[paletteIndex].color.map(toFixed);
    lines.push(`particle minecraft:dust{color:[${red},${green},${blue}],scale:1.5} ~${dx} ~${y + 0.5} ~${dz} 0.25 0.25 0.25 0 4`);
  }
  for (const cell of frame.lands) {
    const [x, y, z, paletteIndex] = build.cells.slice(cell * 4, cell * 4 + 4);
    const [dx, dz] = turnOffset(x, z, turns);
    lines.push(`setblock ~${dx} ~${y} ~${dz} ${build.palette[paletteIndex].rotations[turns]}`);
  }
  if (frame.lands.length > 0 && tick % POP_EVERY === 0) {
    lines.push('playsound minecraft:entity.item.pickup block @a ~ ~ ~ 0.5 0.8');
  }
  if (tick === lastTick) lines.push('playsound minecraft:entity.player.levelup block @a ~ ~ ~ 0.8 1');
  return lines.join('\n');
}

type ComponentValue = string | number | boolean | { [key: string]: ComponentValue };

/**
 * The wand's components, written once and rendered as SNBT for give and as JSON for the recipe, so a crafted
 * wand and a given wand are the same item
 */
const toWandComponents = (options: DatapackOptions, namespace: string): Record<string, ComponentValue> => {
  const components: Record<string, ComponentValue> = {
    'minecraft:custom_data': { wand: namespace },
    'minecraft:item_name': options.itemName,
    'minecraft:max_stack_size': 1,
    'minecraft:enchantment_glint_override': true,
    // Any item can start a use with this component. The use never finishes, so the wand is never eaten.
    'minecraft:consumable': {
      consume_seconds: 1000000,
      animation: 'none',
      sound: 'minecraft:intentionally_empty',
      has_consume_particles: false,
    },
  };
  if (options.uses > 0) {
    components['minecraft:max_damage'] = options.uses;
    // A blaze rod or stick has no damage component of its own, and the wear lines match on its value
    components['minecraft:damage'] = 0;
  }
  return components;
};

/**
 * The bow's components. Vanilla durability wears it one per shot outside creative mode.
 */
const toBowComponents = (options: DatapackOptions, namespace: string): Record<string, ComponentValue> => ({
  'minecraft:custom_data': { wand: namespace },
  'minecraft:item_name': options.itemName,
  'minecraft:enchantment_glint_override': true,
  ...(options.uses > 0 ? { 'minecraft:max_damage': options.uses, 'minecraft:damage': 0 } : { 'minecraft:unbreakable': {} }),
});

const toSnowballComponents = (options: DatapackOptions, namespace: string): Record<string, ComponentValue> => ({
  'minecraft:custom_data': { wand: namespace },
  'minecraft:item_name': options.itemName,
  'minecraft:enchantment_glint_override': true,
});

/**
 * The item the export hands out, with its count and components
 */
const toActivatorItem = (options: DatapackOptions, namespace: string): { id: string; count: number; components: Record<string, ComponentValue> } => {
  if (options.activator === 'bow') return { id: 'minecraft:bow', count: 1, components: toBowComponents(options, namespace) };
  if (options.activator === 'snowball') {
    return { id: 'minecraft:snowball', count: toSnowballCount(options.uses), components: toSnowballComponents(options, namespace) };
  }
  return { id: `minecraft:${options.icon}`, count: 1, components: toWandComponents(options, namespace) };
};

const toSnbt = (value: ComponentValue): string => {
  if (typeof value === 'string') return toSnbtString(value);
  if (typeof value !== 'object') return String(value);
  const toEntry = ([key, entry]: [string, ComponentValue]): string => `${key}:${toSnbt(entry)}`;
  return `{${Object.entries(value).map(toEntry).join(',')}}`;
};

const toItemComponents = (components: Record<string, ComponentValue>): string => {
  const toAssignment = ([key, value]: [string, ComponentValue]): string => `${key}=${toSnbt(value)}`;
  return Object.entries(components).map(toAssignment).join(',');
};

// The using_item advancement and the functions behind it, for the wand activator
function writeWandUse(text: Record<string, string>, options: DatapackOptions, namespace: string): void {
  const { uses, icon } = options;
  const at = (path: string): string => `data/${namespace}/${path}`;
  const id = (path: string): string => `${namespace}:${path}`;
  const heldScore = `${namespace}.held`;
  const wand = `*[minecraft:custom_data~{wand:${toSnbtString(namespace)}}]`;

  text[at('advancement/use.json')] = JSON.stringify(
    {
      criteria: {
        use: {
          trigger: 'minecraft:using_item',
          conditions: { item: { items: `minecraft:${icon}`, predicates: { 'minecraft:custom_data': { wand: namespace } } } },
        },
      },
      rewards: { function: id('use') },
    },
    null,
    2,
  );
  // The advancement fires every tick of a held use. The held score stays above 0 until the button is let go.
  text[at('function/use.mcfunction')] = [
    `advancement revoke @s only ${id('use')}`,
    `execute unless score @s ${heldScore} matches 1.. run function ${id('start')}`,
    `scoreboard players set @s ${heldScore} 2`,
  ].join('\n');

  const start = [
    `execute unless items entity @s weapon.mainhand ${wand} run return fail`,
    `execute align xyz positioned ~0.5 ~ ~0.5 run function ${id('anchor')}`,
  ];
  if (uses > 0) start.push(`function ${id('wear')}`);
  text[at('function/start.mcfunction')] = start.join('\n');

  if (uses <= 0) return;
  // Each line matches one damage value and returns, so a use adds exactly one damage
  const toWearLine = (_: unknown, damage: number): string => {
    const match = `execute if items entity @s weapon.mainhand *[minecraft:damage=${damage}] run return run`;
    if (damage === uses - 1) return `${match} function ${id('break')}`;
    return `${match} item modify entity @s weapon.mainhand {type:"minecraft:set_components",components:{"minecraft:damage":${damage + 1}}}`;
  };
  text[at('function/wear.mcfunction')] = Array.from({ length: uses }, toWearLine).join('\n');
  text[at('function/break.mcfunction')] = [
    'item replace entity @s weapon.mainhand with minecraft:air',
    'playsound minecraft:entity.item.break player @a ~ ~ ~',
    `particle minecraft:item{item:"minecraft:${icon}"} ~ ~1 ~ 0.2 0.2 0.2 0.05 12`,
  ].join('\n');
}

// Sub-steps per tick of motion when a follower looks for what its projectile hit, and how many ticks of
// motion it searches. A snowball moves up to about 1.5 blocks a tick and a full-draw arrow about 3.
const RAY_STEPS_PER_TICK = 8;
const RAY_TICKS = 2;
// Entities a follower's search passes through, as they are not what a projectile hits
const RAY_IGNORED_TYPES = [
  'minecraft:marker',
  '#minecraft:impact_projectiles',
  'minecraft:item',
  'minecraft:experience_orb',
  'minecraft:area_effect_cloud',
];

// The functions that find marked projectiles, follow them, and build where they stop
function writeProjectileTracking(text: Record<string, string>, activator: Exclude<Activator, 'wand'>, namespace: string, uses: number): void {
  const at = (path: string): string => `data/${namespace}/${path}`;
  const id = (path: string): string => `${namespace}:${path}`;
  const idScore = `${namespace}.id`;
  const seen = `${namespace}.seen`;
  const shot = `${namespace}.shot`;
  const follow = `${namespace}.follow`;
  const match = `${namespace}.match`;
  const fresh = `${namespace}.new`;
  const ray = id('ray');
  const marked = `{"minecraft:custom_data":{wand:${toSnbtString(namespace)}}}`;
  // An arrow keeps the bow that fired it in "weapon". A snowball keeps its own item in "Item".
  const [types, nbt] = activator === 'bow'
    ? ['#minecraft:arrows', `{weapon:{components:${marked}}}`]
    : ['minecraft:snowball', `{Item:{components:${marked}}}`];
  const ignored = RAY_IGNORED_TYPES.map(toTypeExclusion).join(',');

  // Each projectile's NBT is read once, on the first tick it exists
  text[at('function/track.mcfunction')] = [
    `execute as @e[type=${types},tag=!${seen},nbt=${nbt}] at @s run function ${id('shot')}`,
    `tag @e[type=${types},tag=!${seen}] add ${seen}`,
    `execute as @e[type=minecraft:marker,tag=${follow}] at @s run function ${id('follow')}`,
  ].join('\n');
  const shotLines = [
    `tag @s add ${shot}`,
    `scoreboard players add #next ${idScore} 1`,
    `scoreboard players operation @s ${idScore} = #next ${idScore}`,
    `summon minecraft:marker ~ ~ ~ {Tags:["${follow}","${fresh}"]}`,
    `scoreboard players operation @e[type=minecraft:marker,tag=${fresh}] ${idScore} = #next ${idScore}`,
    `data modify entity @e[type=minecraft:marker,tag=${fresh},limit=1] data.motion set from entity @s Motion`,
    // The follower takes the yaw its shooter faces now. Java names a projectile's shooter "origin", not "owner".
    // A projectile with no shooter leaves it facing south.
    `execute on origin rotated as @s as @e[type=minecraft:marker,tag=${fresh}] run tp @s ~ ~ ~ ~ 0`,
    `tag @e[type=minecraft:marker,tag=${fresh}] remove ${fresh}`,
  ];
  // Vanilla durability skips creative mode, so a creative shooter's bow wears here instead
  if (activator === 'bow' && uses > 0) {
    shotLines.push(`execute on origin if entity @s[gamemode=creative] run function ${id('wear')}`);
    writeCreativeBowWear(text, namespace, uses);
  }
  text[at('function/shot.mcfunction')] = shotLines.join('\n');
  text[at('function/follow.mcfunction')] = [
    `scoreboard players operation #id ${idScore} = @s ${idScore}`,
    `execute as @e[tag=${shot}] if score @s ${idScore} = #id ${idScore} run tag @s add ${match}`,
    `execute unless entity @e[tag=${match}] run return run function ${id('land')}`,
    `execute if entity @e[tag=${match},nbt={inGround:1b}] run return run function ${id('stick')}`,
    `execute at @e[tag=${match},limit=1] run tp @s ~ ~ ~`,
    `data modify entity @s data.motion set from entity @e[tag=${match},limit=1] Motion`,
    `tag @e[tag=${match}] remove ${match}`,
  ].join('\n');
  // An arrow that sticks stays a normal arrow, untracked
  text[at('function/stick.mcfunction')] = [
    `tag @e[tag=${match}] remove ${shot}`,
    `tag @e[tag=${match}] remove ${match}`,
    `function ${id('land')}`,
  ].join('\n');
  // Motion is in blocks per tick. Scaling by 1000 keeps three decimals through the integer score.
  const toStepLine = (axis: string, index: number): string =>
    `execute store result storage ${id('ray')} ${axis} double ${1 / (1000 * RAY_STEPS_PER_TICK)} run data get entity @s data.motion[${index}] 1000`;
  text[at('function/land.mcfunction')] = [
    ...['dx', 'dy', 'dz'].map(toStepLine),
    `scoreboard players set #steps ${idScore} ${RAY_STEPS_PER_TICK * RAY_TICKS}`,
    `function ${ray} with storage ${id('ray')}`,
    'kill @s',
  ].join('\n');
  // Runs as the follower, so anchor reads its yaw. Each exit anchors once and returns.
  text[at('function/ray.mcfunction')] = [
    `execute positioned ~-0.5 ~-0.5 ~-0.5 at @e[dx=0,dy=0,dz=0,${ignored},sort=nearest,limit=1] align xyz positioned ~0.5 ~ ~0.5 run return run function ${id('anchor')}`,
    `scoreboard players remove #steps ${idScore} 1`,
    `$execute if score #steps ${idScore} matches 1.. positioned ~$(dx) ~$(dy) ~$(dz) if block ~ ~ ~ #minecraft:replaceable run return run function ${ray} with storage ${id('ray')}`,
    `execute align xyz positioned ~0.5 ~ ~0.5 run function ${id('anchor')}`,
  ].join('\n');
}

// Wears the marked bow in whichever hand holds it, one damage per shot, and breaks it on the last use
function writeCreativeBowWear(text: Record<string, string>, namespace: string, uses: number): void {
  const at = (path: string): string => `data/${namespace}/${path}`;
  const id = (path: string): string => `${namespace}:${path}`;
  const bow = `minecraft:bow[minecraft:custom_data~{wand:${toSnbtString(namespace)}}]`;
  text[at('function/wear.mcfunction')] = [
    `execute if items entity @s weapon.mainhand ${bow} run return run function ${id('wear_slot')} {slot:"weapon.mainhand"}`,
    `execute if items entity @s weapon.offhand ${bow} run function ${id('wear_slot')} {slot:"weapon.offhand"}`,
  ].join('\n');
  // Each line matches one damage value and returns, so a shot adds exactly one damage
  const toWearLine = (_: unknown, damage: number): string =>
    `$execute if items entity @s $(slot) *[minecraft:damage=${damage}] run return run item modify entity @s $(slot) {type:"minecraft:set_components",components:{"minecraft:damage":${damage + 1}}}`;
  const last = `$execute if items entity @s $(slot) *[minecraft:damage=${uses - 1}]`;
  text[at('function/wear_slot.mcfunction')] = [
    `${last} run playsound minecraft:entity.item.break player @a ~ ~ ~`,
    `${last} run return run item replace entity @s $(slot) with minecraft:air`,
    ...Array.from({ length: uses - 1 }, toWearLine),
  ].join('\n');
}

const toTypeExclusion = (type: string): string => `type=!${type}`;

/**
 * Every file in the data pack, keyed by its path inside the zip
 */
export function toDatapackFiles(options: DatapackOptions): Record<string, Uint8Array> {
  const { namespace } = toAddonNames(options.packName, options.projectId);
  const { build, activator } = options;
  const at = (path: string): string => `data/${namespace}/${path}`;
  const id = (path: string): string => `${namespace}:${path}`;
  const frameScore = `${namespace}.frame`;
  const heldScore = `${namespace}.held`;
  const tag = `${namespace}.build`;
  const text: Record<string, string> = {};

  text['pack.mcmeta'] = JSON.stringify(
    {
      pack: {
        description: `${options.packName}: /function ${id('give')}`,
        min_format: DATA_PACK_FORMAT,
        max_format: DATA_PACK_FORMAT,
      },
    },
    null,
    2,
  );
  text['data/minecraft/tags/function/load.json'] = JSON.stringify({ values: [id('load')] });
  text['data/minecraft/tags/function/tick.json'] = JSON.stringify({ values: [id('tick')] });

  text[at('function/load.mcfunction')] = [
    `scoreboard objectives add ${frameScore} dummy`,
    `scoreboard objectives add ${activator === 'wand' ? heldScore : `${namespace}.id`} dummy`,
  ].join('\n');
  const item = toActivatorItem(options, namespace);
  const countSuffix = item.count > 1 ? ` ${item.count}` : '';
  text[at('function/give.mcfunction')] = `give @s ${item.id}[${toItemComponents(item.components)}]${countSuffix}`;

  const cost = WAND_RECIPES[options.recipe];
  if (cost) {
    text[at('recipe/wand.json')] = JSON.stringify(
      {
        type: 'minecraft:crafting_shapeless',
        category: 'equipment',
        ingredients: [item.id, cost],
        result: { id: item.id, count: item.count, components: item.components },
      },
      null,
      2,
    );
    // Shows the recipe in the recipe book once the player holds the cost item
    text[at('advancement/recipe.json')] = JSON.stringify(
      {
        criteria: { has_cost: { trigger: 'minecraft:inventory_changed', conditions: { items: [{ items: cost }] } } },
        rewards: { recipes: [id('wand')] },
      },
      null,
      2,
    );
  }

  if (activator === 'wand') writeWandUse(text, options, namespace);
  else writeProjectileTracking(text, activator, namespace, options.uses);

  // Turns the build so the executor faces the meta block's arrow. Each line returns, so one marker is summoned.
  const metaIndex = FACING_INDEX[options.metaFacing];
  const toAnchorLines = (ranges: string[], playerIndex: number): string[] => {
    const turns = (playerIndex - metaIndex + 4) % 4;
    const toLine = (range: string): string =>
      `execute if entity @s[y_rotation=${range}] run return run summon minecraft:marker ~ ~ ~ {Tags:["${tag}"],data:{turn:${turns}}}`;
    return ranges.map(toLine);
  };
  text[at('function/anchor.mcfunction')] = YAW_RANGES.flatMap(toAnchorLines).join('\n');

  const frames = toFrames(options);
  const lastTick = frames.length - 1;
  const tickLines = [`execute as @e[type=minecraft:marker,tag=${tag}] at @s run function ${id('step')}`];
  if (activator === 'wand') tickLines.unshift(`scoreboard players remove @a[scores={${heldScore}=1..}] ${heldScore} 1`);
  else tickLines.unshift(`function ${id('track')}`);
  text[at('function/tick.mcfunction')] = tickLines.join('\n');
  text[at('function/step.mcfunction')] = [
    `scoreboard players add @s ${frameScore} 0`,
    `execute store result entity @s data.frame int 1 run scoreboard players get @s ${frameScore}`,
    `function ${id('frame')} with entity @s data`,
    `scoreboard players add @s ${frameScore} 1`,
    `execute if score @s ${frameScore} matches ${lastTick + 1}.. run kill @s`,
  ].join('\n');
  text[at('function/frame.mcfunction')] = `$function ${id('frames/$(turn)/$(frame)')}`;
  for (let turns = 0; turns < 4; turns++) {
    const writeFrame = (frame: Frame, tick: number): void => {
      text[at(`function/frames/${turns}/${tick}.mcfunction`)] = toFrameFunction(frame, tick, lastTick, turns, build);
    };
    frames.forEach(writeFrame);
  }

  const files: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(text)) files[path] = strToU8(content);
  return files;
}

export function toDatapackZip(options: DatapackOptions): Uint8Array {
  return zipSync(toDatapackFiles(options));
}
