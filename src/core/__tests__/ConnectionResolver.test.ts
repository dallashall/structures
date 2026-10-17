import { describe, it, expect } from 'vitest';
import { calculateFenceConnections, calculateWallState } from '../ConnectionResolver';
import { shapeCatalog } from '../shapes/ShapeCatalog';
import type { Vector3D, BlockStateProperties, BlockData } from '../../types';
import type { BlockIndexReader } from '../BlockIndex';

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

const ORIGIN: Vector3D = { x: 0, y: 0, z: 0 };
const OAK_FENCE = 'minecraft:oak_fence';
const WALL = 'minecraft:cobblestone_wall';

describe('calculateFenceConnections', () => {
  it('joins nothing when alone', () => {
    const index = new MockBlockIndex().set(ORIGIN, OAK_FENCE);
    expect(calculateFenceConnections(ORIGIN, OAK_FENCE, index)).toEqual({ 'x+': false, 'x-': false, 'y+': false, 'y-': false });
  });

  it('joins wooden fences of any wood and full blocks', () => {
    const index = new MockBlockIndex()
      .set(ORIGIN, OAK_FENCE)
      .set({ x: 1, y: 0, z: 0 }, 'minecraft:spruce_fence')
      .set({ x: 0, y: -1, z: 0 }, 'minecraft:stone');
    expect(calculateFenceConnections(ORIGIN, OAK_FENCE, index)).toEqual({ 'x+': true, 'x-': false, 'y+': false, 'y-': true });
  });

  it('keeps nether brick fences apart from wooden fences', () => {
    const index = new MockBlockIndex()
      .set(ORIGIN, OAK_FENCE)
      .set({ x: -1, y: 0, z: 0 }, 'minecraft:nether_brick_fence');
    expect(calculateFenceConnections(ORIGIN, OAK_FENCE, index)['x-']).toBe(false);
  });

  it('joins a fence gate only along its width', () => {
    const index = new MockBlockIndex()
      .set(ORIGIN, OAK_FENCE)
      .set({ x: 1, y: 0, z: 0 }, 'minecraft:oak_fence_gate', { facing: 'y-' })
      .set({ x: 0, y: 1, z: 0 }, 'minecraft:oak_fence_gate', { facing: 'y-' });
    const connections = calculateFenceConnections(ORIGIN, OAK_FENCE, index);
    expect(connections['x+']).toBe(true);
    expect(connections['y+']).toBe(false);
  });

  it('does not join slabs or stairs', () => {
    const index = new MockBlockIndex()
      .set(ORIGIN, OAK_FENCE)
      .set({ x: 1, y: 0, z: 0 }, 'minecraft:oak_slab')
      .set({ x: -1, y: 0, z: 0 }, 'minecraft:oak_stairs');
    const connections = calculateFenceConnections(ORIGIN, OAK_FENCE, index);
    expect(connections['x+']).toBe(false);
    expect(connections['x-']).toBe(false);
  });
});

describe('calculateWallState', () => {
  it('shows a post with no sides when alone', () => {
    const index = new MockBlockIndex().set(ORIGIN, WALL);
    expect(calculateWallState(ORIGIN, index)).toEqual({
      sides: { 'x+': 'none', 'x-': 'none', 'y+': 'none', 'y-': 'none' },
      post: true,
    });
  });

  it('drops the post on a straight run, and keeps it on a corner', () => {
    const straight = new MockBlockIndex()
      .set(ORIGIN, WALL)
      .set({ x: 1, y: 0, z: 0 }, WALL)
      .set({ x: -1, y: 0, z: 0 }, 'minecraft:andesite_wall');
    expect(calculateWallState(ORIGIN, straight)).toEqual({
      sides: { 'x+': 'low', 'x-': 'low', 'y+': 'none', 'y-': 'none' },
      post: false,
    });

    const corner = new MockBlockIndex().set(ORIGIN, WALL).set({ x: 1, y: 0, z: 0 }, WALL).set({ x: 0, y: 1, z: 0 }, WALL);
    expect(calculateWallState(ORIGIN, corner).post).toBe(true);
  });

  it('keeps the post on a straight run under a torch', () => {
    const index = new MockBlockIndex()
      .set(ORIGIN, WALL)
      .set({ x: 0, y: 1, z: 0 }, WALL)
      .set({ x: 0, y: -1, z: 0 }, WALL)
      .set({ x: 0, y: 0, z: 1 }, 'minecraft:torch');
    expect(calculateWallState(ORIGIN, index).post).toBe(true);
  });

  it('raises sides to tall under a full block', () => {
    const index = new MockBlockIndex()
      .set(ORIGIN, WALL)
      .set({ x: 1, y: 0, z: 0 }, 'minecraft:stone')
      .set({ x: 0, y: 0, z: 1 }, 'minecraft:stone');
    expect(calculateWallState(ORIGIN, index).sides['x+']).toBe('tall');
  });

  it('raises only the sides the wall above also joins', () => {
    const index = new MockBlockIndex()
      .set(ORIGIN, WALL)
      .set({ x: 1, y: 0, z: 0 }, WALL)
      .set({ x: 0, y: 1, z: 0 }, WALL)
      .set({ x: 0, y: 0, z: 1 }, WALL)
      .set({ x: 1, y: 0, z: 1 }, WALL);
    const { sides } = calculateWallState(ORIGIN, index);
    expect(sides['x+']).toBe('tall');
    expect(sides['y+']).toBe('low');
  });
});

describe('fence and wall shapes', () => {
  it('derive connections through the shape catalog', () => {
    const index = new MockBlockIndex().set(ORIGIN, OAK_FENCE).set({ x: 1, y: 0, z: 0 }, OAK_FENCE);
    expect(shapeCatalog.resolveBlockState(ORIGIN, index)?.blockState?.connections?.['x+']).toBe(true);
  });

  it('key the geometry by joined sides', () => {
    const fence = shapeCatalog.resolve(OAK_FENCE);
    expect(fence.getGeometryKey({ connections: { 'x+': true, 'y-': true } })).toBe('fence_x+y-');
    const wall = shapeCatalog.resolve(WALL);
    expect(wall.getGeometryKey({ connections: { 'z+': false }, wallSides: { 'x+': 'tall', 'x-': 'low' } })).toBe('wall_tlnn');
  });

  it('do not claim fence gates or wall torches', () => {
    expect(shapeCatalog.resolve('minecraft:oak_fence_gate').shapeId).toBe('cube');
    expect(shapeCatalog.resolve('minecraft:wall_torch').shapeId).not.toBe('wall');
  });
});
