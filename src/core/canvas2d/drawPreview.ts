import type { GridBlock } from "./GridBlock";
import type { PreviewData } from "../tools/ToolBase";
import type { ViewType, BlockStateProperties } from "../../types";
import { blockRegistry } from "../BlockRegistry";

/**
 * Views where Z (height) is on the vertical grid axis.
 */
const Z_VERTICAL_VIEWS = new Set<ViewType>(['front', 'back', 'left', 'right']);

/**
 * Draw shared preview blocks from DraftingService and EditorState.
 * Both sources are pre-resolved to GridBlock[] — no coordinate conversion.
 *
 * In delete mode, preview blocks are shown with a red tint to indicate removal.
 */
export function drawSharedPreview(
  ctx: CanvasRenderingContext2D,
  draftBlocks: GridBlock[],
  editorPreview: GridBlock[],
  cellSize: number,
  pan: { x: number; y: number },
  deleteMode: boolean,
  viewType: ViewType,
): void {
  if (draftBlocks.length === 0 && editorPreview.length === 0) return;

  ctx.save();
  ctx.globalAlpha = 0.7;

  const drawPreviewBlock = (gridBlock: GridBlock): void => {
    const block = blockRegistry.getBlock(gridBlock.blockType);
    if (!block) return;

    const px = pan.x + gridBlock.gridX * cellSize;
    const py = pan.y + gridBlock.gridY * cellSize;

    // Apply slab clipping for preview blocks
    const clip = getPreviewSlabClip(gridBlock.blockState, viewType, px, py, cellSize);
    if (clip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(clip.x, clip.y, clip.w, clip.h);
      ctx.clip();
    }

    ctx.fillStyle = block.color;
    ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

    if (deleteMode) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
      ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
    }

    if (clip) {
      ctx.restore();
    }
  };

  for (const gridBlock of editorPreview) {
    drawPreviewBlock(gridBlock);
  }

  for (const gridBlock of draftBlocks) {
    drawPreviewBlock(gridBlock);
  }

  ctx.restore();
}

/**
 * Get clipping rectangle for slab preview blocks.
 */
function getPreviewSlabClip(
  blockState: BlockStateProperties | undefined,
  viewType: ViewType,
  px: number,
  py: number,
  cellSize: number,
): { x: number; y: number; w: number; h: number } | null {
  if (!blockState?.type) return null;
  if (blockState.type === 'double') return null;
  if (!Z_VERTICAL_VIEWS.has(viewType)) return null;

  const halfSize = cellSize / 2;

  if (blockState.type === 'bottom') {
    return { x: px, y: py + halfSize, w: cellSize, h: halfSize };
  }
  return { x: px, y: py, w: cellSize, h: halfSize };
}

/**
 * Draw tool-local preview blocks (hover highlight).
 *
 * Reads from previewData.blocks, which contains UniversalPosition
 * with pre-resolved gridX/gridY coordinates. No conversion needed.
 */
export function drawToolPreview(
  ctx: CanvasRenderingContext2D,
  previewData: PreviewData | null,
  gridWidth: number,
  gridHeight: number,
  cellSize: number,
  pan: { x: number; y: number },
  selectedBlockId: string | null,
): void {
  if (!previewData || previewData.blocks.length === 0) return;
  if (!selectedBlockId) return;

  const block = blockRegistry.getBlock(selectedBlockId);
  if (!block) return;

  ctx.save();

  for (const previewBlock of previewData.blocks) {
    const { gridX, gridY } = previewBlock.position;
    if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
      continue;
    }

    const px = pan.x + gridX * cellSize;
    const py = pan.y + gridY * cellSize;

    ctx.fillStyle = block.color;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

    ctx.strokeStyle = block.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
  }

  ctx.restore();
}
