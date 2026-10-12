#!/usr/bin/env tsx

/**
 * Checks the block catalog against Minecraft's real block list and writes the Java-to-Bedrock state table.
 *
 * - A visible catalog entry whose ID is no Java block gets a javaId when it is a known rename, or is hidden.
 *   Hidden entries stay in the catalog, so projects that placed one still render it.
 * - public/data/bedrock-blocks.json maps each exportable block's Java state to a Bedrock block and states.
 *
 * The mapping comes from PrismarineJS minecraft-data (MIT), pinned by commit and checked by SHA-256.
 *
 * Usage: tsx scripts/buildBedrockBlocks.ts data/canonical-blocks.json public/data/canonical-blocks.json
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { CanonicalBlocks } from '../src/types/canonical';
import type { BedrockBlockTable } from '../src/utils/bedrockBlocks';
import { toJavaStateKey } from '../src/utils/bedrockBlocks';

const SOURCE = {
  commit: 'dd01127457231e7da629d645b3c6738068018eb0',
  file: 'data/bedrock/1.26.30/blocksJ2B.json',
  sha256: '516b880cce503b7ab51c5a7808aa16fa3fff6bf464a309f63ba42471196d4141',
  bedrockVersion: [1, 26, 30] as [number, number, number],
};
const CACHE_PATH = path.join('.cache', 'minecraft-data', `blocksJ2B-${SOURCE.commit.slice(0, 12)}.json`);
const OUTPUT_PATH = path.join('public', 'data', 'bedrock-blocks.json');
const NAMESPACE = 'minecraft:';

// Catalog names that are texture names for a real block under a different ID
const RENAMES: Record<string, string> = {
  grass: 'short_grass',
  magma: 'magma_block',
  chain: 'iron_chain',
  quartz_block_smooth: 'smooth_quartz',
  water_still: 'water',
  lava_still: 'lava',
  potted_azalea_bush_plant: 'potted_azalea_bush',
  potted_flowering_azalea_bush_plant: 'potted_flowering_azalea_bush',
};

type BedrockStateValue = string | number | boolean;

async function loadSource(): Promise<Record<string, string>> {
  if (!fs.existsSync(CACHE_PATH)) {
    const url = `https://raw.githubusercontent.com/PrismarineJS/minecraft-data/${SOURCE.commit}/${SOURCE.file}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, Buffer.from(await response.arrayBuffer()));
  }

  const bytes = fs.readFileSync(CACHE_PATH);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== SOURCE.sha256) {
    fs.rmSync(CACHE_PATH);
    throw new Error(`${SOURCE.file} hash ${hash} does not match the pinned ${SOURCE.sha256}`);
  }
  return JSON.parse(bytes.toString('utf-8')) as Record<string, string>;
}

// "minecraft:oak_stairs[facing=east,half=bottom]" -> ["minecraft:oak_stairs", { facing: "east", half: "bottom" }]
function splitState(text: string): [string, Record<string, string>] {
  const open = text.indexOf('[');
  const id = text.slice(0, open);
  const body = text.slice(open + 1, -1);
  const properties: Record<string, string> = {};
  const addProperty = (pair: string): void => {
    const [key, value] = pair.split('=');
    properties[key] = value;
  };
  if (body) body.split(',').forEach(addProperty);
  return [id, properties];
}

// Bedrock booleans and integers arrive as text. Strings that look like neither stay strings.
function toBedrockValue(value: string): BedrockStateValue {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return /^-?\d+$/.test(value) ? Number(value) : value;
}

function buildTable(source: Record<string, string>, javaIds: Set<string>): BedrockBlockTable {
  const blocks: BedrockBlockTable['blocks'] = {};
  for (const [javaText, bedrockText] of Object.entries(source)) {
    const [javaId, javaProperties] = splitState(javaText);
    if (!javaIds.has(javaId) || javaProperties.waterlogged === 'true') continue;

    const [bedrockName, bedrockProperties] = splitState(bedrockText);
    const states: Record<string, BedrockStateValue> = {};
    for (const [key, value] of Object.entries(bedrockProperties)) states[key] = toBedrockValue(value);

    (blocks[javaId] ??= {})[toJavaStateKey(javaProperties)] = [bedrockName, states];
  }
  return { source: `minecraft-data@${SOURCE.commit.slice(0, 12)}`, bedrockVersion: SOURCE.bedrockVersion, blocks };
}

function validateCatalog(catalog: CanonicalBlocks, javaIds: Set<string>): { renamed: string[]; hidden: string[] } {
  const isVisibleId = (id: string): boolean => Boolean(catalog[id]) && !catalog[id].hidden;
  const renamed: string[] = [];
  const hidden: string[] = [];

  for (const [id, block] of Object.entries(catalog)) {
    if (block.hidden || javaIds.has(block.javaId ?? id)) continue;

    const rename = RENAMES[id.slice(NAMESPACE.length)];
    const target = rename ? `${NAMESPACE}${rename}` : null;
    if (target && javaIds.has(target) && !isVisibleId(target)) {
      block.javaId = target;
      renamed.push(`${id} -> ${target}`);
      continue;
    }
    block.hidden = true;
    hidden.push(id);
  }
  return { renamed, hidden };
}

const printLine = (line: string): void => console.log(line);

async function main(): Promise<void> {
  const catalogPaths = process.argv.slice(2);
  if (catalogPaths.length === 0) {
    console.error('Usage: tsx scripts/buildBedrockBlocks.ts <canonical-blocks.json>...');
    process.exit(1);
  }

  const source = await loadSource();
  const toJavaId = (javaText: string): string => javaText.slice(0, javaText.indexOf('['));
  const knownJavaIds = new Set(Object.keys(source).map(toJavaId));
  const exportedJavaIds = new Set<string>();

  for (const catalogPath of catalogPaths) {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8')) as CanonicalBlocks;
    const { renamed, hidden } = validateCatalog(catalog, knownJavaIds);
    fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
    console.log(`${catalogPath}: ${renamed.length} renamed, ${hidden.length} hidden`);
    renamed.forEach(printLine);

    for (const [id, block] of Object.entries(catalog)) {
      if (!block.hidden || block.javaId) exportedJavaIds.add(block.javaId ?? id);
    }
  }

  const table = buildTable(source, exportedJavaIds);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(table));
  console.log(`${OUTPUT_PATH}: ${Object.keys(table.blocks).length} blocks`);
}

const exitWithError = (error: unknown): void => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
};

main().catch(exitWithError);
