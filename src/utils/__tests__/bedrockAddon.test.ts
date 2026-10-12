// fflate tells files from folders with instanceof Uint8Array, which fails across jsdom's realm
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { toAddonFiles, toAddonNames, toAddonScript, toMcaddon, toPackVersion, toSlug, SCRIPT_API_VERSION } from '../bedrockAddon';
import type { AddonOptions } from '../bedrockAddon';

const PLACEMENT = { rotation: 'None' as const, offset: { x: -1, y: 0, z: -2 } };
const OPTIONS: AddonOptions = {
  projectId: 'project-1',
  projectName: 'Castle Keep!',
  itemName: 'Castle Key',
  icon: 'trial_key',
  animationMode: 'Layers',
  animationSeconds: 6,
  structure: new Uint8Array([10, 0, 0]),
  placements: { north: PLACEMENT, east: PLACEMENT, south: PLACEMENT, west: PLACEMENT },
  exportedAt: 1_800_000_000_000,
};

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

describe('toAddonFiles', () => {
  it('lays out a behavior pack and a resource pack with no texture files', async () => {
    const files = await toAddonFiles(OPTIONS);
    expect(Object.keys(files).sort()).toEqual([
      'castle_keep_BP/items/castle_keep_wand.json',
      'castle_keep_BP/manifest.json',
      'castle_keep_BP/scripts/main.js',
      'castle_keep_BP/structures/structures/castle_keep.mcstructure',
      'castle_keep_RP/manifest.json',
      'castle_keep_RP/textures/item_texture.json',
    ]);
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

  it('gives the same project the same pack UUIDs on every export', async () => {
    const first = readJson(await toAddonFiles(OPTIONS), 'castle_keep_BP/manifest.json');
    const later = readJson(await toAddonFiles({ ...OPTIONS, exportedAt: 1_900_000_000_000 }), 'castle_keep_BP/manifest.json');
    const other = readJson(await toAddonFiles({ ...OPTIONS, projectId: 'project-2' }), 'castle_keep_BP/manifest.json');
    expect(later.header.uuid).toBe(first.header.uuid);
    expect(other.header.uuid).not.toBe(first.header.uuid);
    expect(first.header.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('wires the item to its component and a vanilla icon path', async () => {
    const files = await toAddonFiles(OPTIONS);
    const item = readJson(files, 'castle_keep_BP/items/castle_keep_wand.json')['minecraft:item'];
    const textures = readJson(files, 'castle_keep_RP/textures/item_texture.json');
    expect(item.description.identifier).toBe('structures:castle_keep_wand');
    expect(item.components['structures:build_castle_keep']).toEqual({});
    expect(textures.texture_data[item.components['minecraft:icon']]).toEqual({ textures: 'textures/items/trial_key' });
  });
});

describe('toAddonScript', () => {
  it('is valid JavaScript that names the structure and component', () => {
    const script = toAddonScript(toAddonNames(OPTIONS.projectName), OPTIONS);
    const file = join(mkdtempSync(join(tmpdir(), 'addon-script-')), 'main.mjs');
    writeFileSync(file, script);

    const checkSyntax = (): Buffer => execFileSync(process.execPath, ['--check', file]);
    expect(checkSyntax).not.toThrow();
    expect(script).toContain('"structures:castle_keep"');
    expect(script).toContain('registerCustomComponent("structures:build_castle_keep"');
    expect(script).toContain('StructureAnimationMode.Layers');
  });
});

describe('toMcaddon', () => {
  it('zips every pack file', async () => {
    const unzipped = unzipSync(await toMcaddon(OPTIONS));
    expect(Object.keys(unzipped)).toHaveLength(6);
    expect(unzipped['castle_keep_BP/structures/structures/castle_keep.mcstructure']).toEqual(OPTIONS.structure);
  });
});
