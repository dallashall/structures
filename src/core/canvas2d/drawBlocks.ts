import type { ViewType } from "../../types";
import type { GridBlock } from "./GridBlock";
import { blockRegistry } from "../BlockRegistry";
import { textureResolver } from "../TextureResolver";
import { shapeCatalog } from "../shapes/ShapeCatalog";
import { traceClipPath } from "./renderingUtils";

/**
 * The atlas face each view shows. Face indexes follow Babylon's box order in Babylon axes:
 * [front(+Z), back(-Z), right(+X), left(-X), top(+Y), bottom(-Y)].
 * Model (x, y, z) maps to Babylon (x, z, y) with no negation.
 */
const FACE_INDEX_MAP: Record<ViewType, number> = {
  front: 0,
  back: 1,
  left: 3,
  right: 2,
  top: 4,
  bottom: 5,
};

// Below this cell size a 16px texture shrinks to a few sampled texels, so cells fill with the face's
// average color instead, edge to edge, so neighboring blocks read as one surface
export const SOLID_COLOR_BELOW_PX = 12;

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

    const blockShape = shapeCatalog.resolve(gridBlock.blockType);
    const textureBlockId = blockShape.getTextureBlockId(gridBlock.blockType, gridBlock.blockState ?? {});
    const { block } = blockRegistry.getBlockWithState(textureBlockId, gridBlock.blockState);
    if (!block) continue;

    // Non-cube shapes clip the cell, so a slab fills half of it
    const clip = blockShape.get2DClip(gridBlock.blockState ?? {}, viewType, px, py, cellSize);
    if (clip) {
      ctx.save();
      traceClipPath(ctx, clip);
      ctx.clip();
    }

    const rendered = cellSize < SOLID_COLOR_BELOW_PX
      ? renderBlockColor(ctx, block, faceIndex, px, py, cellSize, gridBlock.opacity)
      : renderBlockTexture(ctx, block, faceIndex, px, py, cellSize, gridBlock.opacity);

    if (!rendered) {
      ctx.fillStyle = block.color;
      ctx.globalAlpha = gridBlock.opacity;
      if (cellSize < SOLID_COLOR_BELOW_PX) fillSnappedCell(ctx, px, py, cellSize);
      else ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      ctx.globalAlpha = 1.0;
    }

    if (clip) {
      ctx.restore();
    }
  }
}

/**
 * Returns false when the face has no texture to average, so the caller draws the catalog color
 */
function renderBlockColor(
  ctx: CanvasRenderingContext2D,
  block: { id: string; isTransparent: boolean },
  faceIndex: number,
  px: number,
  py: number,
  cellSize: number,
  opacity: number,
): boolean {
  const color = textureResolver.getFaceColor(block.id, faceIndex);
  if (!color) return false;

  ctx.fillStyle = color;
  ctx.globalAlpha = block.isTransparent ? opacity * 0.15 : opacity;
  fillSnappedCell(ctx, px, py, cellSize);
  ctx.globalAlpha = 1.0;
  return true;
}

/**
 * Fills the cell with its edges rounded to whole device pixels. Neighbors then share an edge exactly,
 * where fractional edges would each half-cover the boundary pixel and leave a seam of background between them.
 */
function fillSnappedCell(ctx: CanvasRenderingContext2D, px: number, py: number, cellSize: number): void {
  const scale = ctx.getTransform().a || 1;
  const snap = (value: number): number => Math.round(value * scale) / scale;
  const left = snap(px);
  const top = snap(py);
  ctx.fillRect(left, top, snap(px + cellSize) - left, snap(py + cellSize) - top);
}

/**
 * Returns false when neither a tinted texture nor the atlas has this face, so the caller draws a flat color
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
  const tintedTexture = textureResolver.getTintedTexture(block.id, faceIndex);
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

  const atlas = textureResolver.getAtlas();
  if (!atlas || !atlas.loaded) return false;

  const coords = textureResolver.getBlockFaceCoords(block.id, faceIndex);
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


