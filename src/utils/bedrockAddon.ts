/**
 * Bedrock .mcaddon packaging: a behavior pack holding the structure, the item, and its script,
 * and a resource pack that gives the item a vanilla icon. No texture file ships in either pack.
 *
 * Pack UUIDs derive from the project ID, so a later export of the same project updates the installed packs.
 * The version is the export time in seconds, which only rises.
 */

import { strToU8, zipSync } from 'fflate';

import type { Placement, PlayerFacing } from './bedrockExport';

// Latest stable @minecraft/server, and the game version that ships it
export const SCRIPT_API_VERSION = '2.10.0';
const MIN_ENGINE_VERSION = [1, 26, 50];
const ITEM_FORMAT_VERSION = '1.26.10';
const NAMESPACE = 'structures';

export type AnimationMode = 'Layers' | 'Blocks' | 'None';

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
  projectName: string;
  itemName: string;
  icon: ItemIcon;
  animationMode: AnimationMode;
  animationSeconds: number;
  structure: Uint8Array;
  placements: Record<PlayerFacing, Placement>;
  exportedAt: number;
}

export interface AddonNames {
  slug: string;
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

export function toAddonNames(projectName: string): AddonNames {
  const slug = toSlug(projectName);
  return {
    slug,
    structureId: `${NAMESPACE}:${slug}`,
    itemId: `${NAMESPACE}:${slug}_wand`,
    componentId: `${NAMESPACE}:build_${slug}`,
  };
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

/**
 * The script inside the behavior pack. Used on a block, the item anchors the build in the cell next to
 * the clicked face. Used in the air, it anchors at the player's feet. Placement waits one tick, since
 * item events run before the world may change.
 */
export function toAddonScript(names: AddonNames, options: Pick<AddonOptions, 'animationMode' | 'animationSeconds' | 'placements'>): string {
  return `import { system, world, StructureAnimationMode, StructureRotation } from "@minecraft/server";

const STRUCTURE_ID = ${JSON.stringify(names.structureId)};
const ANIMATION_MODE = StructureAnimationMode.${options.animationMode};
const ANIMATION_SECONDS = ${options.animationSeconds};
// Rotation and minimum-corner offset from the anchor, for each way the player can face
const PLACEMENTS = ${JSON.stringify(options.placements)};
const FACINGS = ["north", "east", "south", "west"];
const FACE_OFFSETS = { Up: [0, 1, 0], Down: [0, -1, 0], North: [0, 0, -1], South: [0, 0, 1], East: [1, 0, 0], West: [-1, 0, 0] };

// A use on a block also raises the plain use event in the same tick
let lastUseOnTick = -1;

// Bedrock yaw: 0 faces south, 90 west, 180 north, -90 east
function toFacing(player) {
  const yaw = player.getRotation().y;
  const quarter = Math.round(((((yaw + 180) % 360) + 360) % 360) / 90) % 4;
  return FACINGS[quarter];
}

function placeAround(player, anchor) {
  const placement = PLACEMENTS[toFacing(player)];
  const location = {
    x: anchor.x + placement.offset.x,
    y: anchor.y + placement.offset.y,
    z: anchor.z + placement.offset.z,
  };
  function place() {
    try {
      world.structureManager.place(STRUCTURE_ID, player.dimension, location, {
        rotation: StructureRotation[placement.rotation],
        animationMode: ANIMATION_MODE,
        animationSeconds: ANIMATION_SECONDS,
        includeEntities: false,
      });
    } catch (error) {
      player.sendMessage("The build could not be placed here: " + error);
    }
  }
  system.run(place);
}

function handleUseOn(event) {
  lastUseOnTick = system.currentTick;
  const offset = FACE_OFFSETS[event.blockFace] ?? FACE_OFFSETS.Up;
  const { x, y, z } = event.block.location;
  placeAround(event.source, { x: x + offset[0], y: y + offset[1], z: z + offset[2] });
}

function handleUse(event) {
  if (system.currentTick === lastUseOnTick) return;
  const { x, y, z } = event.source.location;
  placeAround(event.source, { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });
}

function registerComponent(startup) {
  startup.itemComponentRegistry.registerCustomComponent(${JSON.stringify(names.componentId)}, {
    onUse: handleUse,
    onUseOn: handleUseOn,
  });
}

system.beforeEvents.startup.subscribe(registerComponent);
`;
}

const toJson = (value: unknown): Uint8Array => strToU8(`${JSON.stringify(value, null, 2)}\n`);

/**
 * File path → bytes for both packs, under "<slug>_BP/" and "<slug>_RP/"
 */
export async function toAddonFiles(options: AddonOptions): Promise<Record<string, Uint8Array>> {
  const names = toAddonNames(options.projectName);
  const version = [1, 0, Math.floor(options.exportedAt / 1000)];
  const [behaviorUuid, dataUuid, scriptUuid, resourceUuid, resourceModuleUuid] = await Promise.all([
    toStableUuid(`${options.projectId}:behavior`),
    toStableUuid(`${options.projectId}:behavior:data`),
    toStableUuid(`${options.projectId}:behavior:script`),
    toStableUuid(`${options.projectId}:resource`),
    toStableUuid(`${options.projectId}:resource:module`),
  ]);
  const iconKey = `${NAMESPACE}_${names.slug}_wand`;
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
    [`${behaviorRoot}/structures/${NAMESPACE}/${names.slug}.mcstructure`]: options.structure,
    [`${behaviorRoot}/items/${names.slug}_wand.json`]: toJson({
      format_version: ITEM_FORMAT_VERSION,
      'minecraft:item': {
        description: { identifier: names.itemId, menu_category: { category: 'items' } },
        components: {
          'minecraft:icon': iconKey,
          'minecraft:display_name': { value: options.itemName },
          'minecraft:max_stack_size': 1,
          [names.componentId]: {},
        },
      },
    }),
    [`${behaviorRoot}/scripts/main.js`]: strToU8(toAddonScript(names, options)),
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
    [`${resourceRoot}/textures/item_texture.json`]: toJson({
      resource_pack_name: options.projectName,
      texture_name: 'atlas.items',
      texture_data: { [iconKey]: { textures: `textures/items/${options.icon}` } },
    }),
  };
}

export async function toMcaddon(options: AddonOptions): Promise<Uint8Array> {
  return zipSync(await toAddonFiles(options));
}
