/**
 * DraftingService - Manages ephemeral preview state shared across all views
 *
 * Responsibilities:
 * - Hold preview blocks during active drawing interactions
 * - Share preview state across 2D and 3D views
 * - Provide reactively-derived preview state for accurate rendering
 * - Finalize a drawing operation by persisting it to the EventLog (the only tool write path)
 * - Cancel preview without persisting
 *
 * Key distinction: Preview state is EPHEMERAL (not persisted to EventLog).
 * Only when finalize() is called does the preview become part of the model history.
 *
 * Derived state (stair shape, connections) is computed reactively at read time
 * through shapeCatalog.resolveBlockState(), never persisted in events.
 */

import { EventEmitter } from './EventEmitter';
import { eventLog, type ActionDraft } from './EventLog';
import { editorState } from './EditorState';
import { blockProjection } from '../projections/BlockProjection';
import { shapeCatalog } from './shapes/ShapeCatalog';
import { OverlayBlockIndex } from './OverlayBlockIndex';
import type { Vector3D, BlockStateProperties } from '../types';
import type { PaintOperation } from './painting/strategies/PaintStrategy';

type PlacedOperation = PaintOperation & { blockType: string };

interface PreviewBlock {
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
  // True from start() until finalize() or cancel(). Undo and redo wait while a stroke is in progress.
  private active = false;

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
    this.active = true;
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
   * Finalize a drawing operation: persist it to the EventLog as one paint action, then clear the preview.
   * Undo reverts the whole action.
   *
   * In delete mode every operation removes its position. Otherwise an operation with a
   * block type places it, and one with a null block type erases (the PaintOperation contract).
   * Removals are appended before placements. Only user intent (facing, half, type) is
   * persisted. Derived state is recomputed at read time.
   */
  async finalize(operations: PaintOperation[]): Promise<void> {
    const projectId = editorState.getCurrentProjectId();
    if (!projectId) {
      this.cancel();
      return;
    }

    const deleteMode = editorState.getDeleteMode();
    const isRemoval = (op: PaintOperation): boolean => deleteMode || op.blockType === null;
    const isPlacement = (op: PaintOperation): op is PlacedOperation => !isRemoval(op);

    const positions = operations.filter(isRemoval).map(toPosition);
    const blocks = operations.filter(isPlacement).map(toPlacedBlock);

    const events: ActionDraft['events'] = [];
    if (positions.length > 0) {
      events.push({ type: 'model:blocksRemoved', data: { positions } });
    }
    if (blocks.length > 0) {
      events.push({ type: 'model:blocksPlaced', data: { blocks } });
    }
    try {
      if (events.length > 0) {
        await eventLog.appendAction(projectId, { kind: 'paint', tool: editorState.getPaintMode(), events });
      }
    } finally {
      // A failed write still ends the stroke, so undo never stays blocked
      this.previewBlocks = [];
      this.active = false;
    }
    this.emit('draft:finalized');
  }

  /**
   * Cancel draft - discard preview without persisting
   */
  cancel(): void {
    this.active = false;
    this.previewBlocks = [];
    this.emit('draft:cancelled');
  }

  isActive(): boolean {
    return this.active;
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

const toPosition = (op: PaintOperation): Vector3D => op.position;

const toPlacedBlock = (op: PlacedOperation): PreviewBlock => ({
  position: op.position,
  blockType: op.blockType,
  blockState: op.blockState,
});

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
