/**
 * Bedrock .mcaddon packaging: a behavior pack holding the structure, the item, and its script,
 * and a resource pack with the item's vanilla icon and the build's glow particle. No game texture ships in either pack. The only image is
 * the app logo as each pack's icon.
 *
 * Pack UUIDs derive from the project ID and the add-on name, so exporting the same add-on again updates the
 * installed packs, and an export under a new name installs beside it.
 * The version comes from the export time, so it rises with every export (see toPackVersion).
 */

import { strToU8, zipSync } from 'fflate';

import type { AnimatedBuild } from './animatedBuild';
import type { BedrockTableEntry } from './bedrockBlocks';
import type { Placement, PlayerFacing } from './bedrockExport';
import type { BuildSequence } from './bedrockAddonScript';
import type { HorizontalDirection } from '../types';
import type { CameraMode } from './cameraPath';
import { GLOW_PARTICLE_ID, toAddonScript, toGlowParticle } from './bedrockAddonScript';

// Latest stable @minecraft/server, and the game version that ships it
export const SCRIPT_API_VERSION = '2.10.0';
const MIN_ENGINE_VERSION = [1, 26, 50];
const ITEM_FORMAT_VERSION = '1.26.50';

// Vanilla item textures. Resource packs may point at them without shipping a copy.
export const ITEM_ICONS = {
  blaze_rod: 'Blaze Rod',
  breeze_rod: 'Breeze Rod',
  stick: 'Stick',
  trial_key: 'Trial Key',
  amethyst_shard: 'Amethyst Shard',
  nether_star: 'Nether Star',
} as const;

export type ItemIcon = keyof typeof ITEM_ICONS;

export interface AddonOptions {
  projectId: string;
  // The add-on's name in the game's pack list. Its slug names the file, the structure, and the item.
  projectName: string;
  itemName: string;
  icon: ItemIcon;
  sequence: BuildSequence;
  seconds: number;
  // Uses before the item breaks. 0 means unlimited.
  uses: number;
  metaFacing: HorizontalDirection;
  camera: CameraMode;
  // Whole structure, placed at once by the "instant" sequence
  structure: Uint8Array;
  placements: Record<PlayerFacing, Placement>;
  // Block list for the animated sequences
  build: AnimatedBuild<BedrockTableEntry>;
  exportedAt: number;
  // The app logo, shown beside both packs in the game's pack list. It is app artwork, not a game texture.
  packIcon: Uint8Array;
}

export interface AddonNames {
  slug: string;
  namespace: string;
  structureId: string;
  itemId: string;
  componentId: string;
}

/**
 * Lowercase letters, digits, and underscores, as Bedrock identifiers allow. Falls back to "build".
 */
export function toSlug(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32);
  return slug || 'build';
}

// FNV-1a. Only needs to spread project IDs, not resist attack.
function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const PROJECT_CODE_LENGTH = 4;

/**
 * Each add-on gets its own namespace: the name's slug plus a short code from the project ID.
 * Two projects exported under the same name then still register different items, and the same project
 * and name always give the same identifiers, so a later export replaces the installed one.
 */
export function toAddonNames(addonName: string, projectId: string): AddonNames {
  const slug = toSlug(addonName);
  const code = hashString(projectId).toString(36).padStart(PROJECT_CODE_LENGTH, '0').slice(-PROJECT_CODE_LENGTH);
  const namespace = `${slug}_${code}`;
  return {
    slug,
    namespace,
    structureId: `${namespace}:build`,
    itemId: `${namespace}:wand`,
    componentId: `${namespace}:build`,
  };
}

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const VERSION_EPOCH_MS = Date.UTC(2026, 0, 1);

/**
 * [1, days since 2026-01-01, minute of the UTC day]. Bedrock reads each part as a 16-bit number,
 * so a part above 65535 makes the whole manifest unreadable.
 */
export function toPackVersion(exportedAt: number): [number, number, number] {
  const sinceEpoch = Math.max(0, exportedAt - VERSION_EPOCH_MS);
  return [1, Math.floor(sinceEpoch / DAY_MS), Math.floor((sinceEpoch % DAY_MS) / MINUTE_MS)];
}

const isVersionPart = (part: unknown): boolean => Number.isInteger(part) && (part as number) >= 0 && (part as number) <= 65535;

/**
 * Every "version" array in a manifest whose parts Bedrock cannot read. Mojang's validator does not check this.
 */
export function findBadManifestVersions(manifest: unknown, at = 'manifest'): string[] {
  if (Array.isArray(manifest)) {
    const inItem = (item: unknown, index: number): string[] => findBadManifestVersions(item, `${at}/${index}`);
    return manifest.flatMap(inItem);
  }
  if (typeof manifest !== 'object' || manifest === null) return [];

  const problems: string[] = [];
  for (const [key, value] of Object.entries(manifest)) {
    if (key === 'version' && Array.isArray(value) && !value.every(isVersionPart)) {
      problems.push(`${at}/version ${JSON.stringify(value)}`);
    }
    problems.push(...findBadManifestVersions(value, `${at}/${key}`));
  }
  return problems;
}

const toHex = (byte: number): string => byte.toString(16).padStart(2, '0');

/**
 * A name-based UUID (version 5 layout) from SHA-1 of the seed
 */
async function toStableUuid(seed: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(seed)));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, toHex).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const toJson = (value: unknown): Uint8Array => strToU8(`${JSON.stringify(value, null, 2)}\n`);

/**
 * File path → bytes for both packs, under "<slug>_BP/" and "<slug>_RP/"
 */
export async function toAddonFiles(options: AddonOptions): Promise<Record<string, Uint8Array>> {
  const names = toAddonNames(options.projectName, options.projectId);
  const version = toPackVersion(options.exportedAt);
  // The same add-on name from the same project updates its packs. A new name makes a separate add-on.
  const packSeed = `${options.projectId}:${names.slug}`;
  const [behaviorUuid, dataUuid, scriptUuid, resourceUuid, resourceModuleUuid] = await Promise.all([
    toStableUuid(`${packSeed}:behavior`),
    toStableUuid(`${packSeed}:behavior:data`),
    toStableUuid(`${packSeed}:behavior:script`),
    toStableUuid(`${packSeed}:resource`),
    toStableUuid(`${packSeed}:resource:module`),
  ]);
  const iconKey = `${names.namespace}_wand`;
  const behaviorRoot = `${names.slug}_BP`;
  const resourceRoot = `${names.slug}_RP`;

  return {
    [`${behaviorRoot}/manifest.json`]: toJson({
      format_version: 2,
      header: {
        name: options.projectName,
        description: `${options.itemName} builds ${options.projectName}. Made with Structures.`,
        uuid: behaviorUuid,
        version,
        min_engine_version: MIN_ENGINE_VERSION,
      },
      modules: [
        { type: 'data', uuid: dataUuid, version },
        { type: 'script', language: 'javascript', uuid: scriptUuid, version, entry: 'scripts/main.js' },
      ],
      dependencies: [
        { uuid: resourceUuid, version },
        { module_name: '@minecraft/server', version: SCRIPT_API_VERSION },
      ],
    }),
    [`${behaviorRoot}/pack_icon.png`]: options.packIcon,
    [`${resourceRoot}/pack_icon.png`]: options.packIcon,
    // The first folder under structures/ is the identifier's namespace
    [`${behaviorRoot}/structures/${names.namespace}/build.mcstructure`]: options.structure,
    [`${behaviorRoot}/items/${names.slug}_wand.json`]: toJson({
      format_version: ITEM_FORMAT_VERSION,
      'minecraft:item': {
        description: { identifier: names.itemId, menu_category: { category: 'items' } },
        components: {
          'minecraft:icon': iconKey,
          'minecraft:display_name': { value: options.itemName },
          'minecraft:max_stack_size': 1,
          ...(options.uses > 0 ? { 'minecraft:durability': { max_durability: options.uses } } : {}),
          [names.componentId]: {},
        },
      },
    }),
    [`${behaviorRoot}/scripts/main.js`]: strToU8(toAddonScript({
      structureId: names.structureId,
      componentId: names.componentId,
      sequence: options.sequence,
      seconds: options.seconds,
      uses: options.uses,
      metaFacing: options.metaFacing,
      camera: options.camera,
      placements: options.placements,
      build: options.build,
    })),
    [`${resourceRoot}/manifest.json`]: toJson({
      format_version: 2,
      header: {
        name: options.projectName,
        description: `The ${options.itemName} icon.`,
        uuid: resourceUuid,
        version,
        min_engine_version: MIN_ENGINE_VERSION,
      },
      modules: [{ type: 'resources', uuid: resourceModuleUuid, version }],
      dependencies: [{ uuid: behaviorUuid, version }],
    }),
    [`${resourceRoot}/particles/${GLOW_PARTICLE_ID.split(':')[1]}.json`]: toJson(toGlowParticle()),
    [`${resourceRoot}/textures/item_texture.json`]: toJson({
      resource_pack_name: options.projectName,
      texture_name: 'atlas.items',
      texture_data: { [iconKey]: { textures: [`textures/items/${options.icon}`] } },
    }),
  };
}

export async function toMcaddon(options: AddonOptions): Promise<Uint8Array> {
  return zipSync(await toAddonFiles(options));
}
