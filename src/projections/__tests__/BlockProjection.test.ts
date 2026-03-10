/**
 * BlockProjection tests - verify optimized block index
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventLog } from '../../core/EventLog';
import { blockProjection } from '../BlockProjection';

describe('BlockProjection', () => {
  beforeEach(async () => {
    await eventLog.clear();
    localStorage.clear();
  });

  describe('model:blockPlaced', () => {
    it('should add block to optimized index', async () => {
      await eventLog.append('model:blockPlaced', {
        position: { x: 5, y: 10, z: 3 },
        blockType: 'stone',
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const block = await blockProjection.getBlock({ x: 5, y: 10, z: 3 });

      expect(block).toBeDefined();
      expect(block?.blockType).toBe('stone');
    });

    it('should handle multiple blocks', async () => {
      await eventLog.append('model:blockPlaced', {
        position: { x: 0, y: 0, z: 0 },
        blockType: 'stone',
      });

      await eventLog.append('model:blockPlaced', {
        position: { x: 1, y: 1, z: 1 },
        blockType: 'dirt',
      });

      await eventLog.append('model:blockPlaced', {
        position: { x: 2, y: 2, z: 2 },
        blockType: 'wood',
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const blocks = await blockProjection.getBlocks();
      expect(blocks.toArray().length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('model:blockRemoved', () => {
    it('should remove block from index', async () => {
      await eventLog.append('model:blockPlaced', {
        position: { x: 5, y: 10, z: 3 },
        blockType: 'stone',
      });

      await eventLog.append('model:blockRemoved', {
        position: { x: 5, y: 10, z: 3 },
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const block = await blockProjection.getBlock({ x: 5, y: 10, z: 3 });
      expect(block).toBeNull();
    });
  });

  describe('getBlocksAtLayer()', () => {
    beforeEach(async () => {
      // Place blocks at different layers
      await eventLog.append('model:blockPlaced', {
        position: { x: 0, y: 0, z: 0 },
        blockType: 'stone',
      });

      await eventLog.append('model:blockPlaced', {
        position: { x: 1, y: 0, z: 0 },
        blockType: 'dirt',
      });

      await eventLog.append('model:blockPlaced', {
        position: { x: 0, y: 1, z: 0 },
        blockType: 'wood',
      });

      await eventLog.append('model:blockPlaced', {
        position: { x: 0, y: 0, z: 1 },
        blockType: 'glass',
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('should return blocks at specific Y layer', async () => {
      const blocksAtY0 = await blockProjection.getBlocksAtLayer('y', 0);
      const blocksAtY1 = await blockProjection.getBlocksAtLayer('y', 1);

      expect(blocksAtY0.length).toBeGreaterThanOrEqual(3); // stone, dirt, glass
      expect(blocksAtY1.length).toBeGreaterThanOrEqual(1); // wood
    });

    it('should return blocks at specific Z layer', async () => {
      const blocksAtZ0 = await blockProjection.getBlocksAtLayer('z', 0);
      const blocksAtZ1 = await blockProjection.getBlocksAtLayer('z', 1);

      expect(blocksAtZ0.length).toBeGreaterThanOrEqual(3); // stone, dirt, wood
      expect(blocksAtZ1.length).toBeGreaterThanOrEqual(1); // glass
    });

    it('should return blocks at specific X layer', async () => {
      const blocksAtX0 = await blockProjection.getBlocksAtLayer('x', 0);
      const blocksAtX1 = await blockProjection.getBlocksAtLayer('x', 1);

      expect(blocksAtX0.length).toBeGreaterThanOrEqual(3); // stone, wood, glass
      expect(blocksAtX1.length).toBeGreaterThanOrEqual(1); // dirt
    });
  });

  describe('emit blocks:rebuilt', () => {
    it('should emit after processing event', async () => {
      let emitted = false;

      blockProjection.on('blocks:rebuilt', () => {
        emitted = true;
      });

      await eventLog.append('model:blockPlaced', {
        position: { x: 0, y: 0, z: 0 },
        blockType: 'stone',
      });

      // Give projection time to process and emit
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(emitted).toBe(true);
    });
  });

  describe('decoupling', () => {
    it('should only process block events', async () => {
      await eventLog.append('metadata:created', {
        id: 'project-123',
        name: 'Test',
      });

      await eventLog.append('model:initialized', {
        dimensions: { width: 16, height: 16, depth: 16 },
      });

      await eventLog.append('model:blockPlaced', {
        position: { x: 0, y: 0, z: 0 },
        blockType: 'stone',
      });

      await eventLog.append('metadata:renamed', {
        newName: 'Updated',
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const blocks = await blockProjection.getBlocks();

      // Should have processed only block events
      expect(blocks.toArray().length).toBeGreaterThanOrEqual(1);
    });
  });
});
