import { describe, it, expect } from 'vitest';
import { shapeCatalog } from '../ShapeCatalog';
import type { Vector3D, BlockStateProperties, BlockData } from '../../../types';
import type { BlockIndexReader } from '../../BlockIndex';

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

const AT: Vector3D = { x: 5, y: 5, z: 1 };
const TORCH = 'minecraft:torch';
const torch = shapeCatalog.resolve(TORCH);
const facingAt = (index: MockBlockIndex): string | undefined => shapeCatalog.resolveBlockState(AT, index)?.blockState?.facing;

describe('TorchShape', () => {
  it('claims torches but not torchflowers or fences', () => {
    expect(shapeCatalog.resolve('minecraft:soul_torch').shapeId).toBe('torch');
    expect(shapeCatalog.resolve('minecraft:redstone_torch').shapeId).toBe('torch');
    expect(shapeCatalog.resolve('minecraft:torchflower').shapeId).toBe('cube');
  });

  it('stands on a full block, a fence, or a wall below, and drops its stored facing', () => {
    for (const below of ['minecraft:stone', 'minecraft:oak_fence', 'minecraft:cobblestone_wall']) {
      const index = new MockBlockIndex()
        .set(AT, TORCH, { facing: 'y-' })
        .set({ x: 5, y: 5, z: 0 }, below)
        .set({ x: 5, y: 6, z: 1 }, 'minecraft:stone');
      expect(facingAt(index)).toBeUndefined();
    }
  });

  it('hangs on a full block beside it and faces away from it', () => {
    const index = new MockBlockIndex().set(AT, TORCH).set({ x: 4, y: 5, z: 1 }, 'minecraft:stone');
    expect(facingAt(index)).toBe('x+');
  });

  it('prefers the stored facing when its wall is there', () => {
    const index = new MockBlockIndex()
      .set(AT, TORCH, { facing: 'y-' })
      .set({ x: 4, y: 5, z: 1 }, 'minecraft:stone')
      .set({ x: 5, y: 6, z: 1 }, 'minecraft:stone');
    expect(facingAt(index)).toBe('y-');
  });

  it('stands on the floor with nothing to hold it', () => {
    const index = new MockBlockIndex().set(AT, TORCH, { facing: 'x+' }).set({ x: 4, y: 5, z: 1 }, 'minecraft:oak_slab');
    expect(facingAt(index)).toBeUndefined();
  });

  it('exports a wall torch under the wall torch ID', () => {
    expect(torch.getExportBlockId(TORCH, { facing: 'x+' })).toBe('minecraft:wall_torch');
    expect(torch.getExportBlockId('minecraft:soul_torch', { facing: 'y-' })).toBe('minecraft:soul_wall_torch');
    expect(torch.getExportBlockId(TORCH, {})).toBe(TORCH);
  });

  it('leans a wall torch away from its wall in the 2D views', () => {
    // Facing x+, the wall is at x 0. The stick's foot is near x 0 and its top leans toward x+.
    const [polygon] = torch.get2DClip({ facing: 'x+' }, 'front', 0, 0, 16)!;
    const toX = (point: { x: number; y: number }): number => point.x;
    const xs = polygon.map(toX);
    expect(Math.min(...xs)).toBeLessThan(1);
    expect(Math.max(...xs)).toBeGreaterThan(4);
  });
});
