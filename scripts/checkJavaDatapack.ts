#!/usr/bin/env tsx

/**
 * Builds a sample Java data pack through the same code the editor's Export uses, then loads it in a vanilla
 * server of JAVA_VERSION in Docker (itzg/minecraft-server). Exits 1 on any failure:
 * - the server's data pack format differs from DATA_PACK_FORMAT
 * - the server logs an error while loading the pack, or does not enable it
 * - an armor stand holding the wand runs start, and a block is missing after the last frame
 * - the wand's damage does not count up, or the last use does not break it
 * - a crafter given the recipe's two items does not drop the wand
 * - a marked snowball dropped on the ground, a marked arrow that sticks in it, or a marked snowball that strikes a
 *   mob does not build at the right cell
 *
 * The projectile checks summon each projectile with the item data a real throw or shot gives it. With no shooter,
 * the build faces south, so it lands turned twice. Two snowballs name an armor stand as their shooter, so their
 * builds turn to the stand's facing.
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
import type { Activator } from '../src/utils/bedrockAddon';
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
  // In the meta block's cell: a wand build leaves it out, a projectile build places it
  { position: { x: 2, y: 2, z: 0 }, blockType: 'minecraft:cobblestone' },
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

interface SamplePack {
  files: Record<string, Uint8Array>;
  namespace: string;
  build: AnimatedBuild<string>;
  fileName: string;
}

function writeSamplePack(activator: Activator): SamplePack {
  const table = JSON.parse(fs.readFileSync(path.join('public', 'data', 'bedrock-blocks.json'), 'utf-8')) as BedrockBlockTable;
  const findEntry = (blockId: string, properties: Record<string, string>): string | null => findJavaBlockState(table, blockId, properties);
  const toGray = (): [number, number, number] => [0.6, 0.6, 0.6];
  const options = {
    projectId: 'datapack-check',
    packName: activator === 'wand' ? 'Datapack Check' : `Datapack Check ${activator}`,
    itemName: 'Datapack "Check" Wand',
    icon: SAMPLE_ICON,
    activator,
    sequence: 'rise' as const,
    seconds: 2,
    uses: SAMPLE_USES,
    recipe: 'diamond' as const,
    metaFacing: META_BLOCK.direction,
    build: toAnimatedBuild(META_BLOCK, SAMPLE_BLOCKS, findEntry, toGray, activator !== 'wand'),
  };
  const files = toDatapackFiles(options);
  const fileName = activator === 'wand' ? PACK_FILE : `${activator}-${PACK_FILE}`;
  fs.writeFileSync(path.join(OUTPUT_DIR, fileName), zipSync(files));
  return { files, namespace: toAddonNames(options.packName, options.projectId).namespace, build: options.build, fileName };
}

// Clockwise seen from above, as the pack turns a build
const turnOffset = (dx: number, dz: number, turns: number): [number, number] => {
  switch (turns) {
    case 1: return [-dz, dx];
    case 2: return [-dx, -dz];
    case 3: return [dz, -dx];
    default: return [dx, dz];
  }
};

/**
 * Every block the build should have placed with its meta block at `anchor`, turned clockwise by `turns`
 */
function findMissingBlocks(build: AnimatedBuild<string>, anchor: { x: number; y: number; z: number }, turns: number): string[] {
  const missing: string[] = [];
  for (let cell = 0; cell < build.cells.length / 4; cell++) {
    const [x, dy, z, paletteIndex] = build.cells.slice(cell * 4, cell * 4 + 4);
    const [dx, dz] = turnOffset(x, z, turns);
    const state = build.palette[paletteIndex].rotations[turns];
    const result = rcon(`execute if block ${anchor.x + dx} ${anchor.y + dy} ${anchor.z + dz} ${state}`);
    if (!result.includes('passed')) missing.push(`No ${state} at ${anchor.x + dx} ${anchor.y + dy} ${anchor.z + dz}: ${result}`);
  }
  return missing;
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

const toMountedPath = (packFile: string): string => `/packs/${packFile}`;
const toProblem = (label: string) => (missing: string): string => `${label}: ${missing}`;

function isVersionFile(file: { name: string }): boolean {
  return file.name === 'version.json';
}

async function main(): Promise<void> {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const { files, namespace, build } = writeSamplePack('wand');
  const bowPack = writeSamplePack('bow');
  const snowballPack = writeSamplePack('snowball');
  const packFiles = [PACK_FILE, bowPack.fileName, snowballPack.fileName];

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
    '-e', `DATAPACKS=${packFiles.map(toMountedPath).join(',')}`,
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
      /\/(ERROR|WARN)\]/.test(line) && (line.includes('datapack_check') || /data ?pack|function|advancement|pack\.mcmeta/i.test(line));
    lines.forEach(function addPackError(line: string, index: number): void {
      if (!isPackError(line)) return;
      const isTimestamped = (next: string): boolean => /^\[\d\d:\d\d:\d\d\]/.test(next);
      const rest = lines.slice(index + 1);
      const end = rest.findIndex(isTimestamped);
      problems.push([line, ...rest.slice(0, end < 0 ? 5 : Math.min(end, 5))].join('\n    '));
    });

    const enabled = rcon('datapack list enabled');
    for (const packFile of packFiles) {
      if (!enabled.includes(packFile)) problems.push(`The pack ${packFile} is not enabled: ${enabled}`);
    }

    const { x, y, z } = FEET;
    // Covers the wand build and the projectile spots east of it
    rcon(`forceload add ${x - 16} ${z - 16} ${x + 120} ${z + 16}`);

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

    // Each projectile flies at its own spot along x, clear of the wand build
    const marked = (pack: SamplePack): string => `components:{"minecraft:custom_data":{wand:"${pack.namespace}"}}`;
    const ground = { x: x + 20, y, z };
    rcon(`summon minecraft:snowball ${ground.x + 0.5} ${y + 4} ${z + 0.5} {Item:{id:"minecraft:snowball",count:1,${marked(snowballPack)}},Motion:[0.0,-0.5,0.0]}`);
    const stuck = { x: x + 40, y, z };
    rcon(`summon minecraft:arrow ${stuck.x + 0.5} ${y + 4} ${z + 0.5} {weapon:{id:"minecraft:bow",count:1,${marked(bowPack)}},Motion:[0.0,-1.0,0.0]}`);
    // The snowball flies east at a mob that hangs in the air, so a missed mob would build beyond it, higher up
    const mob = { x: x + 66, y, z };
    rcon(`summon minecraft:zombie ${mob.x + 0.5} ${y} ${z + 0.5} {NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b}`);
    rcon(`summon minecraft:snowball ${x + 60.5} ${y + 1.5} ${z + 0.5} {Item:{id:"minecraft:snowball",count:1,${marked(snowballPack)}},Motion:[1.5,0.0,0.0]}`);
    // Owned snowballs: an armor stand stands in for the thrower, so the build turns to the stand's facing
    const owned = [{ yaw: -90, at: { x: x + 80, y, z }, turns: 1, uuid: '[I;1,2,3,4]' }, { yaw: 90, at: { x: x + 100, y, z }, turns: 3, uuid: '[I;5,6,7,8]' }];
    for (const thrown of owned) {
      rcon(`summon minecraft:armor_stand ${thrown.at.x + 0.5} ${y} ${z + 3.5} {UUID:${thrown.uuid},Rotation:[${thrown.yaw}f,0f],NoGravity:1b}`);
      rcon(`summon minecraft:snowball ${thrown.at.x + 0.5} ${y + 4} ${z + 0.5} {Owner:${thrown.uuid},Item:{id:"minecraft:snowball",count:1,${marked(snowballPack)}},Motion:[0.0,-0.5,0.0]}`);
    }
    // A creative shooter's bow wears through the pack. A headless server has no player, so a stand runs the wear.
    const bowGive = strFromU8(bowPack.files[`data/${bowPack.namespace}/function/give.mcfunction`]).replace(/^give @s /, '');
    rcon(`summon minecraft:armor_stand ${x + 0.5} ${y} ${z + 6.5} {Tags:["bow"],NoGravity:1b}`);
    rcon(`item replace entity @e[tag=bow,limit=1] weapon.offhand with ${bowGive}`);
    const bowStand = '@e[tag=bow,limit=1]';
    rcon(`execute as ${bowStand} run function ${bowPack.namespace}:wear`);
    if (!rcon(`execute if items entity ${bowStand} weapon.offhand *[minecraft:damage=1]`).includes('passed')) {
      problems.push('The bow wear did not add one damage to a bow in the off hand.');
    }
    rcon(`execute as ${bowStand} run function ${bowPack.namespace}:wear`);
    if (!rcon(`execute unless items entity ${bowStand} weapon.offhand *`).includes('passed')) {
      problems.push('The last bow wear did not break the bow.');
    }
    await sleep(6000);
    for (const thrown of owned) {
      problems.push(...findMissingBlocks(snowballPack.build, thrown.at, thrown.turns).map(toProblem(`A snowball thrown by a stand at yaw ${thrown.yaw}`)));
    }
    problems.push(...findMissingBlocks(snowballPack.build, ground, 2).map(toProblem('A snowball on the ground')));
    problems.push(...findMissingBlocks(bowPack.build, stuck, 2).map(toProblem('An arrow stuck in the ground')));
    problems.push(...findMissingBlocks(snowballPack.build, mob, 2).map(toProblem('A snowball that struck a mob')));
    const followers = rcon(`execute if entity @e[type=minecraft:marker,tag=${snowballPack.namespace}.follow]`);
    if (followers.includes('passed')) problems.push('A snowball follower outlived its snowball.');
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
