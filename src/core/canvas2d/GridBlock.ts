import type { Vector3D, Dimensions, LayerState, BlockStateProperties } from "../../types";
import type { ViewState } from "./ViewState";
import { getOpacityForDistance } from "./renderingUtils";

/**
 * GridBlock - A block already converted from model space to one view's grid cells
 */
export interface GridBlock {
  gridX: number;
  gridY: number;
  blockType: string;
  blockState?: BlockStateProperties;
  opacity: number;
}

/**
 * The only model→grid conversion in the 2D render pipeline. Canvas2D calls it when data changes, not each frame.
 * Blocks fade with distance from the active layer and drop out past two layers.
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
 * Previews draw at full opacity whatever their layer, and erase operations (null blockType) are skipped
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
