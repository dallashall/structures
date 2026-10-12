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
export const state = { intervalTicks: [],
   tick: 0, queue: [], intervals: [], timeouts: [], placed: [], component: null, cameraCalls: [], clears: 0, permissions: [] };
export const system = {
  get currentTick() { return state.tick; },
  run(callback) { state.queue.push(callback); },
  runInterval(callback, ticks) { state.intervals.push(callback); state.intervalTicks.push(ticks ?? 1); return state.intervals.length; },
  clearRun(id) { state.intervals[id - 1] = null; },
  runTimeout(callback, ticks) { state.timeouts.push({ at: state.tick + ticks, callback }); },
  beforeEvents: { startup: { subscribe(callback) { callback({ itemComponentRegistry: { registerCustomComponent(name, component) { state.component = component; } } }); } } },
};
export function advanceTick() {
  state.tick++;
  const queued = state.queue.splice(0);
  for (const callback of queued) callback();
  state.intervals.forEach((callback, index) => { if (callback && state.tick % (state.intervalTicks[index] ?? 1) === 0) callback(); });
  const due = state.timeouts.filter((timeout) => timeout.at <= state.tick);
  state.timeouts = state.timeouts.filter((timeout) => timeout.at > state.tick);
  for (const timeout of due) timeout.callback();
}
export const world = { structureManager: { place() {} } };
export class BlockPermutation { static resolve(name) { return { name }; } }
export class MolangVariableMap { setColorRGB() {} }
export const EquipmentSlot = { Mainhand: 'Mainhand' };
export const EasingType = { Linear: 'Linear' };
export const InputPermissionCategory = { Camera: 1, Movement: 2 };
export const StructureRotation = { None: 'None', Rotate90: 'Rotate90', Rotate180: 'Rotate180', Rotate270: 'Rotate270' };
export class Player {
  constructor() { this.id = 'p1'; this.isValid = true; this.location = { x: 10.5, y: 64, z: 20.5 };
    this.dimension = {
      getBlock(location) { return { setPermutation(permutation) { state.placed.push({ ...location, name: permutation.name }); } }; },
      spawnParticle() {}, playSound() {},
    };
  }
  getRotation() { return { x: 0, y: 180 }; }
  getHeadLocation() { return { x: 10.5, y: 65.62, z: 20.5 }; }
  getViewDirection() { return { x: 0, y: 0, z: -1 }; }
  get camera() { return { setCamera(preset, options) { state.cameraCalls.push({ preset, options }); }, clear() { state.clears++; } }; }
  get inputPermissions() { return { setPermissionCategory(category, isEnabled) { state.permissions.push([category, isEnabled]); } }; }
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
  camera: 'none',
  placements: { north: PLACEMENT, east: PLACEMENT, south: PLACEMENT, west: PLACEMENT },
  build: {
    palette: [{ rotations: [['minecraft:stone', {}], ['minecraft:stone', {}], ['minecraft:stone', {}], ['minecraft:stone', {}]], color: [1, 1, 1] }],
    cells: [1, 0, 0, 0, 0, 1, 0, 0],
    skipped: new Map(),
  },
};

interface CameraCall {
  preset: string;
  options: { location: { x: number; y: number; z: number }; facingLocation: { x: number; y: number; z: number }; easeOptions?: unknown };
}

interface FakeServer {
  state: {
    placed: Array<{ x: number; y: number; z: number; name: string }>;
    component: Record<string, (event: unknown) => void>;
    cameraCalls: CameraCall[];
    clears: number;
    permissions: Array<[number, boolean]>;
  };
  advanceTick: () => void;
  Player: new () => unknown;
}

async function loadScript(options: AddonScriptOptions = OPTIONS): Promise<FakeServer> {
  const root = mkdtempSync(join(tmpdir(), 'addon-runtime-'));
  const serverDir = join(root, 'node_modules', '@minecraft', 'server');
  mkdirSync(serverDir, { recursive: true });
  writeFileSync(join(serverDir, 'package.json'), JSON.stringify({ name: '@minecraft/server', type: 'module', main: 'index.js' }));
  writeFileSync(join(serverDir, 'index.js'), FAKE_SERVER);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
  writeFileSync(join(root, 'main.js'), toAddonScript(options));
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

  it('flies the orbit while the build lands, then gives the view and controls back at the player\'s eyes', async () => {
    const server = await loadScript({ ...OPTIONS, camera: 'orbit' });
    const player = new server.Player();
    server.state.component.onUse({ source: player });
    for (let tick = 0; tick < 120; tick++) server.advanceTick();

    const calls = server.state.cameraCalls;
    expect(calls.length).toBeGreaterThan(3);
    const isFree = (call: CameraCall): boolean => call.preset === 'minecraft:free';
    expect(calls.every(isFree)).toBe(true);
    const last = calls[calls.length - 1].options.location;
    expect(last.x).toBeCloseTo(10.5, 6);
    expect(last.y).toBeCloseTo(65.62, 6);
    expect(last.z).toBeCloseTo(20.5, 6);
    expect(server.state.clears).toBe(1);
    expect(server.state.permissions).toEqual([[1, false], [2, false], [1, true], [2, true]]);
  });

  it('leaves the camera alone when no camera move is chosen', async () => {
    const server = await loadScript();
    server.state.component.onUse({ source: new server.Player() });
    for (let tick = 0; tick < 60; tick++) server.advanceTick();
    expect(server.state.cameraCalls).toEqual([]);
    expect(server.state.permissions).toEqual([]);
  });
});
