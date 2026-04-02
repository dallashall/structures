import type { ViewType } from "../../types";
import type { GridBlock } from "./GridBlock";
import { blockRegistry } from "../BlockRegistry";
import { textureManager } from "../TextureManager";
import { shapeCatalog } from "../shapes/ShapeCatalog";

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

    // Apply clipping for non-cube blocks (slabs show half-cell, etc.)
    const blockShape = shapeCatalog.resolve(gridBlock.blockType);
    const clip = blockShape.get2DClip(gridBlock.blockState ?? {}, viewType, px, py, cellSize);
    if (clip) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(clip[0].x, clip[0].y);
      for (let i = 1; i < clip.length; i++) ctx.lineTo(clip[i].x, clip[i].y);
      ctx.closePath();
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


