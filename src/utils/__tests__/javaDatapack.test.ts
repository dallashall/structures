// fflate tells files from folders with instanceof Uint8Array, which fails across jsdom's realm
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';

import type { AnimatedBuild } from '../animatedBuild';
import type { BedrockBlockTable } from '../bedrockBlocks';
import type { DatapackOptions } from '../javaDatapack';
import { toAddonNames } from '../bedrockAddon';
import { LEAD_TICKS, toDurationTicks } from '../buildSequence';
import { DATA_PACK_FORMAT, findJavaBlockState, toDatapackFiles, toDatapackZip, toFrames } from '../javaDatapack';

// Cells are [dx, dy, dz, paletteIndex] in game axes: x east, y up, z south
const BUILD: AnimatedBuild<string> = {
  palette: [
    {
      rotations: [
        'minecraft:oak_stairs[facing=north,half=bottom,shape=straight]',
        'minecraft:oak_stairs[facing=east,half=bottom,shape=straight]',
        'minecraft:oak_stairs[facing=south,half=bottom,shape=straight]',
        'minecraft:oak_stairs[facing=west,half=bottom,shape=straight]',
      ],
      color: [0.5, 0.25, 1],
    },
  ],
  cells: [1, 0, -2, 0, 0, 3, 0, 0],
  skipped: new Map(),
};

const alwaysFirst = (): number => 0;

const OPTIONS: DatapackOptions = {
  projectId: 'project-1',
  packName: 'Castle',
  itemName: 'Castle "Wand"',
  icon: 'blaze_rod',
  sequence: 'rise',
  seconds: 2,
  uses: 3,
  recipe: 'none',
  metaFacing: 'y-',
  build: BUILD,
  random: alwaysFirst,
};

const { namespace } = toAddonNames(OPTIONS.packName, OPTIONS.projectId);
const read = (files: Record<string, Uint8Array>, path: string): string => strFromU8(files[path]);
const fn = (name: string): string => `data/${namespace}/function/${name}.mcfunction`;

describe('toFrames', () => {
  it('glows each cell, then lands it LEAD_TICKS later, lowest layer first on a rise', () => {
    const frames = toFrames(OPTIONS);
    expect(frames).toHaveLength(toDurationTicks(OPTIONS.seconds) + LEAD_TICKS + 1);
    const toCells = (frame: { lands: number[] }): number[] => frame.lands;
    expect(frames.flatMap(toCells)).toEqual([0, 1]);
    expect(frames[0].glows).toEqual([0]);
    expect(frames[LEAD_TICKS].lands).toEqual([0]);
  });

  it('glows every cell on the first tick and lands them together on a pop', () => {
    const frames = toFrames({ ...OPTIONS, sequence: 'pop' });
    expect(frames).toHaveLength(LEAD_TICKS + 1);
    expect(frames[0].glows).toEqual([0, 1]);
    expect(frames[LEAD_TICKS].lands).toHaveLength(2);
  });

  it('lands "all at once" in the first tick, with no glow', () => {
    const frames = toFrames({ ...OPTIONS, sequence: 'instant' });
    expect(frames).toEqual([{ glows: [], lands: [0, 1] }]);
  });
});

describe('toDatapackFiles', () => {
  const files = toDatapackFiles(OPTIONS);

  it('declares the target data pack format', () => {
    const meta = JSON.parse(read(files, 'pack.mcmeta')) as { pack: { min_format: number[]; max_format: number[]; description: string } };
    expect(meta.pack.min_format).toEqual(DATA_PACK_FORMAT);
    expect(meta.pack.max_format).toEqual(DATA_PACK_FORMAT);
    expect(meta.pack.description).toContain(`/function ${namespace}:give`);
  });

  it('names every file with the characters Java allows in a resource path', () => {
    const isValidPath = (path: string): boolean => /^[a-z0-9_\-./]+$/.test(path);
    expect(Object.keys(files).every(isValidPath)).toBe(true);
  });

  it('gives a usable wand with its name escaped and durability for its uses', () => {
    const give = read(files, fn('give'));
    expect(give).toMatch(/^give @s minecraft:blaze_rod\[/);
    expect(give).toContain('minecraft:item_name="Castle \\"Wand\\""');
    expect(give).toContain('minecraft:max_damage=3,minecraft:damage=0');
    expect(give).toContain('minecraft:consumable=');
  });

  it('gives an unbreakable wand, with no durability bar, when uses are unlimited', () => {
    const unlimited = toDatapackFiles({ ...OPTIONS, uses: 0 });
    expect(read(unlimited, fn('give'))).not.toContain('max_damage');
    expect(unlimited[fn('wear')]).toBeUndefined();
    expect(read(unlimited, fn('start'))).not.toContain('wear');
  });

  it('adds one damage per use and breaks the wand on the last one', () => {
    const wear = read(files, fn('wear')).split('\n');
    expect(wear).toHaveLength(3);
    expect(wear[0]).toContain('*[minecraft:damage=0]');
    expect(wear[0]).toContain('{"minecraft:damage":1}');
    expect(wear[2]).toContain('*[minecraft:damage=2]');
    expect(wear[2]).toContain(`function ${namespace}:break`);
  });

  it('starts a build only on a fresh press of the wand', () => {
    const advancement = JSON.parse(read(files, `data/${namespace}/advancement/use.json`)) as {
      criteria: { use: { trigger: string; conditions: { item: { predicates: Record<string, unknown> } } } };
    };
    expect(advancement.criteria.use.trigger).toBe('minecraft:using_item');
    expect(advancement.criteria.use.conditions.item.predicates['minecraft:custom_data']).toEqual({ wand: namespace });
    expect(read(files, fn('use'))).toContain(`unless score @s ${namespace}.held matches 1..`);
  });

  it('turns the build so the player faces the meta block\'s arrow', () => {
    const toTurn = (line: string): number => Number(/turn:(\d)/.exec(line)?.[1]);
    expect(read(files, fn('anchor')).split('\n').map(toTurn)).toEqual([0, 0, 1, 2, 3]);
    const east = toDatapackFiles({ ...OPTIONS, metaFacing: 'x+' });
    expect(read(east, fn('anchor')).split('\n').map(toTurn)).toEqual([3, 3, 0, 1, 2]);
  });

  it('writes one function per tick per turn, with offsets and states turned clockwise', () => {
    const frameCount = toFrames(OPTIONS).length;
    const isFrame = (path: string): boolean => path.includes('/function/frames/');
    expect(Object.keys(files).filter(isFrame)).toHaveLength(frameCount * 4);
    expect(read(files, fn(`frames/0/${LEAD_TICKS}`))).toContain('setblock ~1 ~0 ~-2 minecraft:oak_stairs[facing=north');
    expect(read(files, fn(`frames/1/${LEAD_TICKS}`))).toContain('setblock ~2 ~0 ~1 minecraft:oak_stairs[facing=east');
    expect(read(files, fn('frames/0/0'))).toContain('particle minecraft:dust{color:[0.5,0.25,1],scale:1.5} ~1 ~0.5 ~-2');
    expect(read(files, fn(`frames/0/${frameCount - 1}`))).toContain('entity.player.levelup');
  });

  it('adds no recipe unless one is chosen, and the give function either way', () => {
    expect(files[`data/${namespace}/recipe/wand.json`]).toBeUndefined();
    const crafted = toDatapackFiles({ ...OPTIONS, recipe: 'diamond' });
    expect(crafted[fn('give')]).toBeDefined();
  });

  it('crafts the same wand that give hands out, from the icon item and the cost', () => {
    const crafted = toDatapackFiles({ ...OPTIONS, recipe: 'diamond' });
    const recipe = JSON.parse(read(crafted, `data/${namespace}/recipe/wand.json`)) as {
      type: string;
      ingredients: string[];
      result: { id: string; components: Record<string, unknown> };
    };
    expect(recipe.type).toBe('minecraft:crafting_shapeless');
    expect(recipe.ingredients).toEqual(['minecraft:blaze_rod', 'minecraft:diamond']);
    expect(recipe.result.id).toBe('minecraft:blaze_rod');
    expect(recipe.result.components['minecraft:custom_data']).toEqual({ wand: namespace });
    expect(recipe.result.components['minecraft:item_name']).toBe(OPTIONS.itemName);
    expect(recipe.result.components['minecraft:max_damage']).toBe(3);
    expect(recipe.result.components['minecraft:damage']).toBe(0);
    const unlock = JSON.parse(read(crafted, `data/${namespace}/advancement/recipe.json`)) as { rewards: { recipes: string[] } };
    expect(unlock.rewards.recipes).toEqual([`${namespace}:wand`]);
  });

  it('zips the same files', () => {
    expect(Object.keys(unzipSync(toDatapackZip(OPTIONS))).sort()).toEqual(Object.keys(files).sort());
  });
});

describe('findJavaBlockState', () => {
  const table: BedrockBlockTable = {
    source: 'test',
    bedrockVersion: [1, 26, 30],
    blocks: {
      'minecraft:stone': { '': ['minecraft:stone', {}] },
      'minecraft:oak_slab': { 'type=bottom,waterlogged=false': ['minecraft:oak_slab', {}], 'type=top,waterlogged=false': ['minecraft:oak_slab', {}] },
    },
  };

  it('writes a full state, filling properties the app does not track', () => {
    expect(findJavaBlockState(table, 'minecraft:oak_slab', { type: 'top' })).toBe('minecraft:oak_slab[type=top,waterlogged=false]');
    expect(findJavaBlockState(table, 'minecraft:stone', {})).toBe('minecraft:stone');
    expect(findJavaBlockState(table, 'minecraft:copper_sink', {})).toBeNull();
  });
});
