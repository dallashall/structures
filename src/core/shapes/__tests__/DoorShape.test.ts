import { describe, it, expect } from 'vitest';
import { shapeCatalog } from '../ShapeCatalog';
import { PaintPipeline } from '../../tools/PaintPipeline';
import { toJavaProperties } from '../../../utils/bedrockExport';
import type { Vector3D, BlockStateProperties, BlockData } from '../../../types';
import type { BlockIndexReader } from '../../BlockIndex';
import type { PaintOperation } from '../../painting/strategies/PaintStrategy';

class MockBlockIndex implements BlockIndexReader {
  private blocks = new Map<string, BlockData>();

  set(pos: Vector3D, blockType: string, blockState: BlockStateProperties = {}): this {
    this.blocks.set(`${pos.x},${pos.y},${pos.z}`, { position: pos, blockType, blockState });
    return this;
  }

  get(pos: Vector3D): BlockData | null {
    return this.blocks.get(`${pos.x},${pos.y},${pos.z}`) ?? null;
  }
}

const DOOR = 'minecraft:oak_door';
const LOWER: Vector3D = { x: 5, y: 5, z: 0 };
const UPPER: Vector3D = { x: 5, y: 5, z: 1 };
const DIMENSIONS = { width: 10, height: 10, depth: 4 };
const door = shapeCatalog.resolve(DOOR);

// Facing y+, left is x+ and right is x-
const withDoor = (state: BlockStateProperties = {}): MockBlockIndex =>
  new MockBlockIndex()
    .set(LOWER, DOOR, { facing: 'y+', ...state, half: 'lower' })
    .set(UPPER, DOOR, { facing: 'y+', ...state, half: 'upper' });

const derivedAt = (index: MockBlockIndex, position: Vector3D): BlockStateProperties =>
  shapeCatalog.resolveBlockState(position, index)?.blockState ?? {};

describe('DoorShape hinge', () => {
  it('puts the hinge left with no neighbors', () => {
    expect(derivedAt(withDoor(), LOWER).hinge).toBe('left');
  });

  it('puts the hinge on the side with more full blocks', () => {
    const index = withDoor().set({ x: 4, y: 5, z: 0 }, 'minecraft:stone').set({ x: 4, y: 5, z: 1 }, 'minecraft:stone');
    expect(derivedAt(index, LOWER).hinge).toBe('right');
  });

  it('makes a double door with a door of the same type beside it', () => {
    const index = withDoor().set({ x: 6, y: 5, z: 0 }, DOOR, { facing: 'y+', half: 'lower' });
    expect(derivedAt(index, LOWER).hinge).toBe('right');
    expect(derivedAt(index, { x: 6, y: 5, z: 0 }).hinge).toBe('left');
  });

  it('swaps the hinge when hingeFlipped is stored, and drops the flag', () => {
    const derived = derivedAt(withDoor({ hingeFlipped: true }), LOWER);
    expect(derived.hinge).toBe('right');
    expect(derived).not.toHaveProperty('hingeFlipped');
  });

  it('copies the lower half onto the upper half', () => {
    const index = withDoor({ hingeFlipped: true });
    expect(derivedAt(index, UPPER)).toMatchObject({ facing: 'y+', hinge: 'right', half: 'upper' });
  });
});

describe('DoorShape geometry', () => {
  it('shows each half with its own textures', () => {
    expect(door.getTextureBlockId(DOOR, { half: 'upper' })).toBe('minecraft:oak_door_upper');
    expect(door.getTextureBlockId(DOOR, { half: 'lower' })).toBe(DOOR);
  });

  it('puts a closed door facing x+ on the x- edge', () => {
    const [polygon] = door.get2DClip({ facing: 'x+' }, 'top', 0, 0, 16)!;
    const toX = (point: { x: number; y: number }): number => point.x;
    expect(Math.min(...polygon.map(toX))).toBeCloseTo(0);
    expect(Math.max(...polygon.map(toX))).toBeCloseTo(3);
  });

  it('swings an open door to the hinge-side edge', () => {
    // Facing y+ with a left hinge, the hinge side is x+
    const [polygon] = door.get2DClip({ facing: 'y+', hinge: 'left', open: true }, 'top', 0, 0, 16)!;
    const toX = (point: { x: number; y: number }): number => point.x;
    expect(Math.min(...polygon.map(toX))).toBeCloseTo(13);
    expect(Math.max(...polygon.map(toX))).toBeCloseTo(16);
  });

  it('exports Minecraft door properties', () => {
    expect(toJavaProperties(derivedAt(withDoor(), LOWER))).toMatchObject({ facing: 'south', half: 'lower', hinge: 'left' });
  });
});

describe('PaintPipeline.pairDoorHalves', () => {
  const place = (position: Vector3D): PaintOperation => ({ position, blockType: DOOR, blockState: { facing: 'y+' } });
  const toPositionKey = (operation: PaintOperation): string =>
    `${operation.position.x},${operation.position.y},${operation.position.z}:${operation.blockType}:${operation.blockState?.half ?? ''}`;

  it('adds the upper half above a door placement', () => {
    const paired = PaintPipeline.pairDoorHalves([place(LOWER)], new MockBlockIndex(), DIMENSIONS, false);
    expect(paired.map(toPositionKey)).toEqual([`5,5,0:${DOOR}:lower`, `5,5,1:${DOOR}:upper`]);
  });

  it('drops a door whose upper cell is outside the model or holds another block', () => {
    const top = { x: 5, y: 5, z: 3 };
    expect(PaintPipeline.pairDoorHalves([place(top)], new MockBlockIndex(), DIMENSIONS, false)).toEqual([]);
    const blocked = new MockBlockIndex().set(UPPER, 'minecraft:stone');
    expect(PaintPipeline.pairDoorHalves([place(LOWER)], blocked, DIMENSIONS, false)).toEqual([]);
  });

  it('removes the lower half when the upper half is erased', () => {
    const paired = PaintPipeline.pairDoorHalves([{ position: UPPER, blockType: null }], withDoor(), DIMENSIONS, false);
    expect(paired.map(toPositionKey)).toEqual(['5,5,1:null:', '5,5,0:null:']);
  });

  it('removes the upper half when the lower half is painted over', () => {
    const paired = PaintPipeline.pairDoorHalves([{ position: LOWER, blockType: 'minecraft:stone' }], withDoor(), DIMENSIONS, false);
    expect(paired.map(toPositionKey)).toEqual(['5,5,0:minecraft:stone:', '5,5,1:null:']);
  });

  it('carries the partner block in delete mode, for the preview', () => {
    const index = withDoor();
    const paired = PaintPipeline.pairDoorHalves([{ position: LOWER, blockType: DOOR, blockState: { half: 'lower' } }], index, DIMENSIONS, true);
    expect(paired.map(toPositionKey)).toEqual([`5,5,0:${DOOR}:lower`, `5,5,1:${DOOR}:upper`]);
  });

  it('replaces a door with a door without an extra removal', () => {
    const paired = PaintPipeline.pairDoorHalves([place(LOWER)], withDoor(), DIMENSIONS, false);
    expect(paired).toHaveLength(2);
  });
});
