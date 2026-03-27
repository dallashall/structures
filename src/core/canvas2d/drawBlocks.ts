import type { ViewType, BlockStateProperties } from "../../types";
import type { GridBlock } from "./GridBlock";
import { blockRegistry } from "../BlockRegistry";
import { textureManager } from "../TextureManager";

/**
 * Views where Z (height) is on the vertical grid axis.
 * For these views, slab top/bottom affects the visible rendering area.
 */
const Z_VERTICAL_VIEWS = new Set<ViewType>(['front', 'back', 'left', 'right']);

/**
 * Face index mapping for each orthographic view.
 * Our coordinate system: X=width, Y=depth, Z=height
 * BabylonJS: Y-up, conversion is Our (x,y,z) -> Babylon (x,z,y) [NO NEGATION]
 * Face order: [front(+Z), back(-Z), right(+X), left(-X), top(+Y), bottom(-Y)]
 */
const FACE_INDEX_MAP: Record<ViewType, number> = {
  front: 0,
  back: 1,
  left: 3,
  right: 2,
  top: 4,
  bottom: 5,
};

/**
 * Draw persistent blocks from pre-resolved GridBlock data.
 * No coordinate conversions — all grid positions are pre-resolved.
 */
export function drawPersistentBlocks(
  ctx: CanvasRenderingContext2D,
  blocks: GridBlock[],
  cellSize: number,
  pan: { x: number; y: number },
  viewType: ViewType,
): void {
  const faceIndex = FACE_INDEX_MAP[viewType] ?? 0;

  for (const gridBlock of blocks) {
    const px = pan.x + gridBlock.gridX * cellSize;
    const py = pan.y + gridBlock.gridY * cellSize;

    const { block } = blockRegistry.getBlockWithState(
      gridBlock.blockType,
      gridBlock.blockState,
    );
    if (!block) continue;

    // Apply clipping for non-cube blocks (slabs)
    const clip = getSlabClip(gridBlock.blockState, viewType, px, py, cellSize);
    if (clip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(clip.x, clip.y, clip.w, clip.h);
      ctx.clip();
    }

    const rendered = renderBlockTexture(
      ctx,
      block,
      faceIndex,
      px,
      py,
      cellSize,
      gridBlock.opacity,
    );

    if (!rendered) {
      ctx.fillStyle = block.color;
      ctx.globalAlpha = gridBlock.opacity;
      ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      ctx.globalAlpha = 1.0;
    }

    if (clip) {
      ctx.restore();
    }
  }
}

/**
 * Render block with texture from atlas or tinted texture.
 * Returns true if successful, false if texture unavailable.
 */
function renderBlockTexture(
  ctx: CanvasRenderingContext2D,
  block: { id: string; isTransparent: boolean },
  faceIndex: number,
  px: number,
  py: number,
  cellSize: number,
  opacity: number,
): boolean {
  const tintedTexture = textureManager.getTintedTexture(block.id, faceIndex);
  if (tintedTexture) {
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = block.isTransparent ? opacity * 0.15 : opacity;
    ctx.drawImage(
      tintedTexture,
      0,
      0,
      tintedTexture.width,
      tintedTexture.height,
      px + 1,
      py + 1,
      cellSize - 2,
      cellSize - 2,
    );
    ctx.globalAlpha = 1.0;
    return true;
  }

  const atlas = textureManager.getAtlas();
  if (!atlas || !atlas.loaded) return false;

  const coords = textureManager.getBlockFaceCoords(block.id, faceIndex);
  if (!coords) return false;

  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = opacity;
  ctx.drawImage(
    atlas.image,
    coords.x,
    coords.y,
    coords.width,
    coords.height,
    px + 1,
    py + 1,
    cellSize - 2,
    cellSize - 2,
  );
  ctx.globalAlpha = 1.0;
  return true;
}

/**
 * Get clipping rectangle for slab blocks.
 * Returns null for non-slab blocks or views where slabs appear as full blocks.
 *
 * In views where Z is the vertical axis (front, back, left, right):
 * - bottom slab: lower half of cell
 * - top slab: upper half of cell
 * - double slab: no clip (full block)
 *
 * In top/bottom views: slabs look like full blocks (looking straight down).
 */
function getSlabClip(
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
    // Bottom slab: lower half of cell (higher py since Y increases downward on canvas)
    return { x: px, y: py + halfSize, w: cellSize, h: halfSize };
  }
  // Top slab: upper half of cell
  return { x: px, y: py, w: cellSize, h: halfSize };
}
