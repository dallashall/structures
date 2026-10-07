import { blockRegistry } from './BlockRegistry';
import { textureResolver } from './TextureResolver';

interface Swatch {
  blockId: string;
  pixelSize: number;
  fallbackColor: string;
}

type CanvasRef = (canvas: HTMLCanvasElement | null) => void;

// Glass reads as glass only when mostly see-through
const TRANSPARENT_ALPHA = 0.15;

/**
 * SwatchPainter - Paints a block's front-face texture onto small swatch canvases
 *
 * refFor() returns a React ref callback. React calls a new callback on every render,
 * first with null for the old one, then with the element. So each swatch repaints
 * whenever its props change, without effects. Swatches painted before the atlas is
 * ready show their fallback color and repaint on atlas:ready.
 */
class SwatchPainter {
  private static instance: SwatchPainter;
  private mounted = new Map<HTMLCanvasElement, Swatch>();

  private constructor() {
    textureResolver.on('atlas:ready', this.repaintAll);
  }

  static getInstance(): SwatchPainter {
    if (!SwatchPainter.instance) {
      SwatchPainter.instance = new SwatchPainter();
    }
    return SwatchPainter.instance;
  }

  refFor(blockId: string, pixelSize: number, fallbackColor: string): CanvasRef {
    let painted: HTMLCanvasElement | null = null;

    const mountSwatch: CanvasRef = (canvas) => {
      if (painted) this.mounted.delete(painted);
      painted = canvas;
      if (!canvas) return;

      const swatch = { blockId, pixelSize, fallbackColor };
      this.mounted.set(canvas, swatch);
      this.paint(canvas, swatch);
    };

    return mountSwatch;
  }

  private repaintAll = (): void => {
    for (const [canvas, swatch] of this.mounted) {
      this.paint(canvas, swatch);
    }
  };

  private paint(canvas: HTMLCanvasElement, { blockId, pixelSize, fallbackColor }: Swatch): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = pixelSize;
    canvas.height = pixelSize;
    ctx.imageSmoothingEnabled = false;

    const fillFallback = (): void => {
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(0, 0, pixelSize, pixelSize);
    };

    // Tinted textures (glass, grass, leaves) are generated canvases, not atlas regions
    const tinted = textureResolver.getTintedTexture(blockId, 0);
    if (tinted) {
      if (blockRegistry.getBlock(blockId)?.isTransparent) ctx.globalAlpha = TRANSPARENT_ALPHA;
      ctx.drawImage(tinted, 0, 0, pixelSize, pixelSize);
      ctx.globalAlpha = 1;
      return;
    }

    const atlas = textureResolver.getAtlas();
    const coords = textureResolver.getBlockFaceCoords(blockId, 0);
    if (!atlas?.image.complete || !coords) {
      fillFallback();
      return;
    }

    ctx.drawImage(atlas.image, coords.x, coords.y, coords.width, coords.height, 0, 0, pixelSize, pixelSize);
  }
}

export const swatchPainter = SwatchPainter.getInstance();
