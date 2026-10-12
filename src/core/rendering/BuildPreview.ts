/**
 * BuildPreview - Plays the add-on's build animation in the 3D view
 *
 * It uses the order and timing of src/utils/buildSequence.ts, the same source the add-on script embeds:
 * each cell glows in its block's color, and its block appears LEAD_TICKS later. Blocks pop in, as they do
 * in game. The meta block's cell stays empty, since the add-on clears it to air.
 *
 * The build plays as the designer sees it, which is how a player facing the meta block's arrow sees it.
 *
 * Glows are thin instances of one small cube, so a few thousand of them cost one draw call.
 * Babylon's particles would not match Bedrock's anyway, so the glow is an approximation of the look.
 */

import { Color3, Material, Matrix, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { InstancedMesh, Mesh, Observer, Scene } from '@babylonjs/core';

import type { MetaBlock } from '../../types';
import type { AnimatedSequence } from '../../utils/buildSequence';
import type { CameraMode, CameraScene } from '../../utils/cameraPath';
import { toCameraBounds, toCameraPose } from '../../utils/cameraPath';
import { directionToOffset } from '../DirectionMath';
import {
  LEAD_TICKS,
  TICKS_PER_SECOND,
  toDurationTicks,
  toGlowEvery,
  toMarkTick,
  toSequenceKey,
} from '../../utils/buildSequence';

export type GlowColor = [number, number, number];

// The parts of CameraRig the preview flies the camera with
export interface CameraDriver {
  beginDrive(): void;
  drive(location: Vector3, facing: Vector3): void;
  endDrive(): void;
}

export interface PreviewCamera {
  mode: CameraMode;
  driver: CameraDriver;
}

interface PreviewCell {
  mesh: InstancedMesh;
  color: GlowColor;
  key: number;
}

interface Glow {
  x: number;
  y: number;
  z: number;
  color: GlowColor;
  bornMs: number;
}

const MS_PER_TICK = 1000 / TICKS_PER_SECOND;
const GLOW_LIFE_MS = 1200;
const GLOW_PUFFS = 3;
const GLOW_SIZE = 0.3;
// Puffs drift up by this many blocks over their life
const GLOW_RISE = 0.6;
// Spread of puffs around the cell center, in blocks
const GLOW_SPREAD = 0.35;

// Bedrock's eye height above the feet, so the preview's first-person view matches the game's
const EYE_HEIGHT = 1.62;

const parseKey = (key: string): [number, number, number] => key.split(',').map(Number) as [number, number, number];

export class BuildPreview {
  private readonly scene: Scene;
  private readonly glowMesh: Mesh;
  private observer: Observer<Scene> | null = null;
  private cells: PreviewCell[] = [];
  private hidden: InstancedMesh[] = [];
  private glows: Glow[] = [];
  private startMs = 0;
  private durationTicks = 1;
  private glowEvery = 1;
  private glowCursor = 0;
  private landCursor = 0;
  private onDone: (() => void) | null = null;
  private camera: PreviewCamera | null = null;
  private cameraScene: CameraScene | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.glowMesh = MeshBuilder.CreateBox('buildPreviewGlow', { size: GLOW_SIZE }, scene);
    const material = new StandardMaterial('buildPreviewGlowMaterial', scene);
    material.disableLighting = true;
    // The standard shader multiplies the instance color into diffuse + emissive. With lighting off, only a
    // white emissive leaves the instance color as the output. A black emissive renders every glow black.
    material.diffuseColor = Color3.Black();
    material.emissiveColor = Color3.White();
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    material.backFaceCulling = false;
    this.glowMesh.material = material;
    this.glowMesh.hasVertexAlpha = true;
    this.glowMesh.isPickable = false;
    this.glowMesh.thinInstanceRegisterAttribute('color', 4);
    this.glowMesh.thinInstanceCount = 0;
  }

  isPlaying(): boolean {
    return this.observer !== null;
  }

  /**
   * Hides the build, then plays it in. `blocks` maps "x,y,z" model keys to the block meshes on screen.
   * Resolves when the last block lands, or right away when play is stopped.
   */
  play(
    sequence: AnimatedSequence,
    seconds: number,
    metaBlock: MetaBlock,
    blocks: Map<string, InstancedMesh>,
    toColor: (mesh: InstancedMesh) => GlowColor,
    camera: PreviewCamera | null = null,
  ): Promise<void> {
    this.stop();
    const anchor = metaBlock.position;

    const cells: PreviewCell[] = [];
    for (const [modelKey, mesh] of blocks) {
      const [x, y, z] = parseKey(modelKey);
      mesh.setEnabled(false);
      this.hidden.push(mesh);
      if (x === anchor.x && y === anchor.y && z === anchor.z) continue;
      // Model (x, y, z) with z up is Bedrock (x, z, y), so the add-on's dy is model z
      const key = toSequenceKey(sequence, x - anchor.x, z - anchor.z, y - anchor.y, Math.random());
      cells.push({ mesh, color: toColor(mesh), key });
    }
    const byKey = (a: PreviewCell, b: PreviewCell): number => a.key - b.key;
    this.cells = cells.sort(byKey);

    this.durationTicks = toDurationTicks(seconds);
    this.glowEvery = toGlowEvery(this.cells.length);
    this.glowCursor = 0;
    this.landCursor = 0;
    this.glows = [];
    this.startMs = performance.now();
    this.startCamera(camera, metaBlock);
    this.observer = this.scene.onBeforeRenderObservable.add(this.step);

    const waitForEnd = (resolve: () => void): void => {
      this.onDone = resolve;
    };
    return new Promise(waitForEnd);
  }

  /**
   * Shows every hidden block again and ends the preview
   */
  stop(): void {
    if (this.observer) {
      this.scene.onBeforeRenderObservable.remove(this.observer);
      this.observer = null;
    }
    const show = (mesh: InstancedMesh): void => {
      if (!mesh.isDisposed()) mesh.setEnabled(true);
    };
    this.hidden.forEach(show);
    this.hidden = [];
    this.cells = [];
    this.glows = [];
    this.glowMesh.thinInstanceCount = 0;
    this.camera?.driver.endDrive();
    this.camera = null;
    this.cameraScene = null;

    const onDone = this.onDone;
    this.onDone = null;
    onDone?.();
  }

  dispose(): void {
    this.stop();
    this.glowMesh.material?.dispose();
    this.glowMesh.dispose();
  }

  private step = (): void => {
    const now = performance.now();
    const tick = (now - this.startMs) / MS_PER_TICK;
    const count = this.cells.length;

    while (this.glowCursor < count && toMarkTick(this.glowCursor, count, this.durationTicks) <= tick) {
      if (this.glowCursor % this.glowEvery === 0) this.addGlow(this.cells[this.glowCursor], now);
      this.glowCursor++;
    }
    while (this.landCursor < count && toMarkTick(this.landCursor, count, this.durationTicks) + LEAD_TICKS <= tick) {
      this.cells[this.landCursor].mesh.setEnabled(true);
      this.landCursor++;
    }

    this.drawGlows(now);
    this.flyCamera(tick);

    if (this.landCursor >= count && this.glows.length === 0) this.stop();
  };

  /**
   * The player stands in the meta block's cell facing its arrow, which is what the game's camera starts from
   */
  private startCamera(camera: PreviewCamera | null, metaBlock: MetaBlock): void {
    if (!camera || camera.mode === 'none') return;
    // Model (x, y, z) with z up is Babylon (x, z, y), the same Y-up axes the camera path uses
    const toCorner = (cell: PreviewCell): { x: number; y: number; z: number } => ({
      x: cell.mesh.position.x - 0.5,
      y: cell.mesh.position.y - 0.5,
      z: cell.mesh.position.z - 0.5,
    });
    const { x, y, z } = metaBlock.position;
    const forward = directionToOffset(metaBlock.direction);
    this.cameraScene = {
      ...toCameraBounds(this.cells.map(toCorner)),
      eye: { x: x + 0.5, y: z + EYE_HEIGHT, z: y + 0.5 },
      forward: { x: forward.x, y: 0, z: forward.y },
    };
    this.camera = camera;
    camera.driver.beginDrive();
  }

  private flyCamera(tick: number): void {
    if (!this.camera || !this.cameraScene) return;
    const t = Math.min(1, tick / (this.durationTicks + LEAD_TICKS));
    const { location, facing } = toCameraPose(this.camera.mode, this.cameraScene, t);
    this.camera.driver.drive(new Vector3(location.x, location.y, location.z), new Vector3(facing.x, facing.y, facing.z));
  }

  private addGlow(cell: PreviewCell, now: number): void {
    const { x, y, z } = cell.mesh.position;
    for (let i = 0; i < GLOW_PUFFS; i++) {
      this.glows.push({
        x: x + (Math.random() - 0.5) * 2 * GLOW_SPREAD,
        y: y + (Math.random() - 0.5) * 2 * GLOW_SPREAD,
        z: z + (Math.random() - 0.5) * 2 * GLOW_SPREAD,
        color: cell.color,
        bornMs: now + Math.random() * 120,
      });
    }
  }

  private drawGlows(now: number): void {
    const isAlive = (glow: Glow): boolean => now - glow.bornMs < GLOW_LIFE_MS;
    this.glows = this.glows.filter(isAlive);

    const matrices = new Float32Array(this.glows.length * 16);
    const colors = new Float32Array(this.glows.length * 4);
    const matrix = new Matrix();
    const writeGlow = (glow: Glow, index: number): void => {
      const age = Math.max(0, now - glow.bornMs) / GLOW_LIFE_MS;
      const fade = 1 - age;
      const scale = now < glow.bornMs ? 0 : fade;
      Matrix.ScalingToRef(scale, scale, scale, matrix);
      matrix.setTranslationFromFloats(glow.x, glow.y + age * GLOW_RISE, glow.z);
      matrix.copyToArray(matrices, index * 16);
      colors.set([glow.color[0], glow.color[1], glow.color[2], fade], index * 4);
    };
    this.glows.forEach(writeGlow);

    this.glowMesh.thinInstanceSetBuffer('matrix', matrices, 16, false);
    this.glowMesh.thinInstanceSetBuffer('color', colors, 4, false);
  }
}
