/**
 * DraftingService - Manages ephemeral preview state shared across all views
 *
 * Responsibilities:
 * - Hold preview blocks during active drawing interactions
 * - Share preview state across 2D and 3D views
 * - Finalize preview by persisting to EventLog
 * - Cancel preview without persisting
 *
 * Key distinction: Preview state is EPHEMERAL (not persisted to EventLog).
 * Only when finalize() is called does the preview become part of the model history.
 */

import { EventEmitter } from './EventEmitter';
import { eventLog } from './EventLog';
import type { Vector3D } from '../types';

export interface PreviewBlock {
  position: Vector3D;
  blockType: string;
  direction?: string;  // Future: directional materials
}

/**
 * DraftingService singleton class
 */
class DraftingService extends EventEmitter {
  private static instance: DraftingService;
  private previewBlocks: PreviewBlock[] = [];

  private constructor() {
    super();
  }

  static getInstance(): DraftingService {
    if (!DraftingService.instance) {
      DraftingService.instance = new DraftingService();
    }
    return DraftingService.instance;
  }

  /**
   * Start new draft (clear previous preview)
   */
  start(): void {
    this.previewBlocks = [];
    this.emit('draft:started');
  }

  /**
   * Update preview with new blocks
   * Views subscribe to 'draft:updated' to re-render
   */
  set(blocks: PreviewBlock[]): void {
    this.previewBlocks = blocks;
    this.emit('draft:updated');
  }

  /**
   * Finalize draft - persist to EventLog and clear preview
   */
  async finalize(): Promise<void> {
    if (this.previewBlocks.length === 0) {
      this.previewBlocks = [];
      this.emit('draft:cancelled');
      return;
    }

    // Persist each block to EventLog as model:blockPlaced
    for (const block of this.previewBlocks) {
      await eventLog.append('model:blockPlaced', {
        position: block.position,
        blockType: block.blockType,
      });
    }

    // Clear preview
    this.previewBlocks = [];
    this.emit('draft:finalized');
  }

  /**
   * Cancel draft - discard preview without persisting
   */
  cancel(): void {
    this.previewBlocks = [];
    this.emit('draft:cancelled');
  }

  /**
   * Get current preview blocks
   * Used by renderers (2D, 3D) to show preview
   */
  getPreview(): PreviewBlock[] {
    return this.previewBlocks;
  }
}

// Export singleton instance
export const draftingService = DraftingService.getInstance();
