/**
 * Shapes use absolute directions:
 *   "straight_{facing}"
 *   "{inner|outer}_{facing}_{cornerEdge}"
 *
 * cornerEdge is the neighbor's back (its tall side), which is where an inner corner's
 * extra quarter or an outer corner's remaining quarter sits.
 */

import { describe, it, expect } from 'vitest';
import { calculateStairShape } from '../StairShapeResolver';
import type { Vector3D, BlockStateProperties, BlockData } from '../../types';
import type { BlockIndexReader } from '../BlockIndex';

class MockBlockIndex implements BlockIndexReader {
  private blocks = new Map<string, BlockData>();

  set(pos: Vector3D, blockType: string, blockState: BlockStateProperties) {
    const key = `${pos.x},${pos.y},${pos.z}`;
    this.blocks.set(key, { position: pos, blockType, blockState });
  }

  get(pos: Vector3D): BlockData | null {
    const key = `${pos.x},${pos.y},${pos.z}`;
    return this.blocks.get(key) ?? null;
  }
}

describe('StairShapeResolver', () => {
  describe('facing x+', () => {
    it('straight: no neighbors', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };

      expect(calculateStairShape(pos, 'x+', 'bottom', index)).toBe('straight_x+');
    });

    // Front neighbor at (1,0,0). Neighbor faces y+ → neighbor's back is y-.
    it('inner corner: front neighbor faces y+, corner at y-', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 1, y: 0, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'y+', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'x+', 'bottom', index)).toBe('inner_x+_y-');
    });

    // Front neighbor faces y- → neighbor's back is y+.
    it('inner corner: front neighbor faces y-, corner at y+', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 1, y: 0, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'y-', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'x+', 'bottom', index)).toBe('inner_x+_y+');
    });

    // Back neighbor at (-1,0,0). Neighbor faces y+ → neighbor's back is y-.
    it('outer corner: back neighbor faces y+, corner at y-', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: -1, y: 0, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'y+', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'x+', 'bottom', index)).toBe('outer_x+_y-');
    });

    // Back neighbor faces y- → neighbor's back is y+.
    it('outer corner: back neighbor faces y-, corner at y+', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: -1, y: 0, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'y-', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'x+', 'bottom', index)).toBe('outer_x+_y+');
    });
  });

  describe('facing x-', () => {
    it('straight: no neighbors', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };

      expect(calculateStairShape(pos, 'x-', 'bottom', index)).toBe('straight_x-');
    });

    it('inner corner: front neighbor faces y+, corner at y-', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: -1, y: 0, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'y+', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'x-', 'bottom', index)).toBe('inner_x-_y-');
    });

    it('inner corner: front neighbor faces y-, corner at y+', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: -1, y: 0, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'y-', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'x-', 'bottom', index)).toBe('inner_x-_y+');
    });

    it('outer corner: back neighbor faces y+, corner at y-', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 1, y: 0, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'y+', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'x-', 'bottom', index)).toBe('outer_x-_y-');
    });

    it('outer corner: back neighbor faces y-, corner at y+', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 1, y: 0, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'y-', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'x-', 'bottom', index)).toBe('outer_x-_y+');
    });
  });

  describe('facing y+', () => {
    it('straight: no neighbors', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };

      expect(calculateStairShape(pos, 'y+', 'bottom', index)).toBe('straight_y+');
    });

    // Front neighbor at (0,1,0). Neighbor faces x+ → neighbor's back is x-.
    it('inner corner: front neighbor faces x+, corner at x-', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 0, y: 1, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'x+', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'y+', 'bottom', index)).toBe('inner_y+_x-');
    });

    it('inner corner: front neighbor faces x-, corner at x+', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 0, y: 1, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'x-', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'y+', 'bottom', index)).toBe('inner_y+_x+');
    });

    it('outer corner: back neighbor faces x+, corner at x-', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 0, y: -1, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'x+', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'y+', 'bottom', index)).toBe('outer_y+_x-');
    });

    it('outer corner: back neighbor faces x-, corner at x+', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 0, y: -1, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'x-', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'y+', 'bottom', index)).toBe('outer_y+_x+');
    });
  });

  describe('facing y-', () => {
    it('straight: no neighbors', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };

      expect(calculateStairShape(pos, 'y-', 'bottom', index)).toBe('straight_y-');
    });

    it('inner corner: front neighbor faces x+, corner at x-', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 0, y: -1, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'x+', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'y-', 'bottom', index)).toBe('inner_y-_x-');
    });

    it('inner corner: front neighbor faces x-, corner at x+', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 0, y: -1, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'x-', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'y-', 'bottom', index)).toBe('inner_y-_x+');
    });

    it('outer corner: back neighbor faces x+, corner at x-', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 0, y: 1, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'x+', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'y-', 'bottom', index)).toBe('outer_y-_x-');
    });

    it('outer corner: back neighbor faces x-, corner at x+', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 0, y: 1, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'x-', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'y-', 'bottom', index)).toBe('outer_y-_x+');
    });
  });

  describe('half matching', () => {
    it('ignores neighbors with different half values', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 1, y: 0, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'y+', half: 'top',
      });

      expect(calculateStairShape(pos, 'x+', 'bottom', index)).toBe('straight_x+');
    });

    it('forms corner with matching top-half neighbor', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 1, y: 0, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'y+', half: 'top',
      });

      expect(calculateStairShape(pos, 'x+', 'top', index)).toBe('inner_x+_y-');
    });
  });

  describe('parallel neighbors ignored', () => {
    it('ignores front neighbor facing same direction', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 1, y: 0, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'x+', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'x+', 'bottom', index)).toBe('straight_x+');
    });

    it('ignores front neighbor facing opposite direction', () => {
      const index = new MockBlockIndex();
      const pos: Vector3D = { x: 0, y: 0, z: 0 };
      index.set({ x: 1, y: 0, z: 0 }, 'minecraft:oak_stairs', {
        facing: 'x-', half: 'bottom',
      });

      expect(calculateStairShape(pos, 'x+', 'bottom', index)).toBe('straight_x+');
    });
  });
});
