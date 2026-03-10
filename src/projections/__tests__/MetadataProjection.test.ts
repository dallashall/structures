/**
 * MetadataProjection tests - verify metadata state materialization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eventLog } from '../../core/EventLog';
import { metadataProjection } from '../MetadataProjection';

describe('MetadataProjection', () => {
  beforeEach(async () => {
    await eventLog.clear();
    localStorage.clear();
  });

  describe('metadata:created', () => {
    it('should initialize metadata', async () => {
      await eventLog.append('metadata:created', {
        id: 'project-123',
        name: 'My Project',
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const metadata = await metadataProjection.getMetadata();
      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('project-123');
      expect(metadata?.name).toBe('My Project');
      expect(metadata?.created).toBeInstanceOf(Date);
      expect(metadata?.modified).toBeInstanceOf(Date);
    });
  });

  describe('metadata:renamed', () => {
    it('should update name', async () => {
      await eventLog.append('metadata:created', {
        id: 'project-123',
        name: 'Original Name',
      });

      await eventLog.append('metadata:renamed', {
        newName: 'Updated Name',
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const metadata = await metadataProjection.getMetadata();
      expect(metadata?.name).toBe('Updated Name');
    });

    it('should update modified timestamp', async () => {
      await eventLog.append('metadata:created', {
        id: 'project-123',
        name: 'Original Name',
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      await eventLog.append('metadata:renamed', {
        newName: 'Updated Name',
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const metadata = await metadataProjection.getMetadata();
      expect(metadata?.modified.getTime()).toBeGreaterThan(
        metadata!.created.getTime()
      );
    });
  });

  describe('emit metadata:rebuilt', () => {
    it('should emit after processing event', async () => {
      let emitted = false;

      metadataProjection.on('metadata:rebuilt', () => {
        emitted = true;
      });

      await eventLog.append('metadata:created', {
        id: 'project-123',
        name: 'Test',
      });

      // Give projection time to process and emit
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(emitted).toBe(true);
    });
  });

  describe('decoupling', () => {
    it('should only process metadata:* events', async () => {
      await eventLog.append('metadata:created', {
        id: 'project-123',
        name: 'My Project',
      });

      await eventLog.append('model:initialized', {
        dimensions: { width: 16, height: 16, depth: 16 },
      });

      await eventLog.append('model:blockPlaced', {
        position: { x: 0, y: 0, z: 0 },
        blockType: 'stone',
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const metadata = await metadataProjection.getMetadata();

      // Should have processed metadata event but not model events
      expect(metadata?.id).toBe('project-123');
      expect(metadata?.name).toBe('My Project');
    });
  });

  describe('convenience methods', () => {
    beforeEach(async () => {
      await eventLog.append('metadata:created', {
        id: 'project-123',
        name: 'Test Project',
      });

      // Give projection time to process
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('getId() should return project ID', async () => {
      expect(await metadataProjection.getId()).toBe('project-123');
    });

    it('getName() should return project name', async () => {
      expect(await metadataProjection.getName()).toBe('Test Project');
    });
  });
});
