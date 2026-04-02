/**
 * DraftingService - Manages ephemeral preview state shared across all views
 *
 * Responsibilities:
 * - Hold preview blocks during active drawing interactions
 * - Share preview state across 2D and 3D views
 * - Provide reactively-derived preview state for accurate rendering
 * - Finalize preview by persisting to EventLog
 * - Cancel preview without persisting
 *
 * Key distinction: Preview state is EPHEMERAL (not persisted to EventLog).
 * Only when finalize() is called does the preview become part of the model history.
 *
 * Derived state (stair shape, connections) is computed reactively at read time
 * through shapeCatalog.resolveBlockState(), never persisted in events.
 */

import { EventEmitter } from './EventEmitter';
import { eventLog } from './EventLog';
import { editorState } from './EditorState';
import { blockProjection } from '../projections/BlockProjection';
import { shapeCatalog } from './shapes/ShapeCatalog';
import { OverlayBlockIndex } from './OverlayBlockIndex';
import type { Vector3D, BlockStateProperties } from '../types';

export interface PreviewBlock {
  position: Vector3D;
  blockType: string;
  blockState?: BlockStateProperties;
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
   * Finalize draft - persist to EventLog and clear preview.
   * Only stores user intent (facing, half, type). Derived state
   * is never persisted — it's recomputed at read time.
   */
  async finalize(): Promise<void> {
    if (this.previewBlocks.length === 0) {
      this.previewBlocks = [];
      this.emit('draft:cancelled');
      return;
    }

    const projectId = editorState.getCurrentProjectId();
    if (!projectId) {
      console.error('Cannot finalize draft: no current project');
      return;
    }

    // Persist each block to EventLog as model:blockPlaced
    for (const block of this.previewBlocks) {
      await eventLog.append('model:blockPlaced', {
        position: block.position,
        blockType: block.blockType,
        blockState: block.blockState,
      }, projectId);
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
   * Get raw preview blocks (no derivation).
   * Used by renderers that handle derivation themselves.
   */
  getPreview(): PreviewBlock[] {
    return this.previewBlocks;
  }

  /**
   * Get preview blocks with reactively derived state.
   * Creates an OverlayBlockIndex that combines real blocks + preview blocks,
   * then resolves each preview block through shapeCatalog.resolveBlockState()
   * so stairs show accurate corner shapes in the preview.
   */
  getResolvedPreview(): PreviewBlock[] {
    if (this.previewBlocks.length === 0) return [];

    const baseIndex = blockProjection.getCached();
    const previewAsBlockData = this.previewBlocks.map(toBlockData);
    const overlay = new OverlayBlockIndex(baseIndex, previewAsBlockData);

    const resolvePreview = (block: PreviewBlock): PreviewBlock => {
      const resolved = shapeCatalog.resolveBlockState(block.position, overlay);
      if (!resolved) return block;
      return { ...block, blockState: resolved.blockState };
    };

    return this.previewBlocks.map(resolvePreview);
  }
}

/** Convert PreviewBlock → BlockData for OverlayBlockIndex */
function toBlockData(block: PreviewBlock) {
  return {
    position: block.position,
    blockType: block.blockType,
    blockState: block.blockState,
  };
}

// Export singleton instance
export const draftingService = DraftingService.getInstance();
