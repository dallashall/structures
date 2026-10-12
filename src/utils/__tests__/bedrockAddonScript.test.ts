// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddonScriptOptions, BuildSequence } from '../bedrockAddonScript';
import { GLOW_PARTICLE_ID, toAddonScript, toGlowParticle } from '../bedrockAddonScript';
import { JITTER, toSequenceKey } from '../buildSequence';
import { toCameraBounds, toCameraPose, toCameraTicks } from '../cameraPath';
import type { CameraMode, CameraScene } from '../cameraPath';
import type { AnimatedSequence } from '../buildSequence';

const PLACEMENT = { rotation: 'None' as const, offset: { x: 0, y: 0, z: 0 } };
const OPTIONS: AddonScriptOptions = {
  structureId: 'structures:castle',
  componentId: 'structures:build_castle',
  sequence: 'rise',
  seconds: 4,
  uses: 5,
  metaFacing: 'x+',
  camera: 'none',
  placements: { north: PLACEMENT, east: PLACEMENT, south: PLACEMENT, west: PLACEMENT },
  build: {
    palette: [{ rotations: [['minecraft:stone', {}], ['minecraft:stone', {}], ['minecraft:stone', {}], ['minecraft:stone', {}]], color: [0.5, 0.5, 0.5] }],
    cells: [1, 0, 0, 0, 0, 1, 0, 0],
    skipped: new Map(),
  },
};

const SEQUENCES: BuildSequence[] = ['rise', 'rippleOut', 'rippleIn', 'instant'];

const checkSyntax = (script: string): void => {
  const file = join(mkdtempSync(join(tmpdir(), 'addon-script-')), 'main.mjs');
  writeFileSync(file, script);
  execFileSync(process.execPath, ['--check', file]);
};

describe('toAddonScript', () => {
  it('is valid JavaScript for every sequence', () => {
    const checkSequence = (sequence: BuildSequence): void => checkSyntax(toAddonScript({ ...OPTIONS, sequence }));
    const checkAll = (): void => SEQUENCES.forEach(checkSequence);
    expect(checkAll).not.toThrow();
  });

  it('carries the build, the meta block facing, the use limit, and the component name', () => {
    const script = toAddonScript(OPTIONS);
    expect(script).toContain('const CELLS = [1,0,0,0,0,1,0,0];');
    expect(script).toContain('const META_FACING = 1;');
    expect(script).toContain('const USES = 5;');
    expect(script).toContain('const DURATION_TICKS = 80;');
    expect(script).toContain('registerCustomComponent("structures:build_castle"');
  });
});

describe('the script copy of toSequenceKey', () => {
  it('matches the shared formula the editor preview uses', () => {
    const script = toAddonScript(OPTIONS);
    const source = /function toSequenceKey[\s\S]*?\n}\n/.exec(script)?.[0];
    expect(source).toBeDefined();
    const sequences: AnimatedSequence[] = ['rise', 'rippleOut', 'rippleIn'];
    for (const sequence of sequences) {
      const scriptKey = new Function('SEQUENCE', 'JITTER', `${source}\nreturn toSequenceKey;`)(sequence, JITTER) as
        (dx: number, dy: number, dz: number, random: number) => number;
      for (const [dx, dy, dz, random] of [[0, 0, 0, 0], [3, 1, -2, 0.5], [-4, 6, 7, 0.9]]) {
        expect(scriptKey(dx, dy, dz, random)).toBeCloseTo(toSequenceKey(sequence, dx, dy, dz, random), 10);
      }
    }
  });
});

describe('the script copy of the camera path', () => {
  it('matches the shared path the editor preview flies', () => {
    const script = toAddonScript(OPTIONS);
    const start = script.indexOf('// CAMERA PATH START');
    const end = script.indexOf('// CAMERA PATH END');
    expect(start).toBeGreaterThan(-1);
    const load = new Function(`${script.slice(start, end)}\nreturn { toCameraPose, toCameraBounds, toCameraTicks };`);
    const copy = load() as { toCameraPose: typeof toCameraPose; toCameraBounds: typeof toCameraBounds; toCameraTicks: typeof toCameraTicks };

    const cells = [{ x: 0, y: 0, z: -8 }, { x: 5, y: 6, z: -2 }];
    expect(copy.toCameraBounds(cells)).toEqual(toCameraBounds(cells));
    const modes: CameraMode[] = ['none', 'orbit', 'lookAround'];
    for (const mode of modes) {
      expect(copy.toCameraTicks(mode, 136)).toBe(toCameraTicks(mode, 136));
    }
    for (const rising of [false, true]) {
      const scene: CameraScene = { ...toCameraBounds(cells), rising, landedAt: 0.82, seconds: 9.8, eye: { x: 1.5, y: 65.6, z: 2.5 }, forward: { x: 0.6, y: 0, z: -0.8 } };
      for (const mode of modes) {
        for (const t of [0, 0.1, 0.37, 0.5, 0.8, 1]) {
          expect(copy.toCameraPose(mode, scene, t)).toEqual(toCameraPose(mode, scene, t));
        }
      }
    }
  });
});

describe('toGlowParticle', () => {
  it('tints by variable.color and uses the game particle sheet', () => {
    const particle = toGlowParticle() as { particle_effect: { description: Record<string, any>; components: Record<string, any> } };
    expect(particle.particle_effect.description.identifier).toBe(GLOW_PARTICLE_ID);
    expect(particle.particle_effect.description.basic_render_parameters.texture).toBe('textures/particle/particles');
    expect(particle.particle_effect.components['minecraft:particle_appearance_tinting'].color.slice(0, 3)).toEqual(['v.color.r', 'v.color.g', 'v.color.b']);
  });
});
