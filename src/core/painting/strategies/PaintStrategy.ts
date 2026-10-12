import type { Vector3D, Dimensions, BlockStateProperties } from '../../../types';

export interface PaintOperation {
  position: Vector3D;
  blockType: string | null; // null = erase
  blockState?: BlockStateProperties;
}

/**
 * PaintStrategy - Which cells an interaction covers
 *
 * A strategy knows nothing of existing blocks or depth. PaintBehavior decides which cells may change,
 * and PaintPipeline adds depth and hands the result to DraftingService.
 */
export interface PaintStrategy {
  /**
   * constrainAxis names the view's depth axis and active layer, which fixes the drawing plane
   */
  calculateOperations(
    startPosition: Vector3D,
    selectedBlockId: string | null,
    dimensions: Dimensions,
    constrainAxis?: { axis: 'x' | 'y' | 'z'; value: number }
  ): PaintOperation[] | Promise<PaintOperation[]>;
}
