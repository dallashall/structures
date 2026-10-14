#!/usr/bin/env tsx

/**
 * Builds a sample Java data pack through the same code the editor's Export uses, then loads it in a vanilla
 * server of JAVA_VERSION in Docker (itzg/minecraft-server). Exits 1 on any failure:
 * - the server's data pack format differs from DATA_PACK_FORMAT
 * - the server logs an error while loading the pack, or does not enable it
 * - an armor stand holding the wand runs start, and a block is missing after the last frame
 * - the wand's damage does not count up, or the last use does not break it
 * - a crafter given the recipe's two items does not drop the wand
 *
 * A headless server has no player to right-click, so the check calls start directly. The armor stand faces
 * north, the same way as the sample's meta block, so the build lands unturned.
 *
 * The container accepts the Minecraft EULA (https://aka.ms/MinecraftEULA) through EULA=TRUE.
 *
 * Usage: npm run check:datapack
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { strFromU8, unzipSync, zipSync } from 'fflate';

import type { BlockData } from '../src/types';
import type { AnimatedBuild } from '../src/utils/animatedBuild';
import type { BedrockBlockTable } from '../src/utils/bedrockBlocks';
import { toAnimatedBuild } from '../src/utils/animatedBuild';
import { toAddonNames } from '../src/utils/bedrockAddon';
import { DATA_PACK_FORMAT, JAVA_VERSION, findJavaBlockState, toDatapackFiles } from '../src/utils/javaDatapack';

const IMAGE = 'itzg/minecraft-server:java25';
const CONTAINER = 'structures-datapack-check';
const OUTPUT_DIR = path.resolve('.cache', 'datapack-check');
const PACK_FILE = 'datapack-check.zip';
const STARTUP_TIMEOUT_MS = 300_000;
// The superflat surface: the top grass block sits at y -61, so a standing entity's feet are at y -60
const FEET = { x: 0, y: -60, z: 0 };

const SAMPLE_BLOCKS: BlockData[] = [
  { position: { x: 0, y: 0, z: 0 }, blockType: 'minecraft:stone_bricks' },
  { position: { x: 1, y: 0, z: 0 }, blockType: 'minecraft:oak_stairs', blockState: { facing: 'y-', half: 'bottom', shape: 'straight_y-' } },
  { position: { x: 2, y: 0, z: 1 }, blockType: 'minecraft:oak_log', blockState: { axis: 'z' } },
  { position: { x: 3, y: 1, z: 0 }, blockType: 'minecraft:oak_slab', blockState: { type: 'top' } },
];
const META_BLOCK = { position: { x: 2, y: 2, z: 0 }, direction: 'y-' as const };
const SAMPLE_USES = 2;
const SAMPLE_ICON = 'blaze_rod' as const;

const sleep = (ms: number): Promise<void> => {
  const wait = (resolve: () => void): void => {
    setTimeout(resolve, ms);
  };
  return new Promise(wait);
};

const docker = (...args: string[]): string => execFileSync('docker', args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
// The server writes some of its log to stderr, so both streams are read
const readLogs = (): string => execFileSync('sh', ['-c', `docker logs ${CONTAINER} 2>&1`], { encoding: 'utf-8' });
const rcon = (command: string): string => docker('exec', CONTAINER, 'rcon-cli', command).trim();
const fail = (message: string): never => {
  throw new Error(message);
};

function writeSamplePack(): { files: Record<string, Uint8Array>; namespace: string; build: AnimatedBuild<string> } {
  const table = JSON.parse(fs.readFileSync(path.join('public', 'data', 'bedrock-blocks.json'), 'utf-8')) as BedrockBlockTable;
  const findEntry = (blockId: string, properties: Record<string, string>): string | null => findJavaBlockState(table, blockId, properties);
  const toGray = (): [number, number, number] => [0.6, 0.6, 0.6];
  const options = {
    projectId: 'datapack-check',
    packName: 'Datapack Check',
    itemName: 'Datapack "Check" Wand',
    icon: SAMPLE_ICON,
    sequence: 'rise' as const,
    seconds: 2,
    uses: SAMPLE_USES,
    recipe: 'diamond' as const,
    metaFacing: META_BLOCK.direction,
    build: toAnimatedBuild(META_BLOCK, SAMPLE_BLOCKS, findEntry, toGray),
  };
  const files = toDatapackFiles(options);
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, PACK_FILE), zipSync(files));
  return { files, namespace: toAddonNames(options.packName, options.projectId).namespace, build: options.build };
}

async function waitForStart(): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const logs = readLogs();
    if (/Done \([\d.]+s\)!/.test(logs)) return;
    const state = docker('inspect', '-f', '{{.State.Running}}', CONTAINER).trim();
    if (state !== 'true') fail(`The server stopped while starting:\n${logs.slice(-3000)}`);
    await sleep(2000);
  }
  fail('The server did not finish starting in time.');
}

function readServerPackFormat(): [number, number] {
  const jarPath = docker('exec', CONTAINER, 'sh', '-c', 'ls /data/minecraft_server*.jar | head -n 1').trim();
  const local = path.join(OUTPUT_DIR, 'server.jar');
  docker('cp', `${CONTAINER}:${jarPath}`, local);
  const version = JSON.parse(strFromU8(unzipSync(fs.readFileSync(local), { filter: isVersionFile })['version.json'])) as {
    pack_version: { data_major?: number; data_minor?: number; data?: number };
  };
  const { data_major: major, data_minor: minor, data } = version.pack_version;
  return [major ?? data ?? -1, minor ?? 0];
}

function isVersionFile(file: { name: string }): boolean {
  return file.name === 'version.json';
}

async function main(): Promise<void> {
  const { files, namespace, build } = writeSamplePack();

  const giveLine = strFromU8(files[`data/${namespace}/function/give.mcfunction`]);
  const wandItem = giveLine.replace(/^give @s /, '');

  try {
    docker('rm', '-f', CONTAINER);
  } catch {
    // No container left from an earlier run
  }

  console.log(`Starting a vanilla ${JAVA_VERSION} server in Docker...`);
  docker(
    'run', '-d', '--name', CONTAINER,
    '-e', 'EULA=TRUE',
    '-e', `VERSION=${JAVA_VERSION}`,
    '-e', 'TYPE=VANILLA',
    '-e', 'LEVEL_TYPE=minecraft:flat',
    '-e', 'MODE=creative',
    '-e', 'MEMORY=2G',
    '-e', 'ENABLE_RCON=true',
    '-e', 'RCON_PASSWORD=datapack-check',
    '-e', 'PAUSE_WHEN_EMPTY_SECONDS=0',
    '-e', `DATAPACKS=/packs/${PACK_FILE}`,
    '-v', `${OUTPUT_DIR}:/packs:ro`,
    IMAGE,
  );

  const problems: string[] = [];
  try {
    await waitForStart();

    const serverFormat = readServerPackFormat();
    if (serverFormat[0] !== DATA_PACK_FORMAT[0] || serverFormat[1] !== DATA_PACK_FORMAT[1]) {
      problems.push(`The server's data pack format is ${serverFormat.join('.')}, but DATA_PACK_FORMAT is ${DATA_PACK_FORMAT.join('.')}.`);
    }

    // An error line and the cause lines under it, up to the next timestamped line
    const lines = readLogs().split('\n');
    const isPackError = (line: string): boolean =>
      /\/(ERROR|WARN)\]/.test(line) && (line.includes(namespace) || /data ?pack|function|advancement|pack\.mcmeta/i.test(line));
    lines.forEach(function addPackError(line: string, index: number): void {
      if (!isPackError(line)) return;
      const isTimestamped = (next: string): boolean => /^\[\d\d:\d\d:\d\d\]/.test(next);
      const rest = lines.slice(index + 1);
      const end = rest.findIndex(isTimestamped);
      problems.push([line, ...rest.slice(0, end < 0 ? 5 : Math.min(end, 5))].join('\n    '));
    });

    const enabled = rcon('datapack list enabled');
    if (!enabled.includes(PACK_FILE)) problems.push(`The pack is not enabled: ${enabled}`);

    const { x, y, z } = FEET;
    rcon(`forceload add ${x - 16} ${z - 16} ${x + 16} ${z + 16}`);

    // A crafter crafts on a redstone pulse and drops the result in front of it, which faces north here
    const crafter = { x: x + 8, y, z: z + 8 };
    rcon(`setblock ${crafter.x} ${crafter.y} ${crafter.z} minecraft:crafter[orientation=north_up]`);
    rcon(`item replace block ${crafter.x} ${crafter.y} ${crafter.z} container.0 with minecraft:${SAMPLE_ICON}`);
    rcon(`item replace block ${crafter.x} ${crafter.y} ${crafter.z} container.1 with minecraft:diamond`);
    rcon(`setblock ${crafter.x} ${crafter.y - 1} ${crafter.z} minecraft:redstone_block`);
    await sleep(1500);
    const crafted = rcon(
      `execute if items entity @e[type=minecraft:item,x=${crafter.x},y=${crafter.y},z=${crafter.z},distance=..8] contents *[minecraft:custom_data~{wand:"${namespace}"}]`,
    );
    if (!crafted.includes('passed')) problems.push(`The wand recipe did not craft a wand: ${crafted}`);

    rcon(`summon minecraft:armor_stand ${x + 0.5} ${y} ${z + 0.5} {Tags:["check"],Rotation:[180f,0f],NoGravity:1b}`);
    rcon(`item replace entity @e[tag=check,limit=1] weapon.mainhand with ${wandItem}`);
    const stand = '@e[tag=check,limit=1]';
    const hasDamage = (damage: number): boolean =>
      rcon(`execute if items entity ${stand} weapon.mainhand *[minecraft:damage=${damage}]`).includes('passed');

    rcon(`execute as ${stand} at @s run function ${namespace}:start`);
    await sleep(5000);

    const toCellCheck = (cell: number): void => {
      const [dx, dy, dz, paletteIndex] = build.cells.slice(cell * 4, cell * 4 + 4);
      const state = build.palette[paletteIndex].rotations[0];
      const result = rcon(`execute if block ${x + dx} ${y + dy} ${z + dz} ${state}`);
      if (!result.includes('passed')) problems.push(`No ${state} at offset ${dx} ${dy} ${dz}: ${result}`);
    };
    for (let cell = 0; cell < build.cells.length / 4; cell++) toCellCheck(cell);

    if (!hasDamage(1)) problems.push('The first use did not add one damage to the wand.');
    rcon(`execute as ${stand} at @s run function ${namespace}:start`);
    const emptied = rcon(`execute unless items entity ${stand} weapon.mainhand *`);
    if (!emptied.includes('passed')) problems.push(`The last use did not break the wand: ${emptied}`);
    const markers = rcon(`execute if entity @e[type=minecraft:marker,tag=${namespace}.build]`);
    if (!markers.includes('passed')) problems.push('The last use did not start a build.');
  } finally {
    try {
      docker('rm', '-f', CONTAINER);
    } catch {
      // The container is already gone
    }
  }

  if (problems.length > 0) {
    console.error(`The sample data pack failed ${problems.length} check(s):`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`The sample data pack loads and builds in Java ${JAVA_VERSION}.`);
}

main().catch(function reportFailure(error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
