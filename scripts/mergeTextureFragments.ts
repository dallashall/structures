#!/usr/bin/env tsx

/**
 * Texture fragment merger
 *
 * The parser adds one cube per texture that has no blockstate, so a single block can appear as
 * several entries: barrel_top, barrel_side, barrel_bottom, ochre_froglight_side, target11.
 * This pass marks those fragments hidden and, where no entry for the real block exists,
 * adds one whose faces use the fragment textures.
 *
 * Hidden entries stay in the catalog, so a project that placed one still renders it.
 */

import * as fs from 'fs';

import type { BlockTextures, CanonicalBlock, CanonicalBlocks } from '../src/types/canonical';

const NAMESPACE = 'minecraft:';

// Final name tokens that name a face of a block
const FACE_TOKENS = new Set(['top', 'bottom', 'side', 'front', 'back', 'end', 'north', 'south', 'east', 'west']);

// Final name tokens that name a state or texture variant of a block
const STATE_TOKENS = new Set([
  'flip', 'inner', 'outer', 'on', 'off', 'lit', 'unlit', 'empty', 'active', 'inactive', 'up', 'down',
  'left', 'right', 'open', 'closed', 'old', 'base', 'tip', 'overlay', 'particle', 'inside', 'cracked',
  'occupied', 'vertical', 'crafting', 'ominous', 'input', 'stage',
]);

// Groups whose real block already exists under another name, or is not a placeable block
const ALIASES: Record<string, string | null> = {
  bee_hive: null, // beehive
  purpur: null, // purpur_pillar
  grass_path: null, // dirt_path, its current name
  dried_kelp: 'dried_kelp_block',
};

/**
 * The name with one face, state, or variant suffix removed, or null when it has none
 */
function stripSuffix(name: string): string | null {
  const parts = name.split('_');
  if (parts.length > 1) {
    const last = parts[parts.length - 1].replace(/\d+$/, '');
    if (last === '' || FACE_TOKENS.has(last) || STATE_TOKENS.has(last)) {
      return parts.slice(0, -1).join('_');
    }
  }
  // Variant counters and the pack's 3D model textures: target11, oak_planks2, acacia_trapdoor3d
  const trimmed = name.replace(/\d+$/, '').replace(/3d$/, '');
  return trimmed !== name && trimmed !== '' ? trimmed : null;
}

/**
 * Every name reachable by stripping suffixes, nearest first
 */
function ancestors(name: string): string[] {
  const chain: string[] = [];
  for (let current = stripSuffix(name); current; current = stripSuffix(current)) {
    chain.push(current);
  }
  return chain;
}

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

const titleCase = (name: string): string => name.split('_').map(capitalize).join(' ');

/**
 * Faces for a block built from fragments named {base}_{face}. Null when the group has no side face.
 * A face with only state textures (vault_side_off, respawn_anchor_side0) takes the first in name order.
 */
function facesFor(base: string, names: Set<string>, members: string[]): BlockTextures | null {
  const sorted = [...members].sort();
  const face = (suffix: string): string | undefined => {
    const exact = `${base}_${suffix}`;
    if (names.has(exact)) return exact;
    const isStateOfFace = (name: string): boolean => name.startsWith(exact) && stripSuffix(name) !== null;
    return sorted.find(isStateOfFace);
  };
  const side = face('side') ?? face('north');
  if (!side) return null;

  const top = face('top') ?? face('end') ?? side;
  const textures: BlockTextures = { top, bottom: face('bottom') ?? face('end') ?? top, side };
  // The atlas builder reads the front face from the north key
  const front = face('front') ?? face('north');
  if (front && front !== side) textures.north = front;
  return textures;
}

export interface MergeResult {
  blocks: CanonicalBlocks;
  hidden: string[];
  merged: string[];
}

export function mergeTextureFragments(source: CanonicalBlocks): MergeResult {
  const blocks: CanonicalBlocks = {};
  const names = new Set<string>();
  for (const [id, block] of Object.entries(source)) {
    blocks[id] = { ...block };
    names.add(id.slice(NAMESPACE.length));
  }

  const hidden: string[] = [];
  const orphanGroups = new Map<string, string[]>();

  for (const name of names) {
    const chain = ancestors(name);
    if (chain.length === 0) continue;

    const hasBase = (candidate: string): boolean => names.has(candidate);
    const root = chain[chain.length - 1];
    if (!chain.some(hasBase)) {
      orphanGroups.set(root, [...(orphanGroups.get(root) ?? []), name]);
    }
    blocks[NAMESPACE + name].hidden = true;
    hidden.push(name);
  }

  const merged: string[] = [];
  for (const [root, members] of orphanGroups) {
    const target = root in ALIASES ? ALIASES[root] : root;
    if (!target || names.has(target)) continue;

    const textures = facesFor(root, names, members);
    if (!textures) continue;

    const sample: CanonicalBlock = blocks[NAMESPACE + (textures.side as string)] ?? blocks[NAMESPACE + members[0]];
    blocks[NAMESPACE + target] = {
      displayName: titleCase(target),
      category: sample.category,
      color: sample.color,
      textures,
      hasBlockState: false,
      isCube: true,
      isTransparent: sample.isTransparent ?? false,
    };
    merged.push(target);
  }

  return { blocks, hidden: hidden.sort(), merged: merged.sort() };
}

const isEntryPoint = process.argv[1]?.endsWith('mergeTextureFragments.ts');
if (isEntryPoint) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: tsx scripts/mergeTextureFragments.ts <canonical-blocks.json>...');
    process.exit(1);
  }
  for (const file of files) {
    const source = JSON.parse(fs.readFileSync(file, 'utf-8')) as CanonicalBlocks;
    const { blocks, hidden, merged } = mergeTextureFragments(source);
    fs.writeFileSync(file, JSON.stringify(blocks, null, 2));
    console.log(`${file}: ${hidden.length} fragments hidden, ${merged.length} blocks merged`);
    console.log(`  merged: ${merged.join(', ')}`);
  }
}
