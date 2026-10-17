/**
 * CampfireShape - Minecraft's campfire model: four crossed logs on an ember bed, with two crossed fire planes when lit
 *
 * The boxes copy vanilla's block/template_campfire elements, written in Minecraft's axes (y up, z south) and
 * converted to model axes. The logs and fire take their textures per face from the atlas 2D table, by block ID.
 * An unlit campfire drops the fire and shows the plain log where the lit log glows.
 */

import type { BlockShape, ClipPath, FaceUVData } from './BlockShape';
import type { BoxFace, BoxFaceTexture, ModelBox, Vec3 } from './BoxModel';
import type { Scene, Mesh } from '@babylonjs/core';
import type { BlockStateProperties, ViewType, Vector3D, HorizontalDirection } from '../../types';
import type { BlockIndexReader } from '../BlockIndex';
import { project2D, turnBoxesAboutZ } from './BoxModel';
import { createBoxModelMesh } from '../rendering/GeometryFactory';
import { textureResolver } from '../TextureResolver';

type Slot = 'log' | 'lit_log' | 'fire';
type SlotFace = { slot: Slot; uv: BoxFaceTexture['uv']; rotation?: BoxFaceTexture['rotation'] };
interface MinecraftElement {
  from: Vec3;
  to: Vec3;
  faces: Partial<Record<BoxFace, SlotFace>>;
  // Turned 45° about the vertical through the cell center
  diagonal?: boolean;
}

const END: SlotFace['uv'] = [0, 4, 4, 8];
const BARK: SlotFace['uv'] = [0, 0, 16, 4];

// Vanilla's fire planes span 0.8..15.2 and rescale by √2 when turned 45°, so they reach the cell corners
const FIRE_HALF_SPAN = 7.2 * Math.SQRT2;

const ELEMENTS: MinecraftElement[] = [
  {
    from: [1, 0, 0], to: [5, 4, 16],
    faces: {
      north: { slot: 'log', uv: END }, east: { slot: 'lit_log', uv: [0, 1, 16, 5] }, south: { slot: 'log', uv: END },
      west: { slot: 'log', uv: [16, 0, 0, 4] }, up: { slot: 'log', uv: BARK, rotation: 90 }, down: { slot: 'log', uv: BARK, rotation: 90 },
    },
  },
  {
    from: [0, 3, 11], to: [16, 7, 15],
    faces: {
      north: { slot: 'lit_log', uv: [16, 0, 0, 4] }, east: { slot: 'log', uv: END }, south: { slot: 'lit_log', uv: BARK },
      west: { slot: 'log', uv: END }, up: { slot: 'log', uv: BARK, rotation: 180 }, down: { slot: 'lit_log', uv: [0, 4, 16, 8] },
    },
  },
  {
    from: [11, 0, 0], to: [15, 4, 16],
    faces: {
      north: { slot: 'log', uv: END }, east: { slot: 'log', uv: BARK }, south: { slot: 'log', uv: END },
      west: { slot: 'lit_log', uv: [16, 1, 0, 5] }, up: { slot: 'log', uv: BARK, rotation: 90 }, down: { slot: 'log', uv: BARK, rotation: 90 },
    },
  },
  {
    from: [0, 3, 1], to: [16, 7, 5],
    faces: {
      north: { slot: 'lit_log', uv: BARK }, east: { slot: 'log', uv: END }, south: { slot: 'lit_log', uv: [16, 0, 0, 4] },
      west: { slot: 'log', uv: END }, up: { slot: 'log', uv: BARK, rotation: 180 }, down: { slot: 'lit_log', uv: [0, 4, 16, 8] },
    },
  },
  {
    from: [5, 0, 0], to: [11, 1, 16],
    faces: {
      north: { slot: 'log', uv: [0, 15, 6, 16] }, south: { slot: 'log', uv: [10, 15, 16, 16] },
      up: { slot: 'lit_log', uv: [0, 8, 16, 14], rotation: 90 }, down: { slot: 'log', uv: [0, 8, 16, 14], rotation: 90 },
    },
  },
];

const FIRE_ELEMENTS: MinecraftElement[] = [
  {
    from: [8 - FIRE_HALF_SPAN, 1, 8], to: [8 + FIRE_HALF_SPAN, 17, 8], diagonal: true,
    faces: { north: { slot: 'fire', uv: [0, 0, 16, 16] }, south: { slot: 'fire', uv: [0, 0, 16, 16] } },
  },
  {
    from: [8, 1, 8 - FIRE_HALF_SPAN], to: [8, 17, 8 + FIRE_HALF_SPAN], diagonal: true,
    faces: { west: { slot: 'fire', uv: [0, 0, 16, 16] }, east: { slot: 'fire', uv: [0, 0, 16, 16] } },
  },
];

// Minecraft (x, y up, z south) to model (x, y south, z up)
const toModel = (point: Vec3): Vec3 => [point[0], point[2], point[1]];

function toModelBox(element: MinecraftElement, textures: Record<Slot, string>): ModelBox {
  const faces: Partial<Record<BoxFace, BoxFaceTexture>> = {};
  for (const [face, slotFace] of Object.entries(element.faces) as [BoxFace, SlotFace][]) {
    faces[face] = { texture: textures[slotFace.slot], uv: slotFace.uv, rotation: slotFace.rotation };
  }
  return {
    from: toModel(element.from),
    to: toModel(element.to),
    faces,
    ...(element.diagonal ? { rotation: { axis: 'z' as const, angle: Math.PI / 4, origin: [8, 8, 8] as Vec3 } } : {}),
  };
}

// Instance rotation about Babylon's Y from the build facing. Vanilla's campfire model faces south (y+) unturned.
const ROTATIONS: Record<HorizontalDirection, number> = {
  'y+': 0,
  'x+': Math.PI / 2,
  'y-': Math.PI,
  'x-': -Math.PI / 2,
};

// The same turns as counterclockwise quarter turns seen from above, for the 2D outline
const QUARTER_TURNS: Record<HorizontalDirection, number> = { 'y+': 0, 'x-': 1, 'y-': 2, 'x+': 3 };

const COMPASS: Record<string, HorizontalDirection> = { north: 'y-', south: 'y+', east: 'x+', west: 'x-' };

const facingOf = (blockState: BlockStateProperties): HorizontalDirection => {
  const facing = String(blockState.facing ?? '');
  if (facing in ROTATIONS) return facing as HorizontalDirection;
  return COMPASS[facing] ?? 'x+';
};

export const isLit = (blockState: BlockStateProperties): boolean =>
  blockState.lit !== false && (blockState.lit as unknown) !== 'false';

const bareId = (blockId: string): string => blockId.replace('minecraft:', '');

function campfireBoxes(blockState: BlockStateProperties, textureBlockId: string): ModelBox[] {
  const base = `minecraft:${bareId(textureBlockId)}`;
  const lit = isLit(blockState);
  // Vanilla's soul campfire keeps the template's plain campfire log and swaps only the lit log and fire
  const textures: Record<Slot, string> = {
    log: 'minecraft:campfire_log',
    lit_log: lit ? `${base}_log_lit` : 'minecraft:campfire_log',
    fire: `${base}_fire`,
  };
  const convert = (element: MinecraftElement): ModelBox => toModelBox(element, textures);
  return (lit ? [...ELEMENTS, ...FIRE_ELEMENTS] : ELEMENTS).map(convert);
}

function textureRectsFor(boxes: ModelBox[]): Record<string, FaceUVData[number]> {
  const rects: Record<string, FaceUVData[number]> = {};
  for (const box of boxes) {
    for (const faceTexture of Object.values(box.faces ?? {})) {
      const rect = textureResolver.getBlockFaceUV(faceTexture.texture)?.[0];
      if (rect) rects[faceTexture.texture] = rect;
    }
  }
  return rects;
}

class CampfireShapeImpl implements BlockShape {
  readonly shapeId = 'campfire';

  getGeometryKey(blockState?: BlockStateProperties): string {
    const state = blockState ?? {};
    return `campfire_${facingOf(state)}_${isLit(state) ? 'lit' : 'unlit'}`;
  }

  createMesh(scene: Scene, blockState: BlockStateProperties, faceUVData?: FaceUVData, textureBlockId = 'campfire'): Mesh | null {
    const boxes = campfireBoxes(blockState, textureBlockId);
    return createBoxModelMesh(scene, 'campfire', boxes, faceUVData, textureRectsFor(boxes));
  }

  getRotation(blockState?: BlockStateProperties): number {
    return ROTATIONS[facingOf(blockState ?? {})];
  }

  get2DClip(
    blockState: BlockStateProperties,
    viewType: ViewType,
    px: number,
    py: number,
    cellSize: number,
  ): ClipPath | null {
    const boxes = turnBoxesAboutZ(campfireBoxes(blockState, 'campfire'), QUARTER_TURNS[facingOf(blockState)]);
    return project2D(boxes, viewType, px, py, cellSize);
  }

  deriveState(_position: Vector3D, baseState: BlockStateProperties, _blockIndex: BlockIndexReader): BlockStateProperties {
    return baseState;
  }

  getExportBlockId(blockId: string, _blockState: BlockStateProperties): string {
    return blockId;
  }

  getTextureBlockId(blockId: string, _blockState: BlockStateProperties): string {
    return blockId;
  }

  matchesBlock(blockId: string): boolean {
    const id = bareId(blockId);
    return id === 'campfire' || id === 'soul_campfire';
  }
}

export const campfireShape: BlockShape = new CampfireShapeImpl();
