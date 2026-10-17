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
 * Offsets are in game axes relative to the meta block: x east, y up, z south.
 */

import { strToU8, zipSync } from 'fflate';

import type { HorizontalDirection } from '../types';
import type { AnimatedBuild } from './animatedBuild';
import type { ItemIcon } from './bedrockAddon';
import type { BuildSequence } from './bedrockAddonScript';
import type { BedrockBlockTable } from './bedrockBlocks';
import { toAddonNames } from './bedrockAddon';
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

/**
 * Every file in the data pack, keyed by its path inside the zip
 */
export function toDatapackFiles(options: DatapackOptions): Record<string, Uint8Array> {
  const { namespace } = toAddonNames(options.packName, options.projectId);
  const { build, uses, icon } = options;
  const at = (path: string): string => `data/${namespace}/${path}`;
  const id = (path: string): string => `${namespace}:${path}`;
  const frameScore = `${namespace}.frame`;
  const heldScore = `${namespace}.held`;
  const tag = `${namespace}.build`;
  const wand = `*[minecraft:custom_data~{wand:${toSnbtString(namespace)}}]`;
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
    `scoreboard objectives add ${heldScore} dummy`,
  ].join('\n');
  const components = toWandComponents(options, namespace);
  text[at('function/give.mcfunction')] = `give @s minecraft:${icon}[${toItemComponents(components)}]`;

  const cost = WAND_RECIPES[options.recipe];
  if (cost) {
    text[at('recipe/wand.json')] = JSON.stringify(
      {
        type: 'minecraft:crafting_shapeless',
        category: 'equipment',
        ingredients: [`minecraft:${icon}`, cost],
        result: { id: `minecraft:${icon}`, count: 1, components },
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

  // Turns the build so the player faces the meta block's arrow. Each line returns, so one marker is summoned.
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
  text[at('function/tick.mcfunction')] = [
    `scoreboard players remove @a[scores={${heldScore}=1..}] ${heldScore} 1`,
    `execute as @e[type=minecraft:marker,tag=${tag}] at @s run function ${id('step')}`,
  ].join('\n');
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

  if (uses > 0) {
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

  const files: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(text)) files[path] = strToU8(content);
  return files;
}

export function toDatapackZip(options: DatapackOptions): Uint8Array {
  return zipSync(toDatapackFiles(options));
}
