// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AddonScriptOptions } from '../bedrockAddonScript';
import { toAddonScript } from '../bedrockAddonScript';

/**
 * Runs the generated script against a stand-in for @minecraft/server. The stand-in records placed blocks
 * and runs scheduled callbacks when the test advances a tick.
 */
const FAKE_SERVER = `
export const state = { tick: 0, queue: [], intervals: [], placed: [], component: null };
export const system = {
  get currentTick() { return state.tick; },
  run(callback) { state.queue.push(callback); },
  runInterval(callback) { state.intervals.push(callback); return state.intervals.length; },
  clearRun(id) { state.intervals[id - 1] = null; },
  beforeEvents: { startup: { subscribe(callback) { callback({ itemComponentRegistry: { registerCustomComponent(name, component) { state.component = component; } } }); } } },
};
export function advanceTick() {
  state.tick++;
  const queued = state.queue.splice(0);
  for (const callback of queued) callback();
  for (const callback of state.intervals) if (callback) callback();
}
export const world = { structureManager: { place() {} } };
export class BlockPermutation { static resolve(name) { return { name }; } }
export class MolangVariableMap { setColorRGB() {} }
export const EquipmentSlot = { Mainhand: 'Mainhand' };
export const StructureRotation = { None: 'None', Rotate90: 'Rotate90', Rotate180: 'Rotate180', Rotate270: 'Rotate270' };
export class Player {
  constructor() { this.id = 'p1'; this.isValid = true; this.location = { x: 10.5, y: 64, z: 20.5 };
    this.dimension = {
      getBlock(location) { return { setPermutation(permutation) { state.placed.push({ ...location, name: permutation.name }); } }; },
      spawnParticle() {}, playSound() {},
    };
  }
  getRotation() { return { x: 0, y: 180 }; }
  getComponent() { return undefined; }
  sendMessage() {}
}
`;

const PLACEMENT = { rotation: 'None' as const, offset: { x: 0, y: 0, z: 0 } };
const OPTIONS: AddonScriptOptions = {
  structureId: 'structures:test',
  componentId: 'structures:build_test',
  sequence: 'rise',
  seconds: 1,
  uses: 0,
  metaFacing: 'y-',
  placements: { north: PLACEMENT, east: PLACEMENT, south: PLACEMENT, west: PLACEMENT },
  build: {
    palette: [{ rotations: [['minecraft:stone', {}], ['minecraft:stone', {}], ['minecraft:stone', {}], ['minecraft:stone', {}]], color: [1, 1, 1] }],
    cells: [1, 0, 0, 0, 0, 1, 0, 0],
    skipped: new Map(),
  },
};

interface FakeServer {
  state: { placed: Array<{ x: number; y: number; z: number; name: string }>; component: Record<string, (event: unknown) => void> };
  advanceTick: () => void;
  Player: new () => unknown;
}

async function loadScript(): Promise<FakeServer> {
  const root = mkdtempSync(join(tmpdir(), 'addon-runtime-'));
  const serverDir = join(root, 'node_modules', '@minecraft', 'server');
  mkdirSync(serverDir, { recursive: true });
  writeFileSync(join(serverDir, 'package.json'), JSON.stringify({ name: '@minecraft/server', type: 'module', main: 'index.js' }));
  writeFileSync(join(serverDir, 'index.js'), FAKE_SERVER);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
  writeFileSync(join(root, 'main.js'), toAddonScript(OPTIONS));
  await import(/* @vite-ignore */ pathToFileURL(join(root, 'main.js')).href);
  return (await import(/* @vite-ignore */ pathToFileURL(join(serverDir, 'index.js')).href)) as FakeServer;
}

const isStone = (cell: { name: string }): boolean => cell.name === 'minecraft:stone';
const toPosition = ({ x, y, z }: { x: number; y: number; z: number }): { x: number; y: number; z: number } => ({ x, y, z });

describe('the add-on script at runtime', () => {
  it.each(['use first', 'use on block first'])('builds once at the block anchor when both use events fire (%s)', async (order) => {
    const server = await loadScript();
    const player = new server.Player();
    const useOn = { source: player, block: { location: { x: 3, y: 63, z: 7 } }, blockFace: 'Up' };
    const use = { source: player };

    if (order === 'use first') {
      server.state.component.onUse(use);
      server.state.component.onUseOn(useOn);
    } else {
      server.state.component.onUseOn(useOn);
      server.state.component.onUse(use);
    }
    for (let tick = 0; tick < 60; tick++) server.advanceTick();

    const stone = server.state.placed.filter(isStone).map(toPosition);
    expect(stone).toHaveLength(2);
    expect(stone).toContainEqual({ x: 4, y: 64, z: 7 });
    expect(stone).toContainEqual({ x: 3, y: 65, z: 7 });
  });

  it('ignores a repeat use while the button stays held', async () => {
    const server = await loadScript();
    const player = new server.Player();
    server.state.component.onUse({ source: player });
    server.advanceTick();
    server.advanceTick();
    server.state.component.onUse({ source: player });
    for (let tick = 0; tick < 60; tick++) server.advanceTick();

    expect(server.state.placed.filter(isStone)).toHaveLength(2);
  });
});
