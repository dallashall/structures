// fflate tells files from folders with instanceof Uint8Array, which fails across jsdom's realm
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { findBadManifestVersions, toAddonFiles, toAddonNames, toMcaddon, toPackVersion, toSlug, SCRIPT_API_VERSION } from '../bedrockAddon';
import type { AddonOptions } from '../bedrockAddon';

const PLACEMENT = { rotation: 'None' as const, offset: { x: -1, y: 0, z: -2 } };
const OPTIONS: AddonOptions = {
  projectId: 'project-1',
  projectName: 'Castle Keep!',
  itemName: 'Castle Key',
  icon: 'trial_key',
  activator: 'wand',
  sequence: 'rise',
  seconds: 6,
  uses: 0,
  metaFacing: 'y-',
  camera: 'none',
  structure: new Uint8Array([10, 0, 0]),
  build: {
    palette: [{ rotations: [['minecraft:stone', {}], ['minecraft:stone', {}], ['minecraft:stone', {}], ['minecraft:stone', {}]], color: [0.5, 0.5, 0.5] }],
    cells: [1, 0, 0, 0],
    skipped: new Map(),
  },
  placements: { north: PLACEMENT, east: PLACEMENT, south: PLACEMENT, west: PLACEMENT },
  exportedAt: 1_800_000_000_000,
  packIcon: new Uint8Array([137, 80, 78, 71]),
};

const NAMES = toAddonNames(OPTIONS.projectName, OPTIONS.projectId);

const readJson = (files: Record<string, Uint8Array>, path: string): Record<string, any> =>
  JSON.parse(strFromU8(files[path]));

describe('toSlug', () => {
  it('keeps lowercase letters, digits, and underscores', () => {
    expect(toSlug('Castle Keep!')).toBe('castle_keep');
    expect(toSlug('***')).toBe('build');
  });
});

describe('toPackVersion', () => {
  const at = (iso: string): number => Date.parse(iso);
  const isUnsigned16 = (part: number): boolean => Number.isInteger(part) && part >= 0 && part <= 65535;

  it('keeps every part within the 16-bit range Bedrock reads', () => {
    expect(toPackVersion(at('2026-10-12T17:30:00Z'))).toEqual([1, 284, 1050]);
    expect(toPackVersion(at('2099-12-31T23:59:00Z')).every(isUnsigned16)).toBe(true);
  });

  it('rises from one export to the next', () => {
    const toNumber = ([, day, minute]: number[]): number => day * 1440 + minute;
    expect(toNumber(toPackVersion(at('2026-10-13T00:01:00Z')))).toBeGreaterThan(toNumber(toPackVersion(at('2026-10-12T23:59:00Z'))));
  });
});

describe('toAddonNames', () => {
  it('namespaces each add-on by its name and its project', () => {
    const castle = toAddonNames('Castle', 'project-1');
    expect(castle.namespace).toMatch(/^castle_[0-9a-z]{4}$/);
    expect(castle.itemId).toBe(`${castle.namespace}:wand`);
    expect(toAddonNames('Castle', 'project-1')).toEqual(castle);
    expect(toAddonNames('Castle', 'project-2').namespace).not.toBe(castle.namespace);
    expect(toAddonNames('Castle Gate', 'project-1').namespace).not.toBe(castle.namespace);
  });
});

describe('toAddonFiles', () => {
  it('lays out a behavior pack and a resource pack whose only image is the pack icon', async () => {
    const files = await toAddonFiles(OPTIONS);
    expect(Object.keys(files).sort()).toEqual([
      'castle_keep_BP/items/castle_keep_wand.json',
      'castle_keep_BP/manifest.json',
      'castle_keep_BP/pack_icon.png',
      'castle_keep_BP/scripts/main.js',
      `castle_keep_BP/structures/${NAMES.namespace}/build.mcstructure`,
      'castle_keep_RP/manifest.json',
      'castle_keep_RP/pack_icon.png',
      'castle_keep_RP/particles/build_glow.json',
      'castle_keep_RP/textures/item_texture.json',
    ]);
  });

  it('makes a bow that fires vanilla arrows, or a stack of throwable snowballs, with no wand component', async () => {
    const item = (files: Record<string, Uint8Array>): { components: Record<string, unknown> } =>
      (readJson(files, 'castle_keep_BP/items/castle_keep_wand.json') as { 'minecraft:item': { components: Record<string, unknown> } })['minecraft:item'];
    const bow = item(await toAddonFiles({ ...OPTIONS, activator: 'bow' })).components;
    expect(bow['minecraft:shooter']).toMatchObject({ ammunition: [{ item: 'minecraft:arrow' }] });
    expect(Object.keys(bow).some(isNamespacedComponent)).toBe(false);
    const snowball = item(await toAddonFiles({ ...OPTIONS, activator: 'snowball' })).components;
    expect(snowball['minecraft:max_stack_size']).toBe(16);
    expect(snowball['minecraft:projectile']).toEqual({ projectile_entity: 'minecraft:snowball' });
    const texture = readJson(await toAddonFiles({ ...OPTIONS, activator: 'snowball' }), 'castle_keep_RP/textures/item_texture.json');
    expect(JSON.stringify(texture)).toContain('textures/items/snowball');
  });

  it('links the packs to each other and pins the script API', async () => {
    const files = await toAddonFiles(OPTIONS);
    const behavior = readJson(files, 'castle_keep_BP/manifest.json');
    const resource = readJson(files, 'castle_keep_RP/manifest.json');
    const version = toPackVersion(OPTIONS.exportedAt);
    expect(behavior.dependencies).toContainEqual({ uuid: resource.header.uuid, version });
    expect(resource.dependencies).toContainEqual({ uuid: behavior.header.uuid, version });
    expect(behavior.dependencies).toContainEqual({ module_name: '@minecraft/server', version: SCRIPT_API_VERSION });
  });

  it('writes only manifest versions Bedrock can read', async () => {
    const files = await toAddonFiles(OPTIONS);
    expect(findBadManifestVersions(readJson(files, 'castle_keep_BP/manifest.json'))).toEqual([]);
    expect(findBadManifestVersions(readJson(files, 'castle_keep_RP/manifest.json'))).toEqual([]);
    expect(findBadManifestVersions({ modules: [{ version: [1, 0, 1_800_000_000] }] })).toEqual(['manifest/modules/0/version [1,0,1800000000]']);
  });

  it('keeps pack UUIDs for the same project and add-on name, and changes them for a new name', async () => {
    const first = readJson(await toAddonFiles(OPTIONS), 'castle_keep_BP/manifest.json');
    const later = readJson(await toAddonFiles({ ...OPTIONS, exportedAt: 1_900_000_000_000 }), 'castle_keep_BP/manifest.json');
    const other = readJson(await toAddonFiles({ ...OPTIONS, projectId: 'project-2' }), 'castle_keep_BP/manifest.json');
    expect(later.header.uuid).toBe(first.header.uuid);
    const renamed = readJson(await toAddonFiles({ ...OPTIONS, projectName: 'Castle Gate' }), 'castle_gate_BP/manifest.json');
    expect(renamed.header.uuid).not.toBe(first.header.uuid);
    expect(other.header.uuid).not.toBe(first.header.uuid);
    expect(first.header.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('gives the item durability only when uses are limited', async () => {
    const itemPath = 'castle_keep_BP/items/castle_keep_wand.json';
    const unlimited = readJson(await toAddonFiles(OPTIONS), itemPath)['minecraft:item'].components;
    const limited = readJson(await toAddonFiles({ ...OPTIONS, uses: 3 }), itemPath)['minecraft:item'].components;
    expect(unlimited['minecraft:durability']).toBeUndefined();
    expect(limited['minecraft:durability']).toEqual({ max_durability: 3 });
  });

  it('wires the item to its component and a vanilla icon path', async () => {
    const files = await toAddonFiles(OPTIONS);
    const item = readJson(files, 'castle_keep_BP/items/castle_keep_wand.json')['minecraft:item'];
    const textures = readJson(files, 'castle_keep_RP/textures/item_texture.json');
    expect(item.description.identifier).toBe(`${NAMES.namespace}:wand`);
    expect(item.components[NAMES.componentId]).toEqual({});
    expect(textures.texture_data[item.components['minecraft:icon']]).toEqual({ textures: ['textures/items/trial_key'] });
  });
});

describe('toMcaddon', () => {
  it('zips every pack file', async () => {
    const unzipped = unzipSync(await toMcaddon(OPTIONS));
    expect(Object.keys(unzipped)).toHaveLength(9);
    expect(unzipped[`castle_keep_BP/structures/${NAMES.namespace}/build.mcstructure`]).toEqual(OPTIONS.structure);
  });
});

const isNamespacedComponent = (key: string): boolean => !key.startsWith('minecraft:');
