import type { Vector3D, Dimensions, LayerState, BlockStateProperties } from "../../types";
import type { ViewState } from "./ViewState";
import { getOpacityForDistance } from "./renderingUtils";

/**
 * GridBlock - Pre-resolved block for rendering
 *
 * Contains everything the renderer needs to draw a block,
 * with grid coordinates already resolved from model space.
 * No coordinate conversion needed at render time.
 */
export interface GridBlock {
  gridX: number;
  gridY: number;
  blockType: string;
  blockState?: BlockStateProperties;
  opacity: number;
}

/**
 * Resolve model-position blocks to grid-position blocks for a specific view.
 *
 * This is THE single conversion point for model→grid in the 2D render pipeline.
 * Called once when data changes, not on every frame.
 */
export function resolveBlocksToGrid(
  blocks: ReadonlyArray<{
    position: Vector3D;
    blockType: string;
    blockState?: BlockStateProperties;
  }>,
  viewState: ViewState,
  dimensions: Dimensions,
  activeLayers: LayerState,
): GridBlock[] {
  const { gridWidth, gridHeight } = viewState.getGridDimensions(dimensions);
  const resolved: GridBlock[] = [];

  for (const block of blocks) {
    const distance = viewState.getLayerDistance(block.position, activeLayers);
    const opacity = getOpacityForDistance(distance);
    if (opacity === 0) continue;

    const { gridX, gridY } = viewState.modelToGrid(
      block.position,
      dimensions,
    );

    if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
      continue;
    }

    resolved.push({
      gridX,
      gridY,
      blockType: block.blockType,
      blockState: block.blockState,
      opacity,
    });
  }

  return resolved;
}

/**
 * Resolve preview blocks to grid — simpler variant for draft/editor preview
 * where all blocks render at full opacity on the active layer.
 */
export function resolvePreviewToGrid(
  blocks: ReadonlyArray<{ position: Vector3D; blockType: string | null; blockState?: BlockStateProperties }>,
  viewState: ViewState,
  dimensions: Dimensions,
): GridBlock[] {
  const { gridWidth, gridHeight } = viewState.getGridDimensions(dimensions);
  const resolved: GridBlock[] = [];

  for (const block of blocks) {
    if (!block.blockType) continue;

    const { gridX, gridY } = viewState.modelToGrid(
      block.position,
      dimensions,
    );

    if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
      continue;
    }

    resolved.push({
      gridX,
      gridY,
      blockType: block.blockType,
      blockState: block.blockState,
      opacity: 1.0,
    });
  }

  return resolved;
}
