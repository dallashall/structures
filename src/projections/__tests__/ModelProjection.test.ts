/**
 * ModelProjection tests - verify model state materialization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventLog } from '../../core/EventLog';
import { modelProjection } from '../ModelProjection';

describe('ModelProjection', () => {
  beforeEach(async () => {
    await eventLog.clear();
    localStorage.clear();
  });

  describe('model:initialized', () => {
    it('should initialize dimensions', async () => {
      await eventLog.append('model:initialized', {
        dimensions: { width: 32, height: 16, depth: 32 },
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const model = await modelProjection.getModel();
      expect(model.dimensions).toEqual({
        width: 32,
        height: 16,
        depth: 32,
      });
    });
  });

  describe('model:blockPlaced', () => {
    it('should add block to index', async () => {
      await eventLog.append('model:initialized', {
        dimensions: { width: 16, height: 16, depth: 16 },
      });

      await eventLog.append('model:blockPlaced', {
        position: { x: 5, y: 10, z: 3 },
        blockType: 'stone',
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const model = await modelProjection.getModel();
      const block = model.blocks.get({ x: 5, y: 10, z: 3 });

      expect(block).toBeDefined();
      expect(block?.blockType).toBe('stone');
    });

    it('should handle multiple blocks', async () => {
      await eventLog.append('model:initialized', {
        dimensions: { width: 16, height: 16, depth: 16 },
      });

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

      const model = await modelProjection.getModel();
      expect(model.blocks.toArray().length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('model:blockRemoved', () => {
    it('should remove block from index', async () => {
      await eventLog.append('model:initialized', {
        dimensions: { width: 16, height: 16, depth: 16 },
      });

      await eventLog.append('model:blockPlaced', {
        position: { x: 5, y: 10, z: 3 },
        blockType: 'stone',
      });

      await eventLog.append('model:blockRemoved', {
        position: { x: 5, y: 10, z: 3 },
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const model = await modelProjection.getModel();
      const block = model.blocks.get({ x: 5, y: 10, z: 3 });

      expect(block).toBeNull();
    });
  });

  describe('model:dimensionExpanded', () => {
    it('should update dimensions', async () => {
      await eventLog.append('model:initialized', {
        dimensions: { width: 16, height: 16, depth: 16 },
      });

      await eventLog.append('model:dimensionExpanded', {
        newDimensions: { width: 32, height: 16, depth: 16 },
        shift: { x: 0, y: 0, z: 0 },
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const model = await modelProjection.getModel();
      expect(model.dimensions.width).toBe(32);
    });

    it('should shift blocks when expanding', async () => {
      await eventLog.append('model:initialized', {
        dimensions: { width: 16, height: 16, depth: 16 },
      });

      await eventLog.append('model:blockPlaced', {
        position: { x: 0, y: 0, z: 0 },
        blockType: 'stone',
      });

      await eventLog.append('model:dimensionExpanded', {
        newDimensions: { width: 32, height: 16, depth: 16 },
        shift: { x: 8, y: 0, z: 0 },
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const model = await modelProjection.getModel();
      const block = model.blocks.get({ x: 8, y: 0, z: 0 });

      expect(block).toBeDefined();
      expect(block?.blockType).toBe('stone');
    });
  });

  describe('model:metaBlockPlaced', () => {
    it('should update metaBlock position', async () => {
      await eventLog.append('model:initialized', {
        dimensions: { width: 16, height: 16, depth: 16 },
      });

      await eventLog.append('model:metaBlockPlaced', {
        position: { x: 5, y: 5, z: 5 },
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const model = await modelProjection.getModel();
      expect(model.metaBlock.position).toEqual({ x: 5, y: 5, z: 5 });
    });
  });

  describe('model:metaBlockConfirmed', () => {
    it('should set metaBlock as confirmed', async () => {
      await eventLog.append('model:initialized', {
        dimensions: { width: 16, height: 16, depth: 16 },
      });

      await eventLog.append('model:metaBlockConfirmed', {});

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const model = await modelProjection.getModel();
      expect(model.metaBlock.isConfirmed).toBe(true);
    });
  });

  describe('emit model:rebuilt', () => {
    it('should emit after processing event', async () => {
      let emitted = false;

      modelProjection.on('model:rebuilt', () => {
        emitted = true;
      });

      await eventLog.append('model:initialized', {
        dimensions: { width: 16, height: 16, depth: 16 },
      });

      // Give projection time to process and emit
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(emitted).toBe(true);
    });
  });

  describe('decoupling', () => {
    it('should only process model:* events', async () => {
      await eventLog.append('model:initialized', {
        dimensions: { width: 16, height: 16, depth: 16 },
      });

      await eventLog.append('metadata:created', {
        id: 'test-id',
        name: 'Test Project',
      });

      await eventLog.append('model:blockPlaced', {
        position: { x: 0, y: 0, z: 0 },
        blockType: 'stone',
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const model = await modelProjection.getModel();

      // Should have processed model events but not metadata
      expect(model.dimensions.width).toBe(16);
      expect(model.blocks.toArray().length).toBeGreaterThanOrEqual(1);
    });
  });
});
