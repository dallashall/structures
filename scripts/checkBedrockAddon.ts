#!/usr/bin/env tsx

/**
 * Builds a sample Bedrock add-on through the same code the editor's Export uses, then runs Mojang's
 * validator (@minecraft/creator-tools) on it. Exits 1 when the validator reports an error.
 * Warnings and recommendations print but do not fail.
 *
 * Usage: npm run check:addon
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { BlockData } from '../src/types';
import type { BedrockBlockTable } from '../src/utils/bedrockBlocks';
import { findBadManifestVersions, toAddonFiles } from '../src/utils/bedrockAddon';
import { toBedrockStructure } from '../src/utils/bedrockExport';
import { toBlockVersion, toMcstructure } from '../src/utils/mcstructure';

const CREATOR_TOOLS = '@minecraft/creator-tools@0.20.0';
const OUTPUT_DIR = path.join('.cache', 'addon-check');
const FAILING_TYPES = new Set(['error', 'testFail']);
const REPORTED_TYPES = new Set(['error', 'testFail', 'warning', 'recommendation']);

interface ValidationItem {
  type: string;
  generatorId?: string;
  message?: string;
  data?: unknown;
  path?: string;
}

const SAMPLE_BLOCKS: BlockData[] = [
  { position: { x: 0, y: 0, z: 0 }, blockType: 'minecraft:stone_bricks' },
  { position: { x: 1, y: 0, z: 0 }, blockType: 'minecraft:oak_stairs', blockState: { facing: 'y-', half: 'bottom', shape: 'straight_y-' } },
  { position: { x: 2, y: 0, z: 1 }, blockType: 'minecraft:oak_log', blockState: { axis: 'z' } },
  { position: { x: 3, y: 1, z: 0 }, blockType: 'minecraft:oak_slab', blockState: { type: 'top' } },
];

async function writeSampleAddon(): Promise<void> {
  const table = JSON.parse(fs.readFileSync(path.join('public', 'data', 'bedrock-blocks.json'), 'utf-8')) as BedrockBlockTable;
  const toJavaId = (blockId: string): string => blockId;
  const structure = toBedrockStructure(
    { width: 4, height: 4, depth: 4 },
    { position: { x: 2, y: 2, z: 0 }, direction: 'y-' },
    SAMPLE_BLOCKS,
    table,
    toJavaId,
  );
  const [major, minor, patch] = table.bedrockVersion;
  const files = await toAddonFiles({
    projectId: 'addon-check',
    projectName: 'Addon Check',
    itemName: 'Addon Check Wand',
    icon: 'blaze_rod',
    animationMode: 'Layers',
    animationSeconds: 5,
    structure: toMcstructure(structure.size, structure.cells, toBlockVersion(major, minor, patch)),
    placements: structure.placements,
    exportedAt: Date.now(),
    packIcon: new Uint8Array(fs.readFileSync(path.join('public', 'logo-256.png'))),
  });

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  for (const [file, bytes] of Object.entries(files)) {
    const target = path.join(OUTPUT_DIR, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
}

function runValidator(): ValidationItem[] {
  let output: string;
  try {
    output = execFileSync('npx', ['-y', CREATOR_TOOLS, 'validate', 'all', '-i', OUTPUT_DIR, '--json'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (error) {
    // The validator exits non-zero when it finds errors. Its report is still on stdout.
    output = (error as { stdout?: string }).stdout ?? '';
  }
  const report = JSON.parse(output.slice(output.indexOf('{'))) as { projects: Array<{ items: ValidationItem[] }> };
  const toItems = (project: { items: ValidationItem[] }): ValidationItem[] => project.items;
  return report.projects.flatMap(toItems);
}

const isReported = (item: ValidationItem): boolean => REPORTED_TYPES.has(item.type);
const isFailing = (item: ValidationItem): boolean => FAILING_TYPES.has(item.type);
const printItem = ({ type, generatorId, message, data, path: itemPath }: ValidationItem): void => {
  const detail = typeof data === 'string' && data.length < 160 ? ` (${data})` : '';
  console.log(`${type.padEnd(14)} ${generatorId ?? ''}: ${message ?? ''}${detail}${itemPath ? ` [${itemPath}]` : ''}`);
};

// Bedrock reads version parts as 16-bit numbers, which Mojang's validator does not check
function checkManifestVersions(): ValidationItem[] {
  const toManifestItems = (folder: string): ValidationItem[] => {
    const manifestPath = path.join(OUTPUT_DIR, folder, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return [];
    const toItem = (problem: string): ValidationItem => ({
      type: 'error',
      generatorId: 'VERSIONRANGE',
      message: `Version part outside 0-65535: ${problem}`,
      path: `/${folder}/manifest.json`,
    });
    return findBadManifestVersions(JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))).map(toItem);
  };
  return fs.readdirSync(OUTPUT_DIR).flatMap(toManifestItems);
}

async function main(): Promise<void> {
  await writeSampleAddon();
  const items = [...checkManifestVersions(), ...runValidator()];
  items.filter(isReported).forEach(printItem);

  const failures = items.filter(isFailing);
  if (failures.length > 0) {
    console.error(`${failures.length} validation errors in ${OUTPUT_DIR}`);
    process.exit(1);
  }
  console.log(`The sample add-on in ${OUTPUT_DIR} passes validation.`);
}

const exitWithError = (error: unknown): void => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
};

main().catch(exitWithError);
